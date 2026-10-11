import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Clock,
  Droplets,
  Flame,
  Heart,
  HeartPulse,
  HelpCircle,
  Info,
  Pill,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HostContext } from "@/lib/drugs/types";
import {
  ANTIARRHYTHMIC_CDS_DISCLAIMER,
  ANTIARRHYTHMIC_CITATIONS,
  ANTIARRHYTHMIC_PROFILES,
  POTENT_PGP_INHIBITOR_MAP,
  antiarrhythmicOnDesk,
  antiarrhythmicReportOnDesk,
  calculateDigiFabVials,
  evaluateDigoxinTdm,
  evaluateElectrolyteAmplifiers,
  type DigiFabDosingScenario,
  type DigoxinIndication,
  type DigoxinLevelBand,
  type VaughanWilliamsClass,
} from "@/lib/drugs/antiarrhythmic-kinetics";

type AntiarrhythmicTab = "digoxin-tdm" | "digifab-calc" | "vaughan-williams" | "cast-rems" | "tray-alerts";

export function AntiarrhythmicStation({ ids, host }: { ids: string[]; host: HostContext }) {
  return <AntiarrhythmicPanel ids={ids} host={host} />;
}

export function AntiarrhythmicPanel({ ids, host }: { ids: string[]; host: HostContext }) {
  const [activeTab, setActiveTab] = useState<AntiarrhythmicTab>("digoxin-tdm");

  // 1. Digoxin TDM Calculator State
  const [sdcInput, setSdcInput] = useState<string>("1.4");
  const [indication, setIndication] = useState<DigoxinIndication>("hfref");
  const [hoursPostDoseInput, setHoursPostDoseInput] = useState<string>("12");
  const [weightKgInput, setWeightKgInput] = useState<string>("70");
  const [potassiumInput, setPotassiumInput] = useState<string>("3.8");
  const [magnesiumInput, setMagnesiumInput] = useState<string>("2.0");
  const [calciumInput, setCalciumInput] = useState<string>("9.6");

  // 2. DigiFab Calculator State
  const [fabScenario, setFabScenario] = useState<DigiFabDosingScenario>("steady-state-serum-concentration");
  const [ingestedMgInput, setIngestedMgInput] = useState<string>("10");
  const [isCardiacArrest, setIsCardiacArrest] = useState<boolean>(false);

  // 3. Dofetilide REMS Simulator State
  const [dofetilideCrClInput, setDofetilideCrClInput] = useState<string>(host.kidney === "ckd" ? "35" : "75");
  const [dofetilideQtcInput, setDofetilideQtcInput] = useState<string>("415");
  const [hasStructuralHeartDisease, setHasStructuralHeartDisease] = useState<boolean>(false);

  // Numerical conversions with safe clamping
  const numSdc = Math.max(0, Math.min(20, Number(sdcInput) || 0));
  const numHours = Math.max(0.5, Math.min(72, Number(hoursPostDoseInput) || 12));
  const numWeight = Math.max(20, Math.min(250, Number(weightKgInput) || 70));
  const numPotassium = Math.max(1.5, Math.min(8.0, Number(potassiumInput) || 4.0));
  const numMagnesium = Math.max(0.5, Math.min(5.0, Number(magnesiumInput) || 2.0));
  const numCalcium = Math.max(5.0, Math.min(16.0, Number(calciumInput) || 9.5));
  const numIngestedMg = Math.max(0.1, Math.min(100, Number(ingestedMgInput) || 10));
  const numCrCl = Math.max(5, Math.min(180, Number(dofetilideCrClInput) || 75));
  const numQtc = Math.max(300, Math.min(700, Number(dofetilideQtcInput) || 420));

  // Compute comprehensive report
  const report = useMemo(
    () =>
      antiarrhythmicReportOnDesk(ids, host, {
        digoxinTdm: {
          serumDigoxinNgMl: numSdc,
          indication,
          hoursPostDose: numHours,
          potassiumMeqL: numPotassium,
          magnesiumMgDl: numMagnesium,
          calciumMgDl: numCalcium,
          patientWeightKg: numWeight,
        },
        digiFabCalc: {
          scenario: fabScenario,
          mgDigoxinIngested: numIngestedMg,
          serumDigoxinNgMl: numSdc,
          patientWeightKg: numWeight,
          isCardiacArrestOrSevereShock: isCardiacArrest,
        },
        hasStructuralOrIschemicHeartDisease: hasStructuralHeartDisease,
        baselineQtcMs: numQtc,
        measuredCrClMlMin: numCrCl,
      }),
    [
      ids.join("|"),
      host,
      numSdc,
      indication,
      numHours,
      numWeight,
      numPotassium,
      numMagnesium,
      numCalcium,
      fabScenario,
      numIngestedMg,
      isCardiacArrest,
      hasStructuralHeartDisease,
      numCrCl,
      numQtc,
    ],
  );

  const tdmEval = report.digoxinEvaluation!;
  const fabResult = report.digiFabCalculation!;

  const getTdmBadgeTone = (band: DigoxinLevelBand) => {
    switch (band) {
      case "target":
        return "ok";
      case "subtherapeutic":
        return "default";
      case "elevated":
        return "warn";
      case "toxic":
        return "danger";
      case "severe-toxicity":
        return "danger";
      case "distribution-phase-artifact":
        return "accent";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-6 text-xs text-fg">
      {/* Header Banner */}
      <div className="rounded-lg bg-surface-sunken p-4 border border-border space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-accent" />
            <span className="font-serif font-bold text-sm tracking-tight text-fg">
              Antiarrhythmic Kinetics, Vaughan-Williams Classification &amp; Digoxin TDM / DigiFab Engine
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {report.onDesk.hasDigoxin && (
              <Badge tone="accent" className="font-mono text-[10px] uppercase">
                Digoxin Active
              </Badge>
            )}
            {report.onDesk.detectedCastContraindicatedIds.length > 0 && (
              <Badge tone="danger" className="font-mono text-[10px] uppercase">
                CAST Class Ic Alert
              </Badge>
            )}
            {report.onDesk.detectedDofetilideRemsIds.length > 0 && (
              <Badge tone="warn" className="font-mono text-[10px] uppercase">
                Dofetilide REMS
              </Badge>
            )}
            <Badge tone="default" className="font-mono text-[10px]">
              {report.activeDrugProfiles.length} Antiarrhythmics Detected
            </Badge>
          </div>
        </div>
        <p className="text-muted leading-relaxed">
          Biophysical cardiac electrophysiology reference: Digoxin multi-compartment distribution kinetics (Vd ~7 L/kg),
          electrolyte proarrhythmia sensitivity amplifiers (K+, Mg2+, Ca2+), DigiFab stoichiometry, post-reversal immunoassay
          cross-reactivity trap, Vaughan-Williams channelopathy comparative matrix, and CAST landmark contraindications.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("digoxin-tdm")}
          className={cn(
            "px-3 py-1.5 rounded-md font-medium text-xs transition-colors flex items-center gap-1.5",
            activeTab === "digoxin-tdm" ? "bg-accent text-accent-fg font-semibold" : "bg-surface text-muted hover:text-fg",
          )}
        >
          <Activity className="h-3.5 w-3.5" />
          Digoxin TDM &amp; Kinetics
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("digifab-calc")}
          className={cn(
            "px-3 py-1.5 rounded-md font-medium text-xs transition-colors flex items-center gap-1.5",
            activeTab === "digifab-calc" ? "bg-accent text-accent-fg font-semibold" : "bg-surface text-muted hover:text-fg",
          )}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          DigiFab Reversal &amp; Immunoassay Trap
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("vaughan-williams")}
          className={cn(
            "px-3 py-1.5 rounded-md font-medium text-xs transition-colors flex items-center gap-1.5",
            activeTab === "vaughan-williams" ? "bg-accent text-accent-fg font-semibold" : "bg-surface text-muted hover:text-fg",
          )}
        >
          <Zap className="h-3.5 w-3.5" />
          Vaughan-Williams Matrix
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("cast-rems")}
          className={cn(
            "px-3 py-1.5 rounded-md font-medium text-xs transition-colors flex items-center gap-1.5",
            activeTab === "cast-rems" ? "bg-accent text-accent-fg font-semibold" : "bg-surface text-muted hover:text-fg",
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          CAST Trial &amp; Dofetilide REMS
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("tray-alerts")}
          className={cn(
            "px-3 py-1.5 rounded-md font-medium text-xs transition-colors flex items-center gap-1.5",
            activeTab === "tray-alerts" ? "bg-accent text-accent-fg font-semibold" : "bg-surface text-muted hover:text-fg",
          )}
        >
          <Flame className="h-3.5 w-3.5" />
          Active Regimen Collisions ({report.alerts.length})
        </button>
      </div>

      {/* TAB 1: DIGOXIN TDM & KINETICS */}
      {activeTab === "digoxin-tdm" && (
        <div className="space-y-4">
          {/* Sampling Timing Trap Banner */}
          {tdmEval.isDistributionLagArtifact && (
            <div className="rounded-lg border-2 border-accent bg-accent-soft p-3.5 space-y-1.5 text-accent-fg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 font-bold" />
                <span className="font-bold text-sm">SAMPLING TIMING TRAP: Pre-Distribution Phase (&lt; 6h Post-Dose)</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Digoxin possesses a huge volume of distribution (Vd ~ 7 L/kg) and binds slowly to tissue Na+/K+ ATPase in
                cardiac myocytes over 6 to 8 hours. Serum levels drawn &lt; 6 hours reflect circulating vascular drug, falsely
                appearing toxic (pseudo-toxicity). <strong>Mandatory blood draw timing: &ge; 6 to 8 hours post-dose</strong> (or
                immediately prior to next maintenance dose). Withhold DigiFab sizing based on this sample unless the patient is
                in hemodynamic arrest or malignant ventricular dysrhythmia.
              </p>
            </div>
          )}

          {/* Interactive Digoxin Controls */}
          <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <span className="font-semibold text-fg text-sm">Therapeutic Drug Monitoring (TDM) Simulator</span>
                <p className="text-muted text-[11px]">
                  Model serum concentration against indication-specific mortality evidence and distribution equilibrium.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted mr-1">Indication:</span>
                <button
                  type="button"
                  onClick={() => setIndication("hfref")}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                    indication === "hfref" ? "bg-accent text-accent-fg font-bold" : "bg-surface-sunken text-muted hover:text-fg",
                  )}
                >
                  HFrEF (0.5–0.9 ng/mL)
                </button>
                <button
                  type="button"
                  onClick={() => setIndication("afib")}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                    indication === "afib" ? "bg-accent text-accent-fg font-bold" : "bg-surface-sunken text-muted hover:text-fg",
                  )}
                >
                  AFib Rate Control (0.8–2.0 ng/mL)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-muted">Serum Digoxin (ng/mL):</span>
                  <span className="font-mono font-bold text-fg">{numSdc.toFixed(1)}</span>
                </div>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="15.0"
                  value={sdcInput}
                  onChange={(e) => setSdcInput(e.target.value)}
                  className="font-mono text-center font-bold text-xs"
                />
                <input
                  type="range"
                  min="0.1"
                  max="6.0"
                  step="0.1"
                  value={numSdc}
                  onChange={(e) => setSdcInput(e.target.value)}
                  className="w-full mt-2 accent-accent cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-muted">Hours Post-Dose:</span>
                  <span className={cn("font-mono font-bold", numHours < 6 ? "text-accent" : "text-fg")}>
                    {numHours.toFixed(0)} h
                  </span>
                </div>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  max="48"
                  value={hoursPostDoseInput}
                  onChange={(e) => setHoursPostDoseInput(e.target.value)}
                  className={cn(
                    "font-mono text-center font-bold text-xs",
                    numHours < 6 ? "border-accent text-accent" : "text-fg",
                  )}
                />
                <input
                  type="range"
                  min="1"
                  max="24"
                  step="1"
                  value={numHours}
                  onChange={(e) => setHoursPostDoseInput(e.target.value)}
                  className="w-full mt-2 accent-accent cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-muted">Patient Weight (kg):</span>
                  <span className="font-mono font-bold text-fg">{numWeight.toFixed(0)} kg</span>
                </div>
                <Input
                  type="number"
                  step="1"
                  min="30"
                  max="180"
                  value={weightKgInput}
                  onChange={(e) => setWeightKgInput(e.target.value)}
                  className="font-mono text-center font-bold text-xs"
                />
                <input
                  type="range"
                  min="40"
                  max="140"
                  step="1"
                  value={numWeight}
                  onChange={(e) => setWeightKgInput(e.target.value)}
                  className="w-full mt-2 accent-accent cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-muted">Serum Potassium (mEq/L):</span>
                  <span className={cn("font-mono font-bold", numPotassium < 3.5 ? "text-danger" : "text-fg")}>
                    {numPotassium.toFixed(1)} mEq/L
                  </span>
                </div>
                <Input
                  type="number"
                  step="0.1"
                  min="1.5"
                  max="7.0"
                  value={potassiumInput}
                  onChange={(e) => setPotassiumInput(e.target.value)}
                  className={cn(
                    "font-mono text-center font-bold text-xs",
                    numPotassium < 3.5 ? "border-danger text-danger" : "text-fg",
                  )}
                />
                <div className="flex gap-1 mt-2">
                  <button
                    type="button"
                    onClick={() => setPotassiumInput("3.1")}
                    className="flex-1 py-0.5 rounded text-[10px] bg-surface-sunken hover:bg-danger-soft hover:text-danger border border-border"
                  >
                    Hypo-K (3.1)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPotassiumInput("4.2")}
                    className="flex-1 py-0.5 rounded text-[10px] bg-surface-sunken hover:bg-ok-soft hover:text-ok border border-border"
                  >
                    Normo-K (4.2)
                  </button>
                </div>
              </div>
            </div>

            {/* Evaluation Status Card */}
            <div className="rounded-lg bg-surface-sunken p-4 border border-border space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge tone={getTdmBadgeTone(tdmEval.band)} className="text-xs px-2.5 py-0.5 font-bold uppercase">
                    {tdmEval.label}
                  </Badge>
                  <span className="font-mono text-xs text-muted">
                    Target: {tdmEval.targetRangeSummary}
                  </span>
                </div>
                <span className="text-[11px] text-muted">
                  {tdmEval.hoursPostDose < 6 ? "Uninterpretable pre-distribution level" : "Steady-state equilibrium"}
                </span>
              </div>
              <p className="text-xs text-fg leading-relaxed">
                {tdmEval.clinicalMeaning}
              </p>
              <div className="rounded bg-surface p-2.5 border border-border text-[11px] text-muted space-y-1">
                <div className="font-semibold text-fg">DIG Trial &amp; Mortality Outcome Evidence:</div>
                <div>{tdmEval.mortalityEvidence}</div>
              </div>
            </div>

            {/* Electrolyte Sensitivity Amplifiers Card */}
            <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Flame className={cn("h-4 w-4", tdmEval.electrolyteSensitivity.hasAmplifier ? "text-danger" : "text-muted")} />
                  <span className="font-semibold text-fg text-sm">Electrolyte Proarrhythmia Sensitivity Amplifiers</span>
                </div>
                <Badge
                  tone={tdmEval.electrolyteSensitivity.severity === "severe" ? "danger" : tdmEval.electrolyteSensitivity.hasAmplifier ? "warn" : "ok"}
                  className="uppercase text-[10px]"
                >
                  {tdmEval.electrolyteSensitivity.hasAmplifier ? `${tdmEval.electrolyteSensitivity.severity} Risk Amplifier` : "Electrolytes Protective"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={cn("p-2.5 rounded border text-[11px]", tdmEval.electrolyteSensitivity.hypokalemia ? "border-danger bg-danger-soft/10 text-danger" : "border-border bg-surface-sunken text-muted")}>
                  <div className="font-bold flex items-center justify-between">
                    <span>Hypokalemia (K+ &lt; 3.5)</span>
                    <span>{numPotassium.toFixed(1)} mEq/L</span>
                  </div>
                  <p className="mt-1 leading-relaxed">
                    Loss of competitive K+ binding at the alpha-subunit Na+/K+ ATPase extracellular domain. Doubles digitalis binding affinity, triggering PVCs &amp; bidirectional VT at "normal" levels.
                  </p>
                </div>

                <div className={cn("p-2.5 rounded border text-[11px]", tdmEval.electrolyteSensitivity.hypomagnesemia ? "border-warn bg-warn-soft/10 text-warn" : "border-border bg-surface-sunken text-muted")}>
                  <div className="font-bold flex items-center justify-between">
                    <span>Hypomagnesemia (Mg &lt; 1.8)</span>
                    <span>{numMagnesium.toFixed(1)} mg/dL</span>
                  </div>
                  <p className="mt-1 leading-relaxed">
                    Loss of obligatory intracellular cofactor for Na+/K+ ATPase phosphohydrolase. Promotes delayed afterdepolarizations (DADs) and creates refractory hypokalemia.
                  </p>
                </div>

                <div className={cn("p-2.5 rounded border text-[11px]", tdmEval.electrolyteSensitivity.hypercalcemia ? "border-warn bg-warn-soft/10 text-warn" : "border-border bg-surface-sunken text-muted")}>
                  <div className="font-bold flex items-center justify-between">
                    <span>Hypercalcemia (Ca &gt; 10.5)</span>
                    <span>{numCalcium.toFixed(1)} mg/dL</span>
                  </div>
                  <p className="mt-1 leading-relaxed">
                    Compounding sarcoplasmic reticulum Ca2+ overload via reverse-mode NCX. Spontaneous Ca2+ sparks generate transient inward current (Iti) and PAT with block.
                  </p>
                </div>
              </div>

              {tdmEval.electrolyteSensitivity.hasAmplifier && (
                <div className="rounded bg-danger-soft/20 p-2.5 border border-danger/30 text-danger text-[11px] leading-relaxed">
                  <strong>Bedside Rule:</strong> {tdmEval.electrolyteSensitivity.clinicalAdvisory}
                </div>
              )}
            </div>

            {/* P-gp Clearance Collision Banner */}
            <div className="rounded-lg border border-border bg-surface-sunken p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-accent" />
                <span className="font-semibold text-fg text-sm">P-glycoprotein (P-gp / ABCB1) &amp; Renal Clearance Collisions</span>
              </div>
              <p className="text-muted text-[11px] leading-relaxed">
                Digoxin is cleared ~70–80% by the kidneys via glomerular filtration and active tubular secretion mediated by apical P-gp (ABCB1).
                Co-administration with potent P-gp inhibitors doubles digoxin AUC and plasma concentration.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {Object.entries(POTENT_PGP_INHIBITOR_MAP).map(([id, info]) => {
                  const isPresent = ids.includes(id);
                  return (
                    <div
                      key={id}
                      className={cn(
                        "p-2 rounded border text-[11px] transition-colors",
                        isPresent ? "border-danger bg-danger-soft/20 text-danger font-bold" : "border-border bg-surface text-muted",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span>{info.name}</span>
                        <span className="text-[10px] font-mono">-{info.digoxinDoseCutPct}% cut</span>
                      </div>
                      <div className="text-[10px] opacity-80 mt-0.5">{isPresent ? "PRESENT ON TRAY" : "Potent P-gp Inhibitor"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DIGIFAB REVERSAL & IMMUNOASSAY TRAP */}
      {activeTab === "digifab-calc" && (
        <div className="space-y-4">
          {/* CRITICAL POST-FAB IMMUNOASSAY TRAP BANNER */}
          <div className="rounded-lg border-2 border-danger bg-danger-soft p-4 space-y-2 text-danger-fg">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-danger shrink-0 font-bold" />
              <span className="font-serif font-bold text-sm tracking-tight text-danger">
                CRITICAL POST-FAB MONITORING TRAP: Total Digoxin Spike &amp; Rebound Hypokalemia
              </span>
            </div>
            <p className="text-[11px] text-danger leading-relaxed">
              {fabResult.postFabMonitoringTrap.totalDigoxinSpikeExplanation}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="rounded bg-surface p-3 border border-border text-fg space-y-1">
                <div className="font-bold text-xs text-danger flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-danger" />
                  1 to 2 Week Immunoassay Blackout
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  {fabResult.postFabMonitoringTrap.uninterpretableWindowDuration} Follow continuous cardiac telemetry, 12-lead EKG, and hemodynamics instead.
                </p>
              </div>
              <div className="rounded bg-surface p-3 border border-border text-fg space-y-1">
                <div className="font-bold text-xs text-danger flex items-center gap-1.5">
                  <Droplets className="h-3.5 w-3.5 text-danger" />
                  Rebound Hypokalemia Hazard
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  {fabResult.postFabMonitoringTrap.potassiumShiftWarning}
                </p>
              </div>
            </div>
          </div>

          {/* Interactive DigiFab Sizing Calculator */}
          <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <span className="font-semibold text-fg text-sm">Digoxin Immune Fab (DigiFab) Stoichiometric Calculator</span>
                <p className="text-muted text-[11px]">
                  Calculate antigen-binding Fab fragment vial requirements based on acute ingestion or steady-state body load.
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setFabScenario("steady-state-serum-concentration")}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                    fabScenario === "steady-state-serum-concentration" ? "bg-accent text-accent-fg font-bold" : "bg-surface-sunken text-muted hover:text-fg",
                  )}
                >
                  Steady-State SDC
                </button>
                <button
                  type="button"
                  onClick={() => setFabScenario("acute-known-ingestion")}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                    fabScenario === "acute-known-ingestion" ? "bg-accent text-accent-fg font-bold" : "bg-surface-sunken text-muted hover:text-fg",
                  )}
                >
                  Acute Ingestion (mg)
                </button>
                <button
                  type="button"
                  onClick={() => setFabScenario("empiric-arrest-or-instability")}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                    fabScenario === "empiric-arrest-or-instability" ? "bg-danger text-accent-fg font-bold" : "bg-surface-sunken text-muted hover:text-fg",
                  )}
                >
                  Cardiac Arrest (Empiric)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {fabScenario === "acute-known-ingestion" ? (
                <div>
                  <label className="text-[11px] text-muted block mb-1">Known Acute Ingestion (mg):</label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="50"
                    value={ingestedMgInput}
                    onChange={(e) => setIngestedMgInput(e.target.value)}
                    className="font-mono text-center font-bold text-xs"
                  />
                  <span className="text-[10px] text-muted block mt-1">10 mg = 40 tablets of 0.25 mg</span>
                </div>
              ) : fabScenario === "steady-state-serum-concentration" ? (
                <div>
                  <label className="text-[11px] text-muted block mb-1">Serum Digoxin Level (ng/mL):</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="20"
                    value={sdcInput}
                    onChange={(e) => setSdcInput(e.target.value)}
                    className="font-mono text-center font-bold text-xs"
                  />
                  <span className="text-[10px] text-muted block mt-1">Drawn &ge; 6-8h post-dose</span>
                </div>
              ) : (
                <div className="col-span-1 sm:col-span-2">
                  <div className="rounded bg-danger-soft/20 p-2.5 border border-danger/30 text-danger text-xs">
                    <strong>Adult Resuscitation Protocol:</strong> 10 to 20 vials IV push immediately without waiting for lab confirmation.
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] text-muted block mb-1">Patient Weight (kg):</label>
                <Input
                  type="number"
                  step="1"
                  min="30"
                  max="180"
                  value={weightKgInput}
                  onChange={(e) => setWeightKgInput(e.target.value)}
                  className="font-mono text-center font-bold text-xs"
                />
              </div>

              <div className="rounded-lg bg-surface-sunken border border-border p-3 flex flex-col justify-center items-center text-center">
                <span className="text-muted text-[11px]">Recommended DigiFab Vials:</span>
                <span className="font-mono text-2xl font-bold text-accent my-0.5">
                  {fabResult.vialsToAdministerRoundedUp} vials
                </span>
                <span className="text-[10px] text-muted">
                  ({fabResult.exactVialsCalculated} calculated exact) · Neutralizes ~{fabResult.mgDigoxinNeutralized} mg digoxin
                </span>
              </div>
            </div>

            <div className="rounded bg-surface-sunken p-3 border border-border space-y-2">
              <div className="font-semibold text-fg text-xs">Stoichiometric Formula Applied:</div>
              <div className="font-mono text-xs text-accent">{fabResult.formulaDescription}</div>
              <p className="text-[11px] text-muted leading-relaxed">
                {fabResult.stoichiometricRationale}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VAUGHAN-WILLIAMS MATRIX */}
      {activeTab === "vaughan-williams" && (
        <div className="space-y-4">
          <div className="rounded-lg bg-surface-sunken p-3 border border-border text-xs text-muted leading-relaxed">
            <strong>Vaughan-Williams Electrophysiological Framework:</strong> Classifies antiarrhythmic agents by primary ionic
            channel/receptor conductance modulation, action potential duration (APD), refractory period (ERP), and kinetics of recovery
            from block (use-dependence vs reverse use-dependence).
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(ANTIARRHYTHMIC_PROFILES).map((prof) => (
              <div
                key={prof.id}
                className={cn(
                  "rounded-lg border p-4 space-y-3 bg-surface",
                  prof.castTrialStatus?.isCastContraindicated ? "border-danger/40" : "border-border",
                )}
              >
                <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-fg">{prof.name}</span>
                    <span className="text-muted text-[11px]">({prof.brandNames.join(", ")})</span>
                  </div>
                  <Badge
                    tone={prof.vwClass.startsWith("I") ? "accent" : prof.vwClass === "III" ? "warn" : "default"}
                    className="font-mono uppercase text-[10px]"
                  >
                    Class {prof.vwClass}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-muted block">Channel Target:</span>
                    <span className="text-fg font-medium">{prof.primaryChannelTarget}</span>
                  </div>
                  <div>
                    <span className="text-muted block">Use-Dependence:</span>
                    <span className="text-fg font-medium capitalize">{prof.useDependencePattern.replace(/-/g, " ")}</span>
                  </div>
                  <div>
                    <span className="text-muted block">Action Potential:</span>
                    <span className="text-fg font-medium">{prof.actionPotentialEffect}</span>
                  </div>
                  <div>
                    <span className="text-muted block">ECG Manifestation:</span>
                    <span className="text-fg font-medium">{prof.ecgManifestations}</span>
                  </div>
                </div>

                {prof.castTrialStatus?.isCastContraindicated && (
                  <div className="rounded bg-danger-soft/20 p-2 border border-danger/30 text-danger text-[11px] space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      CAST Trial Landmark Contraindication:
                    </div>
                    <p className="leading-relaxed">
                      Avoid in ischemic heart disease, prior MI, or structural heart disease. Safe niche restricted to structurally normal hearts.
                    </p>
                  </div>
                )}

                {prof.dofetilideRemsProfile?.isRemsRegulated && (
                  <div className="rounded bg-warn-soft/20 p-2 border border-warn/30 text-warn text-[11px] space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      FDA REMS Mandatory Inpatient Program:
                    </div>
                    <p className="leading-relaxed">
                      Mandatory &ge; 3-day inpatient continuous telemetry initiation. Titrate strictly by Cockcroft-Gault CrCl and serial QTc.
                    </p>
                  </div>
                )}

                <div className="space-y-1 pt-1 border-t border-border">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Key Clinical Pearls:</span>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-muted">
                    {prof.clinicalPearls.slice(0, 3).map((pearl, i) => (
                      <li key={i}>{pearl}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: CAST TRIAL & DOFETILIDE REMS */}
      {activeTab === "cast-rems" && (
        <div className="space-y-4">
          {/* CAST Trial Deep Dive */}
          <div className="rounded-lg border border-danger/30 bg-surface p-4 space-y-3">
            <div className="flex items-center gap-2 text-danger">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-serif font-bold text-sm">
                The Cardiac Arrhythmia Suppression Trial (CAST 1989 / 1991) Doctrine
              </span>
            </div>
            <p className="text-xs text-fg leading-relaxed">
              <strong>Trial Overview:</strong> Post-myocardial infarction patients with asymptomatic ventricular ectopy were randomized to
              encainide, flecainide, or moricizine vs placebo. The trial was halted prematurely by the Data Safety Monitoring Board
              due to an alarming <strong>&gt; 2.5-fold higher incidence of arrhythmic death and cardiac arrest</strong> in the active drug arms.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div className="rounded bg-surface-sunken p-3 border border-border space-y-1.5">
                <div className="font-bold text-fg">Biophysical Proarrhythmia Mechanism:</div>
                <p className="text-muted leading-relaxed">
                  Slow dissociation of Class Ic drugs from Nav1.5 sodium channels (tau recovery &gt; 10–30s) produces profound, non-uniform
                  conduction slowing across scarred or ischemic myocardium. This creates large excitable gaps that facilitate fatal macroreentrant
                  monomorphic and sinusoidal ventricular tachycardia.
                </p>
              </div>
              <div className="rounded bg-surface-sunken p-3 border border-border space-y-1.5">
                <div className="font-bold text-fg">Safe Clinical Niche &amp; 1:1 Flutter Trap:</div>
                <p className="text-muted leading-relaxed">
                  Class Ic drugs are strictly restricted to patients with <strong>structurally normal hearts</strong> ("lone AFib", SVT).
                  <strong> 1:1 Atrial Flutter Alert:</strong> Flecainide slows atrial flutter from 300 to ~200 bpm, allowing the AV node to conduct 1:1,
                  causing lethal rapid wide-complex tachycardia. <em>Always pre-treat with an AV nodal blocker (beta-blocker or non-DHP CCB).</em>
                </p>
              </div>
            </div>
          </div>

          {/* Dofetilide REMS Simulator */}
          <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-warn" />
              <span className="font-semibold text-fg text-sm">Dofetilide (Tikosyn) REMS Inpatient Protocol Simulator</span>
            </div>
            <p className="text-muted text-[11px] leading-relaxed">
              Dofetilide is a pure IKr potassium channel blocker with profound reverse use-dependence. FDA REMS legally mandates a minimum
              <strong> 3-day (72-hour) inpatient hospitalization with continuous cardiac telemetry</strong>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-muted block mb-1">Cockcroft-Gault CrCl (mL/min):</label>
                <Input
                  type="number"
                  step="5"
                  min="5"
                  max="150"
                  value={dofetilideCrClInput}
                  onChange={(e) => setDofetilideCrClInput(e.target.value)}
                  className={cn("font-mono text-center font-bold text-xs", numCrCl < 20 ? "text-danger border-danger" : "text-fg")}
                />
              </div>

              <div>
                <label className="text-[11px] text-muted block mb-1">Baseline QTc (ms):</label>
                <Input
                  type="number"
                  step="5"
                  min="320"
                  max="600"
                  value={dofetilideQtcInput}
                  onChange={(e) => setDofetilideQtcInput(e.target.value)}
                  className={cn("font-mono text-center font-bold text-xs", numQtc > 440 ? "text-danger border-danger" : "text-fg")}
                />
              </div>

              <div className="rounded bg-surface-sunken p-2.5 border border-border flex flex-col justify-center items-center text-center">
                <span className="text-muted text-[10px]">REMS Starting Dose Rail:</span>
                <span className={cn("font-mono font-bold text-sm", numCrCl < 20 || numQtc > 440 ? "text-danger" : "text-accent")}>
                  {numQtc > 440
                    ? "CONTRAINDICATED (QTc > 440)"
                    : numCrCl < 20
                    ? "CONTRAINDICATED (CrCl < 20)"
                    : numCrCl < 40
                    ? "125 mcg PO BID"
                    : numCrCl <= 60
                    ? "250 mcg PO BID"
                    : "500 mcg PO BID"}
                </span>
              </div>
            </div>

            <div className="rounded bg-surface-sunken p-3 border border-border text-[11px] text-muted space-y-1.5">
              <div className="font-semibold text-fg">REMS 2–3 Hour Post-Dose EKG Titration Rule:</div>
              <p>
                Measure 12-lead EKG at 2 to 3 hours post-dose (Tmax). If QTc increases by &gt; 15% from baseline or exceeds 500 ms (550 ms with bundle branch block),
                immediately reduce dose to the next lower tier. If QTc &gt; 500 ms while on 125 mcg BID, permanently discontinue.
                Pre-requisite serum K+ &ge; 4.0 mEq/L and Mg2+ &ge; 2.0 mg/dL mandatory.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ACTIVE TRAY REGIMEN COLLISIONS */}
      {activeTab === "tray-alerts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-fg text-sm">Active Regimen Collisions &amp; Safety Advisories</span>
            <Badge tone={report.alerts.length > 0 ? "warn" : "ok"} className="font-mono text-[10px]">
              {report.alerts.length} Active Warnings
            </Badge>
          </div>

          {report.alerts.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface p-6 text-center text-muted text-xs">
              <CheckCircle2 className="h-6 w-6 text-ok mx-auto mb-2" />
              No severe antiarrhythmic channelopathy collisions, P-gp clearance blocks, or CAST contraindications detected on current desk tray.
            </div>
          ) : (
            <div className="space-y-3">
              {report.alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "rounded-lg border p-4 space-y-2 bg-surface",
                    alert.tier === "critical" ? "border-danger/40 bg-danger-soft/10" : "border-warn/40 bg-warn-soft/10",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className={cn("h-4 w-4 shrink-0", alert.tier === "critical" ? "text-danger" : "text-warn")} />
                      <span className="font-bold text-sm text-fg">{alert.title}</span>
                    </div>
                    <Badge tone={alert.tier === "critical" ? "danger" : "warn"} className="font-mono text-[10px] uppercase">
                      {alert.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">{alert.rationale}</p>
                  <div className="rounded bg-surface p-2.5 border border-border text-[11px] text-fg">
                    <strong>Action Guidance:</strong> {alert.actionGuidance}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Authoritative Literature Citations */}
      <div className="rounded-lg border border-border bg-surface-sunken p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Info className="h-3.5 w-3.5 text-muted" />
          <span className="font-semibold text-fg text-xs uppercase tracking-wider">Peer-Reviewed Citations &amp; Evidence Base</span>
        </div>
        <ol className="list-decimal pl-4 space-y-1 text-[11px] text-muted">
          {ANTIARRHYTHMIC_CITATIONS.map((cite, i) => (
            <li key={i}>{cite}</li>
          ))}
        </ol>
      </div>

      {/* Statutory Regulatory CDS Disclaimer */}
      <div className="rounded-lg border border-border bg-surface p-3.5 text-[10px] text-muted leading-relaxed space-y-1">
        <div className="font-bold uppercase tracking-wider text-fg">Regulatory Compliance Notice:</div>
        <div>{report.disclaimer}</div>
      </div>
    </div>
  );
}
