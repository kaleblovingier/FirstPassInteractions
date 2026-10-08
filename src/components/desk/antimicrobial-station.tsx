import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  Gauge,
  Info,
  Layers,
  Pill,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { HostContext } from "@/lib/drugs/types";
import {
  antimicrobialOnDesk,
  antimicrobialReportOnDesk,
  calculateAminoglycosideHartford,
  calculateArcticScore,
  calculateVancomycinAuc,
  evaluateCefepimeNeurotoxicity,
  evaluateDaptomycinSafety,
  evaluateLinezolidSafety,
  simulateBetaLactamInfusion,
  ANTIMICROBIAL_KINETICS_CITATIONS,
  ANTIMICROBIAL_KINETICS_REGULATORY_NOTICE,
  BETA_LACTAM_PROFILES,
} from "@/lib/drugs/antimicrobial-kinetics";

export function AntimicrobialPanel({ ids, host }: { ids: string[]; host: HostContext }) {
  // Master detection and report
  const report = useMemo(() => antimicrobialReportOnDesk(ids, host), [ids.join("|"), host.kidney, host.age]);
  const detection = useMemo(() => antimicrobialOnDesk(ids), [ids.join("|")]);

  // Main station tab state: "pkpd" | "arc" | "safety" | "pearls"
  const [stationTab, setStationTab] = useState<"pkpd" | "arc" | "safety" | "pearls">("pkpd");

  // --------------------------------------------------------------------------
  // TAB 1: PK/PD Simulator State
  // --------------------------------------------------------------------------
  const [pkModalType, setPkModalType] = useState<"time_dependent" | "concentration_dependent" | "exposure_dependent">(
    "time_dependent"
  );

  // Beta-lactam simulator state
  const [betaLactamDrug, setBetaLactamDrug] = useState<string>(
    ids.find((id) => BETA_LACTAM_PROFILES[id]) ?? "meropenem"
  );
  const selectedBetaProfile = BETA_LACTAM_PROFILES[betaLactamDrug] ?? BETA_LACTAM_PROFILES["meropenem"];
  const [betaDose, setBetaDose] = useState<string>(String(selectedBetaProfile.standardDoseMg));
  const [betaInterval, setBetaInterval] = useState<string>(String(selectedBetaProfile.standardIntervalHours));
  const [betaInfusionHours, setBetaInfusionHours] = useState<number>(selectedBetaProfile.extendedInfusionHours);
  const [betaCrCl, setBetaCrCl] = useState<string>(host.kidney === "ckd" ? "30" : "110");
  const [betaMic, setBetaMic] = useState<string>("2.0");

  const numBetaDose = Math.max(250, Number(betaDose) || 1000);
  const numBetaInterval = Math.max(4, Number(betaInterval) || 8);
  const numBetaCrCl = Math.max(10, Number(betaCrCl) || 100);
  const numBetaMic = Math.max(0.125, Number(betaMic) || 2.0);

  const betaSim = useMemo(
    () =>
      simulateBetaLactamInfusion({
        drugId: betaLactamDrug,
        doseMg: numBetaDose,
        intervalHours: numBetaInterval,
        infusionHours: betaInfusionHours,
        crCl: numBetaCrCl,
        mic: numBetaMic,
        patientWeightKg: 70,
      }),
    [betaLactamDrug, numBetaDose, numBetaInterval, betaInfusionHours, numBetaCrCl, numBetaMic]
  );

  // Aminoglycoside Hartford simulator state
  const [agAgent, setAgAgent] = useState<"gentamicin" | "tobramycin" | "amikacin">(
    ids.includes("amikacin") ? "amikacin" : ids.includes("tobramycin") ? "tobramycin" : "gentamicin"
  );
  const [agWeight, setAgWeight] = useState<string>("85");
  const [agHeight, setAgHeight] = useState<string>("175");
  const [agSex, setAgSex] = useState<"male" | "female">("male");
  const [agDosePerKg, setAgDosePerKg] = useState<string>(agAgent === "amikacin" ? "15" : "7");
  const [agSerumLevel, setAgSerumLevel] = useState<string>("3.2");
  const [agDrawHour, setAgDrawHour] = useState<string>("8");
  const [agMic, setAgMic] = useState<string>(agAgent === "amikacin" ? "4.0" : "1.0");

  const numAgWeight = Math.max(30, Number(agWeight) || 75);
  const numAgHeight = Math.max(120, Number(agHeight) || 175);
  const numAgDosePerKg = Math.max(1, Number(agDosePerKg) || (agAgent === "amikacin" ? 15 : 7));
  const numAgSerumLevel = Number(agSerumLevel) || 0;
  const numAgDrawHour = Math.max(6, Math.min(14, Number(agDrawHour) || 8));
  const numAgMic = Math.max(0.25, Number(agMic) || 1.0);

  const agSim = useMemo(
    () =>
      calculateAminoglycosideHartford({
        agent: agAgent,
        actualWeightKg: numAgWeight,
        heightCm: numAgHeight,
        sex: agSex,
        doseMgPerKg: numAgDosePerKg,
        serumLevelUgMl: numAgSerumLevel > 0 ? numAgSerumLevel : undefined,
        drawHoursPostDose: numAgDrawHour,
        mic: numAgMic,
      }),
    [agAgent, numAgWeight, numAgHeight, agSex, numAgDosePerKg, numAgSerumLevel, numAgDrawHour, numAgMic]
  );

  // Vancomycin AUC simulator state
  const [vancoDailyDose, setVancoDailyDose] = useState<string>("3000");
  const [vancoCrCl, setVancoCrCl] = useState<string>(host.kidney === "ckd" ? "35" : "90");
  const [vancoMic, setVancoMic] = useState<string>("1.0");
  const [vancoTrough, setVancoTrough] = useState<string>("16");

  const numVancoDose = Math.max(500, Number(vancoDailyDose) || 2000);
  const numVancoCrCl = Math.max(10, Number(vancoCrCl) || 80);
  const numVancoMic = Math.max(0.25, Number(vancoMic) || 1.0);
  const numVancoTrough = Number(vancoTrough) || 0;

  const vancoSim = useMemo(
    () =>
      calculateVancomycinAuc({
        totalDailyDoseMg: numVancoDose,
        crCl: numVancoCrCl,
        mic: numVancoMic,
        measuredTroughUgMl: numVancoTrough > 0 ? numVancoTrough : undefined,
      }),
    [numVancoDose, numVancoCrCl, numVancoMic, numVancoTrough]
  );

  // --------------------------------------------------------------------------
  // TAB 2: ARCTIC Augmented Renal Clearance State
  // --------------------------------------------------------------------------
  const [arcAge, setArcAge] = useState<number>(host.age === "geriatric" ? 78 : 34);
  const [arcTrauma, setArcTrauma] = useState<boolean>(true);
  const [arcSofa, setArcSofa] = useState<number>(2);

  const arcResult = useMemo(
    () =>
      calculateArcticScore({
        age: arcAge,
        hasTrauma: arcTrauma,
        sofaScore: arcSofa,
      }),
    [arcAge, arcTrauma, arcSofa]
  );

  // --------------------------------------------------------------------------
  // TAB 3: High-Alert Safety Rails State
  // --------------------------------------------------------------------------
  const [cefepimeCrCl, setCefepimeCrCl] = useState<string>(host.kidney === "ckd" ? "25" : "75");
  const [cefepimeIsDialysis, setCefepimeIsDialysis] = useState<boolean>(false);
  const numCefepimeCrCl = Math.max(0, Number(cefepimeCrCl) || 0);

  const cefepimeSafety = useMemo(
    () => evaluateCefepimeNeurotoxicity(numCefepimeCrCl, cefepimeIsDialysis, 6.0),
    [numCefepimeCrCl, cefepimeIsDialysis]
  );

  const [linezolidDays, setLinezolidDays] = useState<number>(16);
  const linezolidSafety = useMemo(
    () =>
      evaluateLinezolidSafety({
        durationDays: linezolidDays,
        coAdministeredAgents: ids,
      }),
    [linezolidDays, ids.join("|")]
  );

  const [daptoPneumonia, setDaptoPneumonia] = useState<boolean>(false);
  const daptoSafety = useMemo(
    () => evaluateDaptomycinSafety(daptoPneumonia, ids),
    [daptoPneumonia, ids.join("|")]
  );

  const hasCriticalSafetyAlert = report.organSafetyAlerts.some((a) => a.severity === "critical");
  const hasHighSafetyAlert = report.organSafetyAlerts.some((a) => a.severity === "high");

  return (
    <div className="space-y-6 text-xs text-fg">
      {/* Station Header */}
      <div className="rounded-lg bg-surface-sunken p-4 border border-border space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-accent" />
            <span className="font-serif font-bold text-sm tracking-tight text-fg">
              Antimicrobial Pharmacokinetics, Augmented Renal Clearance &amp; Organ Safety Station
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              tone={hasCriticalSafetyAlert ? "danger" : hasHighSafetyAlert ? "warn" : "ok"}
              className="font-mono uppercase text-[10px]"
            >
              {hasCriticalSafetyAlert ? "Critical Safety Alerts" : hasHighSafetyAlert ? "High-Alert Rails" : "Stable Kinetics"}
            </Badge>
            <Badge tone="accent" className="font-mono uppercase text-[10px]">
              FD&amp;C § 520(o)(1)(E) Non-Device CDS
            </Badge>
          </div>
        </div>
        <p className="text-muted leading-relaxed">
          Tri-modal PK/PD indices (Time-dependent %fT&gt;MIC, Concentration-dependent Cmax/MIC, Exposure-dependent AUC24/MIC),
          ARCTIC Augmented Renal Clearance prediction, and high-alert organ safety rails (Cefepime GABA-A NCSE, Linezolid MAOI, Daptomycin surfactant inactivation).
        </p>

        {/* Detected Antimicrobials Tray */}
        <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-muted font-medium">Desk Tray Antimicrobial Detection:</span>
          {detection.hasAntimicrobial ? (
            detection.matchedAntimicrobials.map((id) => (
              <Badge key={id} tone="info" className="font-mono text-[10px]">
                {id}
              </Badge>
            ))
          ) : (
            <span className="text-muted italic">No targeted antimicrobial in active tray (simulating standard ICU models)</span>
          )}
          {detection.matchedInteractingAgents.length > 0 ? (
            <Badge tone="warn" className="font-mono text-[10px]">
              Colliding Perpetrators: {detection.matchedInteractingAgents.join(", ")}
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setStationTab("pkpd")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            stationTab === "pkpd" ? "bg-accent text-accent-fg font-semibold" : "text-muted hover:text-fg bg-surface"
          )}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>1. Tri-Modal PK/PD Simulator</span>
        </button>
        <button
          type="button"
          onClick={() => setStationTab("arc")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            stationTab === "arc" ? "bg-accent text-accent-fg font-semibold" : "text-muted hover:text-fg bg-surface"
          )}
        >
          <Flame className="h-3.5 w-3.5" />
          <span>2. ARCTIC Renal Hyperfiltration</span>
          {arcResult.isHighRiskArc ? (
            <span className="h-2 w-2 rounded-full bg-danger animate-pulse" />
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setStationTab("safety")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            stationTab === "safety" ? "bg-accent text-accent-fg font-semibold" : "text-muted hover:text-fg bg-surface"
          )}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>3. High-Alert Organ Safety Rails</span>
          {hasCriticalSafetyAlert ? (
            <span className="h-2 w-2 rounded-full bg-danger animate-pulse" />
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setStationTab("pearls")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            stationTab === "pearls" ? "bg-accent text-accent-fg font-semibold" : "text-muted hover:text-fg bg-surface"
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>4. Stewardship Pearls &amp; Evidence</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: TRI-MODAL PK/PD TARGET SIMULATOR                               */}
      {/* ==================================================================== */}
      {stationTab === "pkpd" ? (
        <div className="space-y-4">
          {/* Modal Index Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-surface border border-border">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-accent" />
              <span className="font-semibold text-fg">Antimicrobial Pharmacodynamic Index:</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPkModalType("time_dependent")}
                className={cn(
                  "px-2.5 py-1 rounded text-xs transition-colors",
                  pkModalType === "time_dependent"
                    ? "bg-accent text-accent-fg font-bold"
                    : "bg-surface-sunken text-muted hover:text-fg"
                )}
              >
                Time-Dependent (%fT &gt; MIC)
              </button>
              <button
                type="button"
                onClick={() => setPkModalType("concentration_dependent")}
                className={cn(
                  "px-2.5 py-1 rounded text-xs transition-colors",
                  pkModalType === "concentration_dependent"
                    ? "bg-accent text-accent-fg font-bold"
                    : "bg-surface-sunken text-muted hover:text-fg"
                )}
              >
                Concentration-Dependent (Cmax / MIC)
              </button>
              <button
                type="button"
                onClick={() => setPkModalType("exposure_dependent")}
                className={cn(
                  "px-2.5 py-1 rounded text-xs transition-colors",
                  pkModalType === "exposure_dependent"
                    ? "bg-accent text-accent-fg font-bold"
                    : "bg-surface-sunken text-muted hover:text-fg"
                )}
              >
                Exposure-Dependent (AUC24 / MIC)
              </button>
            </div>
          </div>

          {/* 1A: Beta-Lactam Time-Dependent (%fT > MIC) Simulator */}
          {pkModalType === "time_dependent" ? (
            <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                <div>
                  <h3 className="font-serif font-bold text-sm text-fg">
                    Beta-Lactam Time-Dependent Bactericidal Optimization (%fT &gt; MIC)
                  </h3>
                  <p className="text-muted text-[11px]">
                    Bactericidal efficacy requires free drug concentrations to exceed pathogen MIC for a critical portion
                    of the interval (Carbapenems &gt;= 40%, Penicillins &gt;= 50%, Cephalosporins &gt;= 60–70%). Critically ill target: 100% fT &gt; 4x MIC.
                  </p>
                </div>
                <Badge tone={betaSim.criticalIllTargetAchieved ? "ok" : betaSim.standardThresholdAchieved ? "info" : "danger"}>
                  {betaSim.criticalIllTargetAchieved
                    ? "100% fT > 4x MIC Achieved"
                    : betaSim.standardThresholdAchieved
                    ? "Standard Threshold Met"
                    : "Subtherapeutic Failure"}
                </Badge>
              </div>

              {/* Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-[11px]">
                <div>
                  <label className="block text-muted font-medium mb-1">Select Beta-Lactam</label>
                  <select
                    value={betaLactamDrug}
                    onChange={(e) => {
                      const drug = e.target.value;
                      setBetaLactamDrug(drug);
                      const p = BETA_LACTAM_PROFILES[drug];
                      if (p) {
                        setBetaDose(String(p.standardDoseMg));
                        setBetaInterval(String(p.standardIntervalHours));
                        setBetaInfusionHours(p.extendedInfusionHours);
                      }
                    }}
                    className="w-full h-8 rounded border border-border bg-surface-sunken px-2 text-xs text-fg font-medium"
                  >
                    <option value="meropenem">Meropenem (Carbapenem)</option>
                    <option value="piperacillin-tazobactam">Piperacillin/Tazo (Penicillin)</option>
                    <option value="cefepime">Cefepime (Cephalosporin 4th gen)</option>
                    <option value="ceftazidime">Ceftazidime (Cephalosporin 3rd gen)</option>
                    <option value="ceftriaxone">Ceftriaxone (Cephalosporin 3rd gen)</option>
                    <option value="aztreonam">Aztreonam (Monobactam)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">Dose per Administration (mg)</label>
                  <Input
                    type="number"
                    step="250"
                    value={betaDose}
                    onChange={(e) => setBetaDose(e.target.value)}
                    className="h-8 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">Dosing Interval Tau (hours)</label>
                  <Input
                    type="number"
                    step="2"
                    value={betaInterval}
                    onChange={(e) => setBetaInterval(e.target.value)}
                    className="h-8 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">Estimated CrCl (mL/min)</label>
                  <Input
                    type="number"
                    step="10"
                    value={betaCrCl}
                    onChange={(e) => setBetaCrCl(e.target.value)}
                    className="h-8 font-mono text-xs"
                  />
                  {numBetaCrCl > 130 ? (
                    <span className="text-[10px] text-danger block mt-0.5">Augmented Renal Clearance!</span>
                  ) : null}
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">Pathogen MIC (mcg/mL)</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={betaMic}
                    onChange={(e) => setBetaMic(e.target.value)}
                    className="h-8 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Infusion Mode Selector Slider / Buttons */}
              <div className="rounded border border-border bg-surface-sunken p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-accent" />
                    <span className="font-semibold text-fg text-xs">Infusion Duration Strategy:</span>
                    <Badge tone="accent" className="font-mono text-[10px]">
                      {betaInfusionHours === 0.5
                        ? "30-min Intermittent Bolus"
                        : betaInfusionHours >= 24
                        ? "24-hr Continuous Infusion"
                        : `${betaInfusionHours}-hr Extended Infusion`}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setBetaInfusionHours(0.5)}
                      className={cn(
                        "px-2 py-0.5 rounded text-[11px]",
                        betaInfusionHours === 0.5 ? "bg-accent text-accent-fg font-bold" : "bg-surface text-muted"
                      )}
                    >
                      30m Bolus
                    </button>
                    <button
                      type="button"
                      onClick={() => setBetaInfusionHours(3.0)}
                      className={cn(
                        "px-2 py-0.5 rounded text-[11px]",
                        betaInfusionHours === 3.0 ? "bg-accent text-accent-fg font-bold" : "bg-surface text-muted"
                      )}
                    >
                      3h Extended
                    </button>
                    <button
                      type="button"
                      onClick={() => setBetaInfusionHours(4.0)}
                      className={cn(
                        "px-2 py-0.5 rounded text-[11px]",
                        betaInfusionHours === 4.0 ? "bg-accent text-accent-fg font-bold" : "bg-surface text-muted"
                      )}
                    >
                      4h Extended
                    </button>
                    <button
                      type="button"
                      onClick={() => setBetaInfusionHours(24.0)}
                      className={cn(
                        "px-2 py-0.5 rounded text-[11px]",
                        betaInfusionHours >= 24.0 ? "bg-accent text-accent-fg font-bold" : "bg-surface text-muted"
                      )}
                    >
                      24h Continuous
                    </button>
                  </div>
                </div>

                {/* Progress bar visualizer */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted">
                      Time Above MIC (fT &gt; {numBetaMic} mcg/mL): <strong className="text-fg">{betaSim.fTAboveMicPct}%</strong> of interval
                    </span>
                    <span className="text-muted">
                      Bactericidal Threshold: <strong className="text-accent">&gt;= {betaSim.standardThresholdPct}%</strong>
                    </span>
                  </div>
                  <div className="h-3 w-full rounded bg-surface border border-border overflow-hidden flex">
                    <div
                      className={cn(
                        "h-full transition-all duration-300",
                        betaSim.fTAboveMicPct >= betaSim.standardThresholdPct ? "bg-accent" : "bg-danger"
                      )}
                      style={{ width: `${Math.min(100, betaSim.fTAboveMicPct)}%` }}
                    />
                  </div>
                </div>

                {/* Critically ill 4x MIC bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted">
                      Critically Ill Target (fT &gt; 4x MIC, {(numBetaMic * 4).toFixed(1)} mcg/mL):{" "}
                      <strong className="text-fg">{betaSim.fTAbove4xMicPct}%</strong>
                    </span>
                    <span className="text-muted">Target: 100% of interval</span>
                  </div>
                  <div className="h-2 w-full rounded bg-surface border border-border overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-300",
                        betaSim.criticalIllTargetAchieved ? "bg-accent" : "bg-warning"
                      )}
                      style={{ width: `${Math.min(100, betaSim.fTAbove4xMicPct)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Comparative Analysis Matrix */}
              {betaSim.comparisonVsBolus ? (
                <div className="rounded border border-accent/40 bg-accent-soft/15 p-3 space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5 text-accent font-semibold">
                    <Zap className="h-3.5 w-3.5" />
                    <span>Prolonged Infusion Gain Comparison (Same Total Daily Dose)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-2 rounded bg-surface border border-border">
                      <span className="text-muted block text-[10px]">Standard 30-min Bolus</span>
                      <span className="text-fg font-mono font-bold text-sm">
                        {betaSim.comparisonVsBolus.standardBolusPct}% fT &gt; MIC
                      </span>
                    </div>
                    <div className="p-2 rounded bg-surface border border-border">
                      <span className="text-muted block text-[10px]">Extended / Continuous Infusion</span>
                      <span className="text-accent font-mono font-bold text-sm">
                        {betaSim.comparisonVsBolus.extendedInfusionPct}% fT &gt; MIC
                      </span>
                    </div>
                    <div className="p-2 rounded bg-surface border border-border">
                      <span className="text-muted block text-[10px]">Absolute Pharmacodynamic Gain</span>
                      <span className="text-fg font-mono font-bold text-sm">
                        +{betaSim.comparisonVsBolus.gainPct}% interval coverage
                      </span>
                    </div>
                  </div>
                  <p className="text-muted leading-relaxed">
                    Extended infusion maintains plasma levels above pathogen MIC throughout the dosing interval without increasing daily drug exposure or nephrotoxicity risk.
                  </p>
                </div>
              ) : null}

              {/* PK Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="rounded border border-border bg-surface-sunken p-2">
                  <span className="text-muted block text-[10px]">Steady-State Peak (Cmax)</span>
                  <span className="text-fg font-mono font-bold">{betaSim.cMaxSsUgMl} mcg/mL</span>
                  <span className="text-muted block text-[9px]">Free: {betaSim.freeCMaxSsUgMl} mcg/mL</span>
                </div>
                <div className="rounded border border-border bg-surface-sunken p-2">
                  <span className="text-muted block text-[10px]">Steady-State Trough (Cmin)</span>
                  <span className="text-fg font-mono font-bold">{betaSim.cMinSsUgMl} mcg/mL</span>
                  <span className="text-muted block text-[9px]">Free: {betaSim.freeCMinSsUgMl} mcg/mL</span>
                </div>
                <div className="rounded border border-border bg-surface-sunken p-2">
                  <span className="text-muted block text-[10px]">Elimination Half-Life</span>
                  <span className="text-fg font-mono font-bold">{betaSim.halfLifeHours} hours</span>
                  <span className="text-muted block text-[9px]">ke: {betaSim.ke} /h</span>
                </div>
                <div className="rounded border border-border bg-surface-sunken p-2">
                  <span className="text-muted block text-[10px]">Total Clearance</span>
                  <span className="text-fg font-mono font-bold">{betaSim.clearanceLPerHr} L/h</span>
                  <span className="text-muted block text-[9px]">Vd: {betaSim.volumeDistributionL} L</span>
                </div>
              </div>
            </div>
          ) : null}

          {/* 1B: Aminoglycoside Concentration-Dependent (Cmax / MIC) Simulator */}
          {pkModalType === "concentration_dependent" ? (
            <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                <div>
                  <h3 className="font-serif font-bold text-sm text-fg">
                    Aminoglycoside Concentration-Dependent Kinetics (Hartford Nomogram 7 mg/kg)
                  </h3>
                  <p className="text-muted text-[11px]">
                    Exploits concentration-dependent bactericidal killing (target Cmax / MIC &gt;= 8–10:1) and post-antibiotic effect (PAE).
                    Extended-interval dosing allows lysosomal exocytosis and renal cortical wash-out (target trough &lt; 0.5–1.0 mcg/mL).
                  </p>
                </div>
                <Badge tone={agSim.peakTargetAchieved ? "ok" : "warn"}>
                  {agSim.peakTargetAchieved ? "Cmax/MIC >= 8:1 Met" : "Sub-Peak Exposure"}
                </Badge>
              </div>

              {/* Patient Demographics & Dosing Weight Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-[11px]">
                <div>
                  <label className="block text-muted font-medium mb-1">Aminoglycoside</label>
                  <select
                    value={agAgent}
                    onChange={(e) => {
                      const a = e.target.value as "gentamicin" | "tobramycin" | "amikacin";
                      setAgAgent(a);
                      setAgDosePerKg(a === "amikacin" ? "15" : "7");
                      setAgMic(a === "amikacin" ? "4.0" : "1.0");
                    }}
                    className="w-full h-8 rounded border border-border bg-surface-sunken px-2 text-xs text-fg font-medium"
                  >
                    <option value="gentamicin">Gentamicin (7 mg/kg)</option>
                    <option value="tobramycin">Tobramycin (7 mg/kg)</option>
                    <option value="amikacin">Amikacin (15 mg/kg)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">Actual Weight (kg)</label>
                  <Input
                    type="number"
                    value={agWeight}
                    onChange={(e) => setAgWeight(e.target.value)}
                    className="h-8 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">Height (cm) &amp; Sex</label>
                  <div className="flex gap-1">
                    <Input
                      type="number"
                      value={agHeight}
                      onChange={(e) => setAgHeight(e.target.value)}
                      className="h-8 font-mono text-xs w-20"
                    />
                    <select
                      value={agSex}
                      onChange={(e) => setAgSex(e.target.value as "male" | "female")}
                      className="h-8 rounded border border-border bg-surface-sunken px-2 text-xs text-fg"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">Pathogen MIC (mcg/mL)</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={agMic}
                    onChange={(e) => setAgMic(e.target.value)}
                    className="h-8 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Dosing Weight Calculation Banner */}
              <div className="rounded border border-border bg-surface-sunken p-3 text-[11px] grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-muted block text-[10px]">Ideal Body Weight (IBW)</span>
                  <span className="text-fg font-mono font-bold">{agSim.ibwKg} kg</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px]">Adjusted Body Weight (AdjBW 0.4)</span>
                  <span className="text-fg font-mono font-bold">{agSim.adjBwKg} kg</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px]">Selected Dosing Weight</span>
                  <span className="text-accent font-mono font-bold">
                    {agSim.dosingWeightKg} kg ({agSim.dosingWeightType.toUpperCase()})
                  </span>
                </div>
                <div>
                  <span className="text-muted block text-[10px]">Recommended Hartford Dose</span>
                  <span className="text-fg font-mono font-bold text-sm">
                    {agSim.recommendedDoseMg} mg ({agSim.dosePerKgUsed} mg/kg)
                  </span>
                </div>
              </div>

              {/* Peak-to-MIC Ratio and Nomogram Panel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div className="rounded border border-border bg-surface p-3 space-y-2">
                  <span className="font-semibold text-fg block">Peak Concentration &amp; Bactericidal Ratio</span>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Estimated Peak (Cmax):</span>
                    <strong className="text-fg font-mono text-sm">{agSim.estimatedPeakUgMl} mcg/mL</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Peak-to-MIC Ratio:</span>
                    <strong className={cn("font-mono text-sm", agSim.peakTargetAchieved ? "text-accent" : "text-warning")}>
                      {agSim.peakToMicRatio}:1 (Target &gt;= 8–10:1)
                    </strong>
                  </div>
                  <p className="text-muted text-[10px] leading-relaxed">{agSim.lysosomalSaturationPearl}</p>
                </div>

                <div className="rounded border border-border bg-surface p-3 space-y-2">
                  <span className="font-semibold text-fg block">Hartford Nomogram Random Level (6–14h)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-muted text-[10px] block">Draw Time (h post-start):</label>
                      <Input
                        type="number"
                        min="6"
                        max="14"
                        value={agDrawHour}
                        onChange={(e) => setAgDrawHour(e.target.value)}
                        className="h-7 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-muted text-[10px] block">Measured Level (mcg/mL):</label>
                      <Input
                        type="number"
                        step="0.5"
                        value={agSerumLevel}
                        onChange={(e) => setAgSerumLevel(e.target.value)}
                        className="h-7 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-muted">Nomogram Dosing Interval:</span>
                    <Badge
                      tone={
                        agSim.nomogramInterval === "q24h"
                          ? "ok"
                          : agSim.nomogramInterval === "q36h"
                          ? "info"
                          : agSim.nomogramInterval === "q48h"
                          ? "warn"
                          : "danger"
                      }
                      className="font-mono text-xs uppercase"
                    >
                      {agSim.nomogramInterval ?? "Enter Level"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* 1C: Vancomycin Exposure-Dependent (AUC24 / MIC) Simulator */}
          {pkModalType === "exposure_dependent" ? (
            <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                <div>
                  <h3 className="font-serif font-bold text-sm text-fg">
                    Vancomycin Exposure-Dependent Consensus Targeting (AUC24 / MIC)
                  </h3>
                  <p className="text-muted text-[11px]">
                    2020 IDSA/ASHP consensus guidelines mandate AUC24/MIC target of 400–600 mg*h/L.
                    Trough-only monitoring (15–20 mcg/mL) is strictly abandoned due to doubled acute kidney injury rates.
                  </p>
                </div>
                <Badge
                  tone={
                    vancoSim.band === "target"
                      ? "ok"
                      : vancoSim.band === "subtherapeutic"
                      ? "warn"
                      : "danger"
                  }
                >
                  {vancoSim.band === "target"
                    ? "Target AUC 400-600"
                    : vancoSim.band === "subtherapeutic"
                    ? "Subtherapeutic (<400)"
                    : "Nephrotoxic (>600)"}
                </Badge>
              </div>

              {/* Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-[11px]">
                <div>
                  <label className="block text-muted font-medium mb-1">Total Daily Dose (mg/24h)</label>
                  <Input
                    type="number"
                    step="250"
                    value={vancoDailyDose}
                    onChange={(e) => setVancoDailyDose(e.target.value)}
                    className="h-8 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">Estimated CrCl (mL/min)</label>
                  <Input
                    type="number"
                    step="10"
                    value={vancoCrCl}
                    onChange={(e) => setVancoCrCl(e.target.value)}
                    className="h-8 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">BMD Pathogen MIC (mcg/mL)</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={vancoMic}
                    onChange={(e) => setVancoMic(e.target.value)}
                    className="h-8 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-muted font-medium mb-1">Optional Trough (mcg/mL)</label>
                  <Input
                    type="number"
                    step="1"
                    value={vancoTrough}
                    onChange={(e) => setVancoTrough(e.target.value)}
                    className="h-8 font-mono text-xs"
                  />
                </div>
              </div>

              {/* AUC Gauge and Nephrotoxicity Metric */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                <div className="rounded border border-border bg-surface-sunken p-3 space-y-1">
                  <span className="text-muted block text-[10px]">Estimated Vancomycin Clearance</span>
                  <span className="text-fg font-mono font-bold text-sm">
                    {vancoSim.estimatedClearanceLPerHr} L/h
                  </span>
                  <span className="text-muted text-[10px] block">Rybak/Matzke model</span>
                </div>

                <div className="rounded border border-border bg-surface-sunken p-3 space-y-1">
                  <span className="text-muted block text-[10px]">24-Hour Area Under Curve (AUC24)</span>
                  <span
                    className={cn(
                      "font-mono font-bold text-sm",
                      vancoSim.band === "target"
                        ? "text-accent"
                        : vancoSim.band === "subtherapeutic"
                        ? "text-warning"
                        : "text-danger"
                    )}
                  >
                    {vancoSim.estimatedAuc24} mg*h/L (AUC/MIC {vancoSim.aucToMicRatio})
                  </span>
                  <span className="text-muted text-[10px] block">Target: 400–600 mg*h/L</span>
                </div>

                <div className="rounded border border-border bg-surface-sunken p-3 space-y-1">
                  <span className="text-muted block text-[10px]">Nephrotoxicity / AKI Risk Multiplier</span>
                  <span
                    className={cn(
                      "font-mono font-bold text-sm",
                      vancoSim.nephrotoxicityRisk === "standard"
                        ? "text-fg"
                        : vancoSim.nephrotoxicityRisk === "elevated"
                        ? "text-warning"
                        : "text-danger"
                    )}
                  >
                    {vancoSim.akiOddsRatio}x Baseline AKI Odds
                  </span>
                  <span className="text-muted text-[10px] block">Doubles when AUC &gt; 650 mg*h/L</span>
                </div>
              </div>

              {/* Trough warning banner */}
              {vancoSim.troughWarning ? (
                <div className="rounded border border-warning/40 bg-warning-soft/20 p-3 space-y-1 text-[11px]">
                  <div className="flex items-center gap-1.5 text-warning font-semibold">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Consensus Trough-Only Warning</span>
                  </div>
                  <p className="text-fg leading-relaxed">{vancoSim.troughWarning}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ==================================================================== */}
      {/* TAB 2: ARCTIC AUGMENTED RENAL CLEARANCE (ARC) CALCULATOR              */}
      {/* ==================================================================== */}
      {stationTab === "arc" ? (
        <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
            <div>
              <h3 className="font-serif font-bold text-sm text-fg flex items-center gap-2">
                <Flame className="h-4 w-4 text-danger" />
                ARCTIC Augmented Renal Clearance (ARC) Prediction Model
              </h3>
              <p className="text-muted text-[11px]">
                Augmented Renal Clearance (&gt; 130–140 mL/min/1.73m2) causes massive accelerated elimination of hydrophilic
                antibiotics (beta-lactams, vancomycin, aminoglycosides), precipitating 50–80% subtherapeutic plasma concentrations.
              </p>
            </div>
            <Badge tone={arcResult.isHighRiskArc ? "danger" : "ok"} className="text-xs font-mono uppercase">
              ARCTIC Score: {arcResult.totalScore}/10 ({arcResult.isHighRiskArc ? "HIGH RISK OF ARC" : "Standard GFR"})
            </Badge>
          </div>

          {/* Interactive ARCTIC Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[11px]">
            <div className="rounded border border-border bg-surface-sunken p-3 space-y-2">
              <span className="font-semibold text-fg block">1. Patient Age (Points: {arcResult.agePoints})</span>
              <Input
                type="number"
                min="16"
                max="100"
                value={arcAge}
                onChange={(e) => setArcAge(Number(e.target.value) || 30)}
                className="h-8 font-mono text-xs"
              />
              <span className="text-[10px] text-muted block">
                &lt; 50 years: 6 pts | 50–75 years: 3 pts | &gt; 75 years: 0 pts
              </span>
            </div>

            <div className="rounded border border-border bg-surface-sunken p-3 space-y-2">
              <span className="font-semibold text-fg block">2. Trauma Status (Points: {arcResult.traumaPoints})</span>
              <button
                type="button"
                onClick={() => setArcTrauma(!arcTrauma)}
                className={cn(
                  "w-full h-8 rounded border text-xs font-medium transition-colors",
                  arcTrauma ? "border-danger bg-danger text-bg font-bold" : "border-border bg-surface text-muted"
                )}
              >
                {arcTrauma ? "Trauma / Burn / TBI Present (3 pts)" : "Non-Trauma Patient (0 pts)"}
              </button>
              <span className="text-[10px] text-muted block">
                Systemic inflammation drives hyperdynamic renal blood flow.
              </span>
            </div>

            <div className="rounded border border-border bg-surface-sunken p-3 space-y-2">
              <span className="font-semibold text-fg block">3. SOFA Score (Points: {arcResult.sofaPoints})</span>
              <Input
                type="number"
                min="0"
                max="24"
                value={arcSofa}
                onChange={(e) => setArcSofa(Number(e.target.value) || 0)}
                className="h-8 font-mono text-xs"
              />
              <span className="text-[10px] text-muted block">
                SOFA &lt;= 4: 1 pt (preserved end-organ reserve) | SOFA &gt; 4: 0 pts
              </span>
            </div>
          </div>

          {/* Critical ARC Clinical Trap Banner */}
          {arcResult.isHighRiskArc ? (
            <div className="rounded-md border border-danger/40 bg-danger-soft/20 p-4 space-y-2">
              <div className="flex items-center gap-2 text-danger font-semibold text-xs">
                <ShieldAlert className="h-4 w-4" />
                <span>CRITICAL CLINICAL TRAP: High Risk of Hydrophilic Antibiotic Treatment Failure</span>
              </div>
              <p className="text-fg text-[11px] leading-relaxed">
                {arcResult.hydrophilicAntibioticTrap}
              </p>
              <div className="pt-1">
                <span className="font-semibold text-fg text-[11px] block mb-1">
                  Recommended Dosing Adaptations:
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-muted">
                  {arcResult.recommendedDosingAdaptations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="rounded border border-border bg-surface-sunken p-3 text-[11px] text-muted">
              ARCTIC score &lt; 6. Normal or reduced glomerular filtration rate anticipated. Standard antimicrobial dosing intervals apply.
            </div>
          )}

          {/* Pathophysiology & Monitoring Guidance */}
          <div className="rounded border border-border bg-surface-sunken p-3 text-[11px] space-y-1">
            <span className="font-semibold text-fg block">Surrogate Clearance Limitations</span>
            <p className="text-muted leading-relaxed">{arcResult.monitoringGuidance}</p>
          </div>
        </div>
      ) : null}

      {/* ==================================================================== */}
      {/* TAB 3: HIGH-ALERT ORGAN SAFETY RAILS                                  */}
      {/* ==================================================================== */}
      {stationTab === "safety" ? (
        <div className="space-y-4">
          {/* Active Collisions Banner */}
          {report.organSafetyAlerts.length > 0 ? (
            <div className="rounded-md border border-danger/40 bg-danger-soft/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-danger font-semibold text-sm">
                <ShieldAlert className="h-4 w-4" />
                <span>Active High-Alert Antimicrobial Rails ({report.organSafetyAlerts.length})</span>
              </div>
              <div className="space-y-2">
                {report.organSafetyAlerts.map((alert, idx) => (
                  <div key={idx} className="rounded border border-danger/30 bg-surface p-3 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-fg">{alert.title}</span>
                      <Badge
                        tone={alert.severity === "critical" ? "danger" : alert.severity === "high" ? "warn" : "info"}
                        className="text-[10px] uppercase font-mono"
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-muted">{alert.mechanism}</p>
                    <p className="text-danger font-medium">{alert.action}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Section 1: Cefepime Neurotoxicity */}
          <section className="rounded-lg border border-border bg-surface p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
              <div>
                <h4 className="font-serif font-bold text-sm text-fg">
                  1. Cefepime Neurotoxicity &amp; GABA-A Competitive Antagonism
                </h4>
                <p className="text-muted text-[11px]">
                  Passes blood-brain barrier; competitive inhibition of postsynaptic GABA-A receptor chloride channels triggers NCSE.
                </p>
              </div>
              <Badge tone={cefepimeSafety.riskLevel === "critical" ? "danger" : cefepimeSafety.riskLevel === "high" ? "warn" : "ok"}>
                {cefepimeSafety.riskLevel.toUpperCase()} RISK
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
              <div>
                <label className="block text-muted font-medium mb-1">Estimated CrCl (mL/min)</label>
                <Input
                  type="number"
                  value={cefepimeCrCl}
                  onChange={(e) => setCefepimeCrCl(e.target.value)}
                  className="h-8 font-mono text-xs"
                />
                <span className="text-[10px] text-muted block mt-0.5">Threshold: &lt; 50 mL/min triggers neurotoxicity</span>
              </div>

              <div>
                <label className="block text-muted font-medium mb-1">Hemodialysis Status</label>
                <button
                  type="button"
                  onClick={() => setCefepimeIsDialysis(!cefepimeIsDialysis)}
                  className={cn(
                    "w-full h-8 rounded border text-xs font-medium transition-colors",
                    cefepimeIsDialysis ? "border-accent bg-accent text-accent-fg font-bold" : "border-border bg-surface-sunken text-muted"
                  )}
                >
                  {cefepimeIsDialysis ? "Intermittent Hemodialysis (~70% Removed)" : "Non-Dialysis Patient"}
                </button>
              </div>

              <div className="rounded border border-border bg-surface-sunken p-2.5 space-y-1">
                <span className="font-semibold text-fg block">EEG Signature</span>
                <p className="text-muted text-[10px]">{cefepimeSafety.eegFindings.pattern}</p>
              </div>
            </div>

            <div className="rounded border border-border bg-surface-sunken p-3 text-[11px] space-y-1">
              <span className="font-semibold text-fg block">Clinical Spectrum</span>
              <ul className="list-disc list-inside text-muted space-y-0.5">
                {cefepimeSafety.clinicalSpectrum.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </section>

          {/* Section 2: Linezolid MAO & Chronotoxicity */}
          <section className="rounded-lg border border-border bg-surface p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
              <div>
                <h4 className="font-serif font-bold text-sm text-fg">
                  2. Linezolid / Tedizolid Reversible MAOI &amp; Mitochondrial Chronotoxicity
                </h4>
                <p className="text-muted text-[11px]">
                  Weak, reversible non-selective MAO-A/B inhibition triggers serotonin syndrome and tyramine pressor crises.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-muted text-[11px]">Days on Therapy:</label>
                <Input
                  type="number"
                  value={linezolidDays}
                  onChange={(e) => setLinezolidDays(Math.max(1, Number(e.target.value) || 1))}
                  className="h-7 w-16 font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
              <div
                className={cn(
                  "rounded border p-3 space-y-1",
                  linezolidSafety.serotoninCollisionPresent ? "border-danger bg-danger-soft/15" : "border-border bg-surface-sunken"
                )}
              >
                <span className="font-semibold text-fg block">Serotonin Syndrome Risk</span>
                <p className="text-muted">
                  {linezolidSafety.serotoninCollisionPresent
                    ? `CRITICAL COLLISION: Co-administered with ${linezolidSafety.collidingSerotonergicDrugs.join(", ")}. Hunter toxicity risk.`
                    : "No interacting serotonergic drug detected on desk."}
                </p>
              </div>

              <div
                className={cn(
                  "rounded border p-3 space-y-1",
                  linezolidSafety.myelosuppressionWarning ? "border-warning bg-warning-soft/15" : "border-border bg-surface-sunken"
                )}
              >
                <span className="font-semibold text-fg block">Myelosuppression (&gt;= 14 Days)</span>
                <p className="text-muted">
                  {linezolidSafety.myelosuppressionWarning
                    ? "ALERT: Duration >= 14d. Mitochondrial 16S rRNA inhibition causes thrombocytopenia and anemia. Weekly CBC required."
                    : "Duration < 14d. Low risk of bone marrow suppression."}
                </p>
              </div>

              <div
                className={cn(
                  "rounded border p-3 space-y-1",
                  linezolidSafety.neuropathyWarning ? "border-danger bg-danger-soft/15" : "border-border bg-surface-sunken"
                )}
              >
                <span className="font-semibold text-fg block">Neuropathies (&gt; 28 Days)</span>
                <p className="text-muted">
                  {linezolidSafety.neuropathyWarning
                    ? "ALERT: Duration > 28d. High risk of irreversible optic neuropathy / blindness and peripheral neuropathy."
                    : "Duration < 28d. Low risk of neuropathies."}
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Daptomycin Safety */}
          <section className="rounded-lg border border-border bg-surface p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
              <div>
                <h4 className="font-serif font-bold text-sm text-fg">
                  3. Daptomycin Pulmonary Surfactant &amp; Sarcolemmal Myopathy Rails
                </h4>
                <p className="text-muted text-[11px]">
                  Rapid bactericidal membrane depolarization; irreversibly bound and inactivated by surfactant DPPC.
                </p>
              </div>
              <Badge tone={daptoSafety.statinCollisionPresent ? "danger" : "ok"}>
                {daptoSafety.statinCollisionPresent ? "Mandatory Statin Hold" : "No Statin on Desk"}
              </Badge>
            </div>

            <div className="rounded border border-danger/40 bg-danger-soft/20 p-3 space-y-1 text-[11px]">
              <span className="text-danger font-bold block">Strict Contraindication in Pneumonia</span>
              <p className="text-fg leading-relaxed">{daptoSafety.surfactantContraindicationAlert}</p>
            </div>

            <div className="rounded border border-border bg-surface-sunken p-3 text-[11px] space-y-1">
              <span className="font-semibold text-fg block">CPK Discontinuation Thresholds</span>
              <p className="text-muted leading-relaxed">
                Hold daptomycin if CPK &gt; {daptoSafety.discontinuationThresholds.symptomaticCpkU_L} U/L with symptoms (myalgia, weakness),
                or &gt; {daptoSafety.discontinuationThresholds.asymptomaticCpkU_L} U/L asymptomatic.
              </p>
            </div>
          </section>
        </div>
      ) : null}

      {/* ==================================================================== */}
      {/* TAB 4: STEWARDSHIP CLINICAL PEARLS & EVIDENCE                          */}
      {/* ==================================================================== */}
      {stationTab === "pearls" ? (
        <div className="space-y-4">
          <section className="rounded-lg border border-accent/30 bg-accent-soft/15 p-4 space-y-3">
            <div className="flex items-center gap-2 text-accent font-semibold text-xs">
              <Sparkles className="h-4 w-4" />
              <span>Infectious Disease &amp; Antimicrobial Pharmacotherapy Pearls</span>
            </div>
            <ul className="list-disc list-inside space-y-2 text-[11px] text-muted leading-relaxed">
              {report.stewardshipPearls.map((pearl, i) => (
                <li key={i}>{pearl}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-border bg-surface p-4 space-y-2">
            <span className="font-semibold text-fg text-xs block">Peer-Reviewed Consensus Literature</span>
            <ul className="list-decimal list-inside space-y-1 text-[10px] text-muted leading-relaxed">
              {ANTIMICROBIAL_KINETICS_CITATIONS.map((cit, i) => (
                <li key={i}>{cit}</li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}

      {/* Statutory Regulatory Notice Footer */}
      <div className="rounded bg-surface-sunken p-3 text-[10px] text-muted leading-relaxed border border-border space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-fg">
          <Info className="h-3.5 w-3.5 text-accent" />
          <span>FD&amp;C Act &sect; 520(o)(1)(E) Non-Device Clinical Decision Support Regulatory Notice:</span>
        </div>
        <p>{ANTIMICROBIAL_KINETICS_REGULATORY_NOTICE}</p>
      </div>
    </div>
  );
}
