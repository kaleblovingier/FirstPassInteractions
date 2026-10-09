import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Baby,
  CheckCircle2,
  ChevronRight,
  Clock,
  Droplets,
  Heart,
  HeartPulse,
  Info,
  Layers,
  Pill,
  Scale,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Timer,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { HostContext } from "@/lib/drugs/types";
import {
  OBSTETRIC_CDS_DISCLAIMER,
  CANONICAL_TERATOGENS,
  CANONICAL_OBSTETRIC_CITATIONS,
  EMBRYOLOGICAL_PHASES,
  ZUSPAN_REGIMEN,
  PRITCHARD_REGIMEN,
  calculateMaternalPkAdaptations,
  calculatePregnancyProteinBindingCorrection,
  evaluateMagnesiumSulfate,
  evaluateAcuteSevereHypertension,
  evaluatePphUterotonicCascade,
  evaluateTeratogenRisk,
  getEmbryologicalPhase,
  mgDlToMeqL,
  mgDlToMmolL,
  obstetricOnDesk,
  obstetricReportOnDesk,
  type AcuteAntihypertensiveAgentId,
  type PphUterotonicStep,
  type TeratogenCompoundId,
} from "@/lib/drugs/obstetric-kinetics";

export interface ObstetricStationProps {
  ids: string[];
  host: HostContext;
}

export function ObstetricStation({ ids, host }: ObstetricStationProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<
    "magnesium-gauge" | "severe-hypertension" | "pph-cascade" | "teratogen-timeline" | "maternal-pk"
  >("magnesium-gauge");

  // Interactive Clinical States
  const [gestationalAgeWeeks, setGestationalAgeWeeks] = useState<number>(32);
  const [serumMagnesiumMgDl, setSerumMagnesiumMgDl] = useState<number>(5.8);
  const [urineOutputMlHr, setUrineOutputMlHr] = useState<number>(host.kidney === "ckd" ? 25 : 55);
  const [serumCreatinineMgDl, setSerumCreatinineMgDl] = useState<number>(host.kidney === "ckd" ? 1.4 : 0.6);
  const [systolicBp, setSystolicBp] = useState<number>(165);
  const [diastolicBp, setDiastolicBp] = useState<number>(112);
  const [maternalHeartRate, setMaternalHeartRate] = useState<number>(84);
  const [hasMaternalAsthma, setHasMaternalAsthma] = useState<boolean>(false);
  const [hasMaternalHypertension, setHasMaternalHypertension] = useState<boolean>(true);
  const [activePph, setActivePph] = useState<boolean>(false);
  const [selectedAntihypertensive, setSelectedAntihypertensive] = useState<AcuteAntihypertensiveAgentId>("labetalol");

  // Phenytoin binding calculator state
  const [measuredPhenytoinLevel, setMeasuredPhenytoinLevel] = useState<number>(8.5);
  const [measuredAlbuminGDl, setMeasuredAlbuminGDl] = useState<number>(3.1);

  // Active Desk Report
  const report = useMemo(
    () =>
      obstetricReportOnDesk(ids, host, {
        gestationalAgeWeeks,
        serumMagnesiumMgDl,
        urineOutputMlHr,
        serumCreatinineMgDl,
        systolicBp,
        diastolicBp,
        heartRateBpm: maternalHeartRate,
        hasMaternalAsthma,
        hasMaternalHypertension,
        hasActivePph: activePph,
      }),
    [
      ids.join("|"),
      host,
      gestationalAgeWeeks,
      serumMagnesiumMgDl,
      urineOutputMlHr,
      serumCreatinineMgDl,
      systolicBp,
      diastolicBp,
      maternalHeartRate,
      hasMaternalAsthma,
      hasMaternalHypertension,
      activePph,
    ],
  );

  const { onDesk, maternalPk, magnesiumSulfate, acuteHypertension, pphUterotonics, teratogenEvaluation, activeAlerts } =
    report;

  // Magnesium conversion units
  const mmolL = mgDlToMmolL(serumMagnesiumMgDl);
  const mEqL = mgDlToMeqL(serumMagnesiumMgDl);

  // Phenytoin correction
  const phenytoinCorrection = useMemo(
    () =>
      calculatePregnancyProteinBindingCorrection({
        measuredTotalLevel: measuredPhenytoinLevel,
        albuminGDl: measuredAlbuminGDl,
        drug: "phenytoin",
      }),
    [measuredPhenytoinLevel, measuredAlbuminGDl],
  );

  return (
    <div className="space-y-4 text-xs text-fg">
      {/* 1. Header & Active Clinical Banner */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400">
              <Baby className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold tracking-tight text-fg">
                Obstetric Pharmacokinetics, Maternal Resuscitation &amp; Perinatal Pharmacotherapy
              </h2>
              <p className="text-xs text-muted">
                ACOG Severe Hypertension &middot; Zuspan/Pritchard MgSO4 Toxicity Rails &middot; Stepped PPH Cascade &middot; Critical Teratogenesis Windows
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              className={cn(
                "text-[11px] font-semibold border",
                onDesk.hasObstetricDrug
                  ? "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-800"
                  : "bg-surface-sunken text-muted border-border",
              )}
            >
              Tray: {onDesk.hasObstetricDrug ? `${onDesk.allDetectedObstetricIds.length} Obstetric Agents` : "Standard Regimen"}
            </Badge>
            {onDesk.hasMagnesium && (
              <Badge tone="accent" className="text-[10px]">
                MgSO4 on Desk
              </Badge>
            )}
            {acuteHypertension.isSevereHypertension && (
              <Badge tone="danger" className="text-[10px] animate-pulse">
                Severe HTN (&ge;160/110)
              </Badge>
            )}
            {onDesk.hasUterotonics && (
              <Badge tone="info" className="text-[10px]">
                Uterotonics on Desk
              </Badge>
            )}
            {onDesk.hasTeratogens && (
              <Badge tone="warn" className="text-[10px]">
                Teratogens on Desk
              </Badge>
            )}
          </div>
        </div>

        {/* Global Parameter Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-2 border-t border-border/60">
          <div>
            <label className="text-[11px] font-medium text-muted block mb-0.5">Gestational Age (wks)</label>
            <Input
              type="number"
              min={2}
              max={42}
              step={1}
              value={gestationalAgeWeeks}
              onChange={(e) => setGestationalAgeWeeks(Math.max(2, Math.min(42, Number(e.target.value) || 32)))}
              className="h-8 text-xs font-mono font-bold"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted block mb-0.5">Serum Mg (mg/dL)</label>
            <Input
              type="number"
              min={1}
              max={22}
              step={0.1}
              value={serumMagnesiumMgDl}
              onChange={(e) => setSerumMagnesiumMgDl(Math.max(1, Math.min(22, Number(e.target.value) || 5.8)))}
              className={cn("h-8 text-xs font-mono font-bold", serumMagnesiumMgDl >= 9 ? "text-danger" : "text-fg")}
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted block mb-0.5">BP Systolic / Diastolic</label>
            <div className="flex gap-1">
              <Input
                type="number"
                min={70}
                max={250}
                value={systolicBp}
                onChange={(e) => setSystolicBp(Number(e.target.value) || 120)}
                className={cn("h-8 text-xs font-mono font-bold", systolicBp >= 160 ? "text-danger" : "text-fg")}
              />
              <Input
                type="number"
                min={40}
                max={160}
                value={diastolicBp}
                onChange={(e) => setDiastolicBp(Number(e.target.value) || 80)}
                className={cn("h-8 text-xs font-mono font-bold", diastolicBp >= 110 ? "text-danger" : "text-fg")}
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted block mb-0.5">Urine Output (mL/h)</label>
            <Input
              type="number"
              min={0}
              max={250}
              value={urineOutputMlHr}
              onChange={(e) => setUrineOutputMlHr(Number(e.target.value) || 0)}
              className={cn("h-8 text-xs font-mono", urineOutputMlHr < 30 ? "text-danger font-bold" : "text-fg")}
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted block mb-0.5">Serum Cr (mg/dL)</label>
            <Input
              type="number"
              min={0.2}
              max={8.0}
              step={0.1}
              value={serumCreatinineMgDl}
              onChange={(e) => setSerumCreatinineMgDl(Number(e.target.value) || 0.6)}
              className={cn("h-8 text-xs font-mono", serumCreatinineMgDl >= 1.2 ? "text-danger font-bold" : "text-fg")}
            />
          </div>
          <div className="flex items-end gap-1.5 pb-0.5">
            <button
              type="button"
              onClick={() => setHasMaternalAsthma(!hasMaternalAsthma)}
              className={cn(
                "px-2.5 py-1.5 rounded text-[11px] font-medium border transition-colors flex-1 text-center",
                hasMaternalAsthma
                  ? "bg-danger text-accent-fg border-danger"
                  : "bg-surface-sunken text-muted border-border hover:text-fg",
              )}
            >
              {hasMaternalAsthma ? "Asthma: YES" : "Asthma: No"}
            </button>
            <button
              type="button"
              onClick={() => setActivePph(!activePph)}
              className={cn(
                "px-2.5 py-1.5 rounded text-[11px] font-medium border transition-colors flex-1 text-center",
                activePph
                  ? "bg-danger text-accent-fg border-danger animate-pulse"
                  : "bg-surface-sunken text-muted border-border hover:text-fg",
              )}
            >
              {activePph ? "PPH: ACTIVE" : "PPH: Off"}
            </button>
          </div>
        </div>

        {/* Active Emergency Alerts Banner */}
        {activeAlerts.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-border/60">
            {activeAlerts.map((alert, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2 rounded-md bg-danger/10 border border-danger/30 text-danger text-[11px] leading-snug font-medium"
              >
                <AlertOctagon className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{alert}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-surface-sunken rounded-lg border border-border">
        {[
          { id: "magnesium-gauge", label: "MgSO4 Toxicity & Infusion Gauge", icon: Activity },
          { id: "severe-hypertension", label: "ACOG Severe HTN Triage", icon: HeartPulse },
          { id: "pph-cascade", label: "PPH Uterotonic Cascade", icon: Droplets },
          { id: "teratogen-timeline", label: "Teratogen Critical Windows", icon: Baby },
          { id: "maternal-pk", label: "Maternal Gestational PK", icon: Scale },
        ].map((tab) => {
          const Icon = tab.icon;
          const isCurrent = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                isCurrent
                  ? "bg-surface text-fg shadow-xs font-semibold"
                  : "text-muted hover:text-fg hover:bg-surface/50",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================================================================== */}
      {/* 3. TAB 1: MAGNESIUM SULFATE INFUSION & TOXICITY GAUGE                */}
      {/* ==================================================================== */}
      {activeTab === "magnesium-gauge" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-base font-bold text-fg flex items-center gap-2">
                  <Activity className="h-4 w-4 text-accent" />
                  Magnesium Sulfate Concentration-Dependent Toxicity Gauge
                </h3>
                <p className="text-xs text-muted">
                  Zuspan/Pritchard target window (4.8–8.4 mg/dL), patellar reflex loss, respiratory depression, and cardiac arrest rails.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  tone={
                    magnesiumSulfate.tier === "therapeutic"
                      ? "ok"
                      : magnesiumSulfate.tier === "subtherapeutic"
                        ? "info"
                        : magnesiumSulfate.tier === "loss_of_reflexes"
                          ? "warn"
                          : "danger"
                  }
                  className="font-mono text-xs uppercase px-2.5 py-1"
                >
                  {magnesiumSulfate.tier.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>

            {/* Slider & Multi-Unit Display */}
            <div className="space-y-2 p-3 rounded-lg bg-surface-sunken border border-border">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-muted">Interactive Serum Magnesium Level:</span>
                <div className="flex gap-3 font-mono font-bold text-sm">
                  <span className="text-fg">{serumMagnesiumMgDl.toFixed(1)} mg/dL</span>
                  <span className="text-muted">|</span>
                  <span className="text-accent">{mmolL.toFixed(2)} mmol/L</span>
                  <span className="text-muted">|</span>
                  <span className="text-info">{mEqL.toFixed(1)} mEq/L</span>
                </div>
              </div>

              <input
                type="range"
                min="1.0"
                max="20.0"
                step="0.1"
                value={serumMagnesiumMgDl}
                onChange={(e) => setSerumMagnesiumMgDl(Number(e.target.value))}
                className="w-full accent-accent cursor-pointer h-2 bg-surface rounded-lg appearance-none"
              />

              <div className="flex justify-between text-[10px] text-muted font-mono pt-1">
                <span>1.0 Baseline</span>
                <span className="text-ok font-semibold">4.8 - 8.4 Therapeutic</span>
                <span className="text-warn font-semibold">9.0 Reflex Loss</span>
                <span className="text-danger font-semibold">12.0 Respiratory</span>
                <span className="text-danger font-bold">&gt;15.0 Arrest</span>
              </div>
            </div>

            {/* Visual Milestones Card Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  serumMagnesiumMgDl < 4.8
                    ? "bg-info/10 border-info/50 ring-1 ring-info/30"
                    : "bg-surface-sunken border-border opacity-70",
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs">Subtherapeutic</span>
                  <span className="font-mono text-[10px] text-muted">&lt; 4.8 mg/dL</span>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  Reflexes brisk. Seizure prophylaxis incomplete. Inadequate protection against eclamptic recurrence.
                </p>
              </div>

              <div
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  serumMagnesiumMgDl >= 4.8 && serumMagnesiumMgDl <= 8.4
                    ? "bg-ok/10 border-ok/50 ring-1 ring-ok/30"
                    : "bg-surface-sunken border-border opacity-70",
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-ok">Therapeutic Window</span>
                  <span className="font-mono text-[10px] text-ok">4.8 - 8.4 mg/dL</span>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  2.0–3.5 mmol/L (4.0–7.0 mEq/L). Central anticonvulsant threshold achieved. Intact patellar DTRs, normal respiration.
                </p>
              </div>

              <div
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  serumMagnesiumMgDl >= 9.0 && serumMagnesiumMgDl < 12.0
                    ? "bg-warn/10 border-warn/50 ring-1 ring-warn/30"
                    : "bg-surface-sunken border-border opacity-70",
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-warn">Loss of Patellar Reflexes</span>
                  <span className="font-mono text-[10px] text-warn">9.0 - 12.0 mg/dL</span>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  Earliest warning milestone. Presynaptic calcium channel blockade prevents acetylcholine release at motor endplate. HOLD infusion.
                </p>
              </div>

              <div
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  serumMagnesiumMgDl >= 12.0
                    ? "bg-danger/10 border-danger/50 ring-1 ring-danger/30"
                    : "bg-surface-sunken border-border opacity-70",
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-danger">Depression &amp; Arrest</span>
                  <span className="font-mono text-[10px] text-danger">&ge; 12.0 - 15.0+ mg/dL</span>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  RR &lt; 12/min, somnolence, diaphragmatic paralysis. At &gt;15 mg/dL: AV block and cardiac arrest. Emergency antidote mandatory.
                </p>
              </div>
            </div>

            {/* Renal Accumulation Trap Callout */}
            {magnesiumSulfate.renalAccumulationWarning && (
              <div className="p-4 rounded-lg bg-danger/10 border border-danger/40 space-y-2">
                <div className="flex items-center gap-2 text-danger font-bold text-xs">
                  <AlertOctagon className="h-4 w-4" />
                  <span>RENAL FAILURE MAGNESIUM ACCUMULATION TRAP ACTIVE</span>
                </div>
                <p className="text-xs text-fg leading-relaxed">
                  Serum Creatinine: <span className="font-mono font-bold">{serumCreatinineMgDl} mg/dL</span> | Urine Output:{" "}
                  <span className="font-mono font-bold">{urineOutputMlHr} mL/h</span>. Over 90% of magnesium is cleared via glomerular filtration. In preeclamptic renal injury or oliguria (&lt;30 mL/h), magnesium accumulates rapidly to lethal levels.
                </p>
                <div className="text-[11px] font-semibold text-danger">
                  Action: Reduce maintenance infusion to 1.0 g/h or hold. Insert Foley catheter with urometer. Order stat serum magnesium q2–4h.
                </div>
              </div>
            )}

            {/* Emergency Antidote Card */}
            {magnesiumSulfate.antidoteProtocol && (
              <div className="p-4 rounded-lg bg-surface-sunken border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-danger" />
                    <span className="font-bold text-xs text-fg">Emergency Antidote Protocol: Calcium Gluconate 10%</span>
                  </div>
                  <Badge tone="danger" className="text-[10px] font-mono">
                    STAT IV RESCUE
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded bg-surface border border-border">
                    <span className="text-muted block text-[10px]">Dose &amp; Concentration:</span>
                    <span className="font-mono font-bold">{magnesiumSulfate.antidoteProtocol.dose}</span>
                  </div>
                  <div className="p-2 rounded bg-surface border border-border">
                    <span className="text-muted block text-[10px]">Administration Rate:</span>
                    <span className="font-mono font-bold">{magnesiumSulfate.antidoteProtocol.rate}</span>
                  </div>
                  <div className="p-2 rounded bg-surface border border-border">
                    <span className="text-muted block text-[10px]">Mechanism:</span>
                    <span className="text-[11px]">{magnesiumSulfate.antidoteProtocol.mechanism.slice(0, 90)}...</span>
                  </div>
                </div>
                <p className="text-[11px] text-muted italic">
                  {magnesiumSulfate.antidoteProtocol.repeatInstructions}
                </p>
              </div>
            )}

            {/* Standard Regimens Reference */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-lg border border-border bg-surface-sunken space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">{ZUSPAN_REGIMEN.regimenName}</span>
                  <Badge tone="default" className="text-[10px]">Intravenous Standard</Badge>
                </div>
                <p className="text-[11px] text-muted">{ZUSPAN_REGIMEN.loadingDoseDescription}</p>
                <p className="text-[11px] text-fg font-medium">{ZUSPAN_REGIMEN.maintenanceDoseDescription}</p>
                <p className="text-[10px] text-muted">{ZUSPAN_REGIMEN.duration}</p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-surface-sunken space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">{PRITCHARD_REGIMEN.regimenName}</span>
                  <Badge tone="default" className="text-[10px]">Intramuscular Protocol</Badge>
                </div>
                <p className="text-[11px] text-muted">{PRITCHARD_REGIMEN.loadingDoseDescription}</p>
                <p className="text-[11px] text-fg font-medium">{PRITCHARD_REGIMEN.maintenanceDoseDescription}</p>
                <p className="text-[10px] text-muted">{PRITCHARD_REGIMEN.duration}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. TAB 2: ACOG ACUTE SEVERE HYPERTENSION TRIAGE                     */}
      {/* ==================================================================== */}
      {activeTab === "severe-hypertension" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-base font-bold text-fg flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-danger" />
                  ACOG Acute Severe Maternal Hypertension Triage (&ge; 160/110 mmHg)
                </h3>
                <p className="text-xs text-muted">
                  First-line stepped pharmacotherapy algorithms, onset windows, contraindication safeguards, and reflex tachycardia hazards.
                </p>
              </div>

              <Badge
                tone={acuteHypertension.isSevereHypertension ? "danger" : "ok"}
                className="font-mono text-xs uppercase px-2.5 py-1"
              >
                {acuteHypertension.isSevereHypertension ? "Severe Emergency" : "Non-Severe Range"}
              </Badge>
            </div>

            {/* Target Blood Pressure & Urgency Statement */}
            <div className="p-3 rounded-lg bg-surface-sunken border border-border flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-xs text-fg">Current Hemodynamics:</span>
                <span className="font-mono font-bold text-sm ml-2 text-danger">
                  {systolicBp}/{diastolicBp} mmHg (MAP {acuteHypertension.mapMmHg} mmHg, HR {maternalHeartRate} bpm)
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-muted block">Target Goal Blood Pressure:</span>
                <span className="font-mono font-bold text-xs text-ok">{acuteHypertension.targetBloodPressure}</span>
              </div>
            </div>

            {/* First-Line Agent Selector Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(["labetalol", "hydralazine", "nifedipine_ir"] as AcuteAntihypertensiveAgentId[]).map((agentKey) => {
                const agent = acuteHypertension.firstLineAgents[agentKey];
                const isSelected = selectedAntihypertensive === agentKey;

                return (
                  <div
                    key={agentKey}
                    onClick={() => setSelectedAntihypertensive(agentKey)}
                    className={cn(
                      "p-3.5 rounded-lg border cursor-pointer transition-all space-y-2.5",
                      isSelected
                        ? "bg-surface ring-2 ring-accent border-accent"
                        : "bg-surface-sunken border-border hover:border-border/80",
                      !agent.isSuitableForCase && "border-danger/40 bg-danger/5",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-fg">{agent.name}</span>
                      <Badge
                        tone={agent.isSuitableForCase ? "ok" : "danger"}
                        className="text-[10px] uppercase font-mono"
                      >
                        {agent.isSuitableForCase ? "Suitable" : "Avoid / Contraindicated"}
                      </Badge>
                    </div>

                    <div className="text-[11px] text-muted leading-tight">{agent.class}</div>

                    <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono bg-surface p-1.5 rounded border border-border/60">
                      <div>
                        <span className="text-muted block">Onset:</span>
                        <span className="font-bold text-fg">{agent.onsetMinutes}</span>
                      </div>
                      <div>
                        <span className="text-muted block">Peak:</span>
                        <span className="font-bold text-accent">{agent.peakMinutes}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-fg leading-relaxed">{agent.suitabilityRationale}</p>
                  </div>
                );
              })}
            </div>

            {/* Detailed Selected Agent Protocol & Safety Alerts */}
            {selectedAntihypertensive && (
              <div className="p-4 rounded-lg bg-surface-sunken border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-accent" />
                    <span className="font-bold text-xs text-fg">
                      Detailed ACOG Stepped Protocol: {acuteHypertension.firstLineAgents[selectedAntihypertensive].name}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted font-mono">
                    Duration: {acuteHypertension.firstLineAgents[selectedAntihypertensive].durationHours}
                  </span>
                </div>

                {/* Step Dosing List */}
                <div className="space-y-1 bg-surface p-3 rounded border border-border">
                  <span className="text-[11px] font-semibold text-fg block mb-1">Stepped Dosing Sequence:</span>
                  {acuteHypertension.firstLineAgents[selectedAntihypertensive].standardDosingRegimen.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[11px] text-muted">
                      <ChevronRight className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>

                {/* Warnings / Special Rails */}
                <div className="space-y-1.5">
                  {acuteHypertension.firstLineAgents[selectedAntihypertensive].boxedWarningsOrCautions.map((warn, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-warn/10 border border-warn/30 text-warn text-[11px] leading-snug flex items-start gap-2"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{warn}</span>
                    </div>
                  ))}

                  {acuteHypertension.firstLineAgents[selectedAntihypertensive].contraindications.map((contra, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-danger/10 border border-danger/30 text-danger text-[11px] leading-snug flex items-start gap-2"
                    >
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>Contraindication: {contra}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. TAB 3: POSTPARTUM HEMORRHAGE (PPH) STEPPED UTEROTONIC CASCADE    */}
      {/* ==================================================================== */}
      {activeTab === "pph-cascade" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-base font-bold text-fg flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-danger" />
                  Postpartum Hemorrhage (PPH) Stepped Uterotonic Cascade &amp; Contraindication Matrix
                </h3>
                <p className="text-xs text-muted">
                  Sequential myometrial uterotonic escalation with strict hypertension Methergine and asthma Hemabate safety rails.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHasMaternalHypertension(!hasMaternalHypertension)}
                  className={cn(
                    "px-2.5 py-1 rounded text-[11px] font-medium border transition-colors",
                    hasMaternalHypertension
                      ? "bg-danger text-accent-fg border-danger font-bold"
                      : "bg-surface-sunken text-muted border-border",
                  )}
                >
                  {hasMaternalHypertension ? "Hypertension Present (Methergine Alert)" : "Normotensive"}
                </button>
                <button
                  type="button"
                  onClick={() => setHasMaternalAsthma(!hasMaternalAsthma)}
                  className={cn(
                    "px-2.5 py-1 rounded text-[11px] font-medium border transition-colors",
                    hasMaternalAsthma
                      ? "bg-danger text-accent-fg border-danger font-bold"
                      : "bg-surface-sunken text-muted border-border",
                  )}
                >
                  {hasMaternalAsthma ? "Asthma Present (Carboprost Alert)" : "No Asthma"}
                </button>
              </div>
            </div>

            {/* Stepped Sequence Cards */}
            <div className="space-y-3">
              {pphUterotonics.steppedSequence.map((stepAgent) => {
                const isContra = stepAgent.isContraindicated;

                return (
                  <div
                    key={stepAgent.step}
                    className={cn(
                      "p-4 rounded-lg border transition-all space-y-2.5",
                      isContra
                        ? "bg-danger/10 border-danger/60 ring-1 ring-danger/30"
                        : "bg-surface-sunken border-border",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-accent font-bold text-xs font-mono">
                          {stepAgent.stepNumber}
                        </span>
                        <span className="font-bold text-sm text-fg">
                          {stepAgent.agentName} ({stepAgent.brandNames.join(", ")})
                        </span>
                        <span className="text-xs text-muted font-mono">[{stepAgent.route}]</span>
                      </div>

                      {isContra ? (
                        <Badge tone="danger" className="text-[11px] font-bold font-mono px-2.5 py-0.5 animate-pulse">
                          ABSOLUTE CONTRAINDICATION
                        </Badge>
                      ) : (
                        <Badge tone="ok" className="text-[10px] font-mono">
                          READY / INDICATED
                        </Badge>
                      )}
                    </div>

                    <div className="text-[11px] text-muted">
                      <span className="font-semibold text-fg">Standard Dosing:</span> {stepAgent.standardDosing} &middot;{" "}
                      <span className="font-semibold text-fg">Onset:</span> {stepAgent.onset}
                    </div>

                    {/* Contraindication Callout */}
                    {isContra && stepAgent.contraindicationReason && (
                      <div className="p-2.5 rounded bg-danger/20 border border-danger/50 text-danger text-xs font-medium flex items-start gap-2">
                        <AlertOctagon className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{stepAgent.contraindicationReason}</span>
                      </div>
                    )}

                    {/* Key Safety Alerts */}
                    <div className="space-y-1">
                      {stepAgent.keySafetyAlerts.map((alert, idx) => (
                        <div key={idx} className="text-[11px] text-muted flex items-start gap-1.5 leading-snug">
                          <AlertTriangle className="h-3 w-3 text-warn shrink-0 mt-0.5" />
                          <span>{alert}</span>
                        </div>
                      ))}
                    </div>

                    {/* Common Adverse Effects */}
                    <div className="text-[10px] text-muted pt-1 border-t border-border/50">
                      <span className="font-medium text-fg">Adverse Reactions:</span> {stepAgent.adverseReactions.join("; ")}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* WOMAN Trial & Clinical Pearls */}
            <div className="p-3 rounded-lg bg-surface border border-border space-y-1.5">
              <span className="font-semibold text-xs text-fg flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                ACOG &amp; WOMAN Trial Resuscitation Pearls:
              </span>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-muted">
                {pphUterotonics.clinicalPearls.map((pearl, idx) => (
                  <li key={idx}>{pearl}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. TAB 4: TERATOGEN CRITICAL WINDOWS & TIMELINE                     */}
      {/* ==================================================================== */}
      {activeTab === "teratogen-timeline" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-base font-bold text-fg flex items-center gap-2">
                  <Baby className="h-4 w-4 text-accent" />
                  Embryological Vulnerability Windows &amp; Canonical Teratogens
                </h3>
                <p className="text-xs text-muted">
                  Pre-implantation (all-or-none), organogenesis (weeks 3–8 post-conception), and fetal fetopathy windows.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Current Gestational Age:</span>
                <span className="font-mono font-bold text-sm text-accent">Week {gestationalAgeWeeks} GA</span>
              </div>
            </div>

            {/* Embryological Timeline Bar */}
            <div className="p-4 rounded-lg bg-surface-sunken border border-border space-y-3">
              <span className="font-semibold text-xs text-fg block">Embryological Development Phase:</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {Object.values(EMBRYOLOGICAL_PHASES).map((phase) => {
                  const isCurrent = teratogenEvaluation.currentPhase.id === phase.id;

                  return (
                    <div
                      key={phase.id}
                      className={cn(
                        "p-3 rounded-lg border transition-all space-y-1.5",
                        isCurrent
                          ? "bg-accent/10 border-accent ring-1 ring-accent/30 font-medium"
                          : "bg-surface border-border opacity-70",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-fg">{phase.name}</span>
                        <span className="font-mono text-[10px] text-muted">
                          Weeks {phase.gestationalWeeksFromLmp.min}–{phase.gestationalWeeksFromLmp.max} GA
                        </span>
                      </div>
                      <Badge tone={isCurrent ? "accent" : "default"} className="text-[10px]">
                        {phase.primaryRiskType}
                      </Badge>
                      <p className="text-[11px] text-muted leading-snug">{phase.teratogenSusceptibilityNature.slice(0, 110)}...</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Canonical Teratogen Registry Display */}
            <div className="space-y-3">
              <span className="font-semibold text-xs text-fg block">High-Yield Teratogen Compound Registry:</span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.values(CANONICAL_TERATOGENS).map((teratogen) => {
                  const inWindow =
                    gestationalAgeWeeks >= teratogen.peakVulnerabilityGestationalAgeWeeks.min &&
                    gestationalAgeWeeks <= teratogen.peakVulnerabilityGestationalAgeWeeks.max;

                  return (
                    <div
                      key={teratogen.id}
                      className={cn(
                        "p-3.5 rounded-lg border space-y-2",
                        inWindow
                          ? "bg-danger/10 border-danger/60 ring-1 ring-danger/30"
                          : "bg-surface-sunken border-border",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-fg">{teratogen.name}</span>
                        <Badge tone={inWindow ? "danger" : "default"} className="text-[10px] font-mono">
                          {inWindow ? "ACTIVE VULNERABILITY WINDOW" : `Weeks ${teratogen.peakVulnerabilityGestationalAgeWeeks.min}–${teratogen.peakVulnerabilityGestationalAgeWeeks.max} GA`}
                        </Badge>
                      </div>

                      <div className="text-[11px] text-muted">
                        <span className="font-semibold text-fg">Representative Drugs:</span> {teratogen.representativeDrugs.join(", ")}
                      </div>

                      <div className="text-[11px] text-muted leading-relaxed">
                        <span className="font-semibold text-fg">Mechanism:</span> {teratogen.molecularBiochemicalMechanism}
                      </div>

                      <div className="space-y-1 bg-surface p-2 rounded border border-border/60">
                        <span className="text-[10px] font-bold text-fg block">Characteristic Phenotype:</span>
                        <ul className="list-disc pl-3 text-[10px] text-muted space-y-0.5">
                          {teratogen.characteristicPhenotypeSignature.slice(0, 3).map((feat, idx) => (
                            <li key={idx}>{feat}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="text-[10px] text-accent font-medium italic">
                        Rail: {teratogen.clinicalManagementRail}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 7. TAB 5: MATERNAL GESTATIONAL PHARMACOKINETICS                      */}
      {/* ==================================================================== */}
      {activeTab === "maternal-pk" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-base font-bold text-fg flex items-center gap-2">
                  <Scale className="h-4 w-4 text-accent" />
                  Maternal Gestational Pharmacokinetic Adaptations
                </h3>
                <p className="text-xs text-muted">
                  Plasma volume expansion (+40–50%), renal hyperfiltration (GFR surge), hypoalbuminemia, and CYP/UGT shifts.
                </p>
              </div>

              <Badge tone="accent" className="font-mono text-xs">
                {maternalPk.trimester.toUpperCase()} TRIMESTER (Wk {maternalPk.gestationalAgeWeeks})
              </Badge>
            </div>

            {/* Physiological Parameter Shifts Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-surface-sunken border border-border space-y-1">
                <span className="text-muted text-[10px] block">Plasma Volume:</span>
                <span className="font-mono font-bold text-sm text-accent">+{maternalPk.plasmaVolumeExpansionPct}%</span>
                <span className="text-[10px] text-muted block">(+{maternalPk.plasmaVolumeDeltaMl} mL)</span>
              </div>
              <div className="p-3 rounded-lg bg-surface-sunken border border-border space-y-1">
                <span className="text-muted text-[10px] block">GFR Surge:</span>
                <span className="font-mono font-bold text-sm text-ok">+{maternalPk.gfrIncreasePct}%</span>
                <span className="text-[10px] text-muted block">Accelerated clearance</span>
              </div>
              <div className="p-3 rounded-lg bg-surface-sunken border border-border space-y-1">
                <span className="text-muted text-[10px] block">Serum Albumin:</span>
                <span className="font-mono font-bold text-sm text-fg">{maternalPk.expectedAlbuminGDl} g/dL</span>
                <span className="text-[10px] text-muted block">(-{maternalPk.dilutionalAlbuminDropGDl} g/dL drop)</span>
              </div>
              <div className="p-3 rounded-lg bg-surface-sunken border border-border space-y-1">
                <span className="text-muted text-[10px] block">Hydrophilic Cmax Drop:</span>
                <span className="font-mono font-bold text-sm text-warn">-{maternalPk.hydrophilicCmaxReductionPct}%</span>
                <span className="text-[10px] text-muted block">Vd mult: {maternalPk.hydrophilicVdMultiplier}x</span>
              </div>
            </div>

            {/* Hepatic CYP and UGT Shifts */}
            <div className="p-4 rounded-lg bg-surface-sunken border border-border space-y-2">
              <span className="font-semibold text-xs text-fg block">Gestational Hepatic Enzyme Activity Alterations:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                <div className="p-2.5 rounded bg-surface border border-border space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs">CYP3A4</span>
                    <Badge tone="ok" className="text-[10px] font-mono">+60% Induced</Badge>
                  </div>
                  <p className="text-[10px] text-muted">Accelerates nifedipine, midazolam, buprenorphine, methadone clearance.</p>
                </div>
                <div className="p-2.5 rounded bg-surface border border-border space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs">CYP2D6</span>
                    <Badge tone="ok" className="text-[10px] font-mono">+40% Induced</Badge>
                  </div>
                  <p className="text-[10px] text-muted">Accelerates labetalol, metoprolol, fluoxetine clearance.</p>
                </div>
                <div className="p-2.5 rounded bg-surface border border-border space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs">UGT1A4 / UGT2B7</span>
                    <Badge tone="ok" className="text-[10px] font-mono">+250% Induced</Badge>
                  </div>
                  <p className="text-[10px] text-muted">Massively accelerates lamotrigine clearance; frequent seizure recurrence.</p>
                </div>
                <div className="p-2.5 rounded bg-surface border border-border space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs">CYP2C9</span>
                    <Badge tone="ok" className="text-[10px] font-mono">+25% Induced</Badge>
                  </div>
                  <p className="text-[10px] text-muted">Increases clearance of phenytoin, celecoxib, warfarin.</p>
                </div>
                <div className="p-2.5 rounded bg-surface border border-border space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs">CYP1A2</span>
                    <Badge tone="danger" className="text-[10px] font-mono">-35% Repressed</Badge>
                  </div>
                  <p className="text-[10px] text-muted">Prolongs half-life of caffeine, theophylline, olanzapine, clozapine.</p>
                </div>
              </div>
            </div>

            {/* Protein Binding Correction Calculator */}
            <div className="p-4 rounded-lg bg-surface border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-fg flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-accent" />
                  Pregnancy Hypoalbuminemia Phenytoin Level Normalizer
                </span>
                <span className="text-[10px] text-muted font-mono">Winter-Tozer Pregnancy Formula</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted block mb-1">Measured Total Phenytoin (mcg/mL):</label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    step={0.5}
                    value={measuredPhenytoinLevel}
                    onChange={(e) => setMeasuredPhenytoinLevel(Number(e.target.value) || 8)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted block mb-1">Measured Serum Albumin (g/dL):</label>
                  <Input
                    type="number"
                    min={1.5}
                    max={5.0}
                    step={0.1}
                    value={measuredAlbuminGDl}
                    onChange={(e) => setMeasuredAlbuminGDl(Number(e.target.value) || 3.1)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded bg-surface-sunken border border-border flex items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] text-muted block">Normalized Effective Total Level:</span>
                  <span className="font-mono font-bold text-base text-accent">
                    {phenytoinCorrection.correctedTotalLevel} mcg/mL
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted block">Estimated Free Fraction:</span>
                  <span className="font-mono font-bold text-xs text-warn">
                    {Math.round(phenytoinCorrection.estimatedPregnancyFreeFraction * 100)}% (Baseline: {Math.round(phenytoinCorrection.estimatedFreeFractionBaseline * 100)}%)
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-muted leading-relaxed">
                {phenytoinCorrection.interpretation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 8. Statutory Regulatory Footer & Citations */}
      <div className="rounded-xl border border-border bg-surface-sunken p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-accent" />
          <span className="font-serif font-bold text-xs text-fg">
            Statutory Non-Device Clinical Decision Support Reference &middot; FD&amp;C Act &sect; 520(o)(1)(E)
          </span>
        </div>
        <p className="text-[11px] text-muted leading-relaxed">{OBSTETRIC_CDS_DISCLAIMER}</p>
        <div className="pt-1 text-[10px] text-muted flex flex-wrap gap-x-3 gap-y-1">
          <span>ACOG Bulletins 222 &amp; 183</span>
          <span>&bull;</span>
          <span>ACOG Committee Opinion 767</span>
          <span>&bull;</span>
          <span>The Magpie Trial (Lancet 2002)</span>
          <span>&bull;</span>
          <span>Parkland Eclampsia Protocol (Pritchard 1984)</span>
          <span>&bull;</span>
          <span>Costantine Front Pharmacol 2014</span>
        </div>
      </div>
    </div>
  );
}

export const ObstetricPanel = ObstetricStation;
