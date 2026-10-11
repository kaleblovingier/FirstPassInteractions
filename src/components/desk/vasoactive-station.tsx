import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Droplets,
  Flame,
  Heart,
  HeartPulse,
  Info,
  Layers,
  Scale,
  ShieldAlert,
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
  VASOACTIVE_AGENTS,
  NOT_CLEARED,
  PI_FOOTER,
  evaluateScaiShockStage,
  evaluateEpinephrineLactate,
  compareInotropeRenalClearance,
  getPhentolamineExtravasationProtocol,
  vasoactiveOnDesk,
  vasoactiveReportOnDesk,
  type VasoactiveAgentDef,
  type ShockParameters,
} from "@/lib/drugs/vasoactive-kinetics";

export interface VasoactiveStationProps {
  ids: string[];
  host: HostContext;
}

export function VasoactiveStation({ ids, host }: VasoactiveStationProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>("norepinephrine");
  const [sbp, setSbp] = useState<number>(85);
  const [map, setMap] = useState<number>(58);
  const [hr, setHr] = useState<number>(110);
  const [lactate, setLactate] = useState<number>(3.2);
  const [scvO2, setScvO2] = useState<number>(62);
  const [urineOutput, setUrineOutput] = useState<number>(20);
  const [onMechanicalSupport, setOnMechanicalSupport] = useState<boolean>(false);
  const [cardiacArrestOrCPR, setCardiacArrestOrCPR] = useState<boolean>(false);
  const [arterialPh, setArterialPh] = useState<number>(7.32);
  const [patientCrCl, setPatientCrCl] = useState<number>(host.egfr ?? 25);
  const [activeTab, setActiveTab] = useState<"scai" | "receptors" | "lactate" | "renal" | "extravasation">("scai");

  const detection = useMemo(() => vasoactiveOnDesk(ids), [ids.join("|")]);

  const shockParams: ShockParameters = useMemo(
    () => ({
      sbp,
      map,
      heartRate: hr,
      lactate,
      scvO2,
      urineOutputMlPerHour: urineOutput,
      vasoactiveAgentCount: detection.detectedAgents.length > 0 ? detection.detectedAgents.length : 1,
      onMechanicalSupport,
      cardiacArrestOrCPR,
      refractoryAcidosis: arterialPh < 7.2 && lactate >= 8.0,
    }),
    [sbp, map, hr, lactate, scvO2, urineOutput, detection.detectedAgents.length, onMechanicalSupport, cardiacArrestOrCPR, arterialPh],
  );

  const scaiResult = useMemo(() => evaluateScaiShockStage(shockParams), [shockParams]);

  const lactateResult = useMemo(
    () =>
      evaluateEpinephrineLactate({
        lactate,
        epinephrineActive: detection.hasEpinephrine || selectedAgentId === "epinephrine",
        arterialPh,
        scvO2,
        urineOutputAdequate: urineOutput >= 30,
      }),
    [lactate, detection.hasEpinephrine, selectedAgentId, arterialPh, scvO2, urineOutput],
  );

  const inotropeRenalResult = useMemo(() => compareInotropeRenalClearance(patientCrCl), [patientCrCl]);
  const extravasationProtocol = useMemo(() => getPhentolamineExtravasationProtocol(), []);

  const selectedAgent: VasoactiveAgentDef = VASOACTIVE_AGENTS[selectedAgentId] ?? VASOACTIVE_AGENTS.norepinephrine;

  return (
    <div className="space-y-6 text-foreground">
      {/* Statutory Header */}
      <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
              <HeartPulse className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight">Vasoactive Hemodynamics & Shock Station</h2>
                <Badge tone="default" className="text-[10px] font-mono">
                  SCAI 2022 Consensus
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Inotrope, vasopressor, and inodilator kinetics, quantitative adrenoceptor selectivity, and shock staging
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {detection.hasVasoactive ? (
              <Badge tone="accent" className="gap-1 font-mono text-xs">
                <Activity className="size-3" />
                {detection.detectedAgents.length} Active on Tray
              </Badge>
            ) : (
              <Badge tone="default" className="text-xs">
                Tray: Reference Mode
              </Badge>
            )}
            <Badge
              tone={
                scaiResult.stage === "E"
                  ? "danger"
                  : scaiResult.stage === "D"
                  ? "danger"
                  : scaiResult.stage === "C"
                  ? "warn"
                  : scaiResult.stage === "B"
                  ? "info"
                  : "ok"
              }
              className="text-xs font-semibold"
            >
              {scaiResult.label}
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

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
        <Button
          variant={activeTab === "scai" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("scai")}
          className="gap-1.5 text-xs"
        >
          <Activity className="size-3.5" />
          SCAI Shock Staging
        </Button>
        <Button
          variant={activeTab === "receptors" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("receptors")}
          className="gap-1.5 text-xs"
        >
          <Layers className="size-3.5" />
          Receptor Selectivity Matrix
        </Button>
        <Button
          variant={activeTab === "lactate" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("lactate")}
          className="gap-1.5 text-xs"
        >
          <Flame className="size-3.5" />
          Epi Type B Lactate Evaluator
        </Button>
        <Button
          variant={activeTab === "renal" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("renal")}
          className="gap-1.5 text-xs"
        >
          <Scale className="size-3.5" />
          Milrinone vs Dobutamine Renal Trap
        </Button>
        <Button
          variant={activeTab === "extravasation" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("extravasation")}
          className="gap-1.5 text-xs"
        >
          <Syringe className="size-3.5" />
          Phentolamine Extravasation
        </Button>
      </div>

      {/* TAB 1: SCAI Shock Staging */}
      {activeTab === "scai" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Inputs Column */}
          <div className="space-y-4 rounded-xl border border-border/80 bg-card p-5 lg:col-span-1">
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <Activity className="size-4 text-primary" /> Hemodynamic & Perfusion Inputs
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground">Systolic BP (mmHg)</label>
                <Input
                  type="number"
                  value={sbp}
                  onChange={(e) => setSbp(Number(e.target.value))}
                  className="mt-1 h-8 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-muted-foreground">Mean Arterial Pressure MAP (mmHg)</label>
                <Input
                  type="number"
                  value={map}
                  onChange={(e) => setMap(Number(e.target.value))}
                  className="mt-1 h-8 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-muted-foreground">Heart Rate (bpm)</label>
                <Input
                  type="number"
                  value={hr}
                  onChange={(e) => setHr(Number(e.target.value))}
                  className="mt-1 h-8 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-muted-foreground">Serum Lactate (mmol/L)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={lactate}
                  onChange={(e) => setLactate(Number(e.target.value))}
                  className="mt-1 h-8 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-muted-foreground">Central Venous Oxygen Sat ScvO2 (%)</label>
                <Input
                  type="number"
                  value={scvO2}
                  onChange={(e) => setScvO2(Number(e.target.value))}
                  className="mt-1 h-8 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-muted-foreground">Hourly Urine Output (mL/h)</label>
                <Input
                  type="number"
                  value={urineOutput}
                  onChange={(e) => setUrineOutput(Number(e.target.value))}
                  className="mt-1 h-8 font-mono text-xs"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={onMechanicalSupport}
                    onChange={(e) => setOnMechanicalSupport(e.target.checked)}
                    className="size-3.5 rounded border-border"
                  />
                  <span>Mechanical Support (IABP / Impella / ECMO)</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={cardiacArrestOrCPR}
                    onChange={(e) => setCardiacArrestOrCPR(e.target.checked)}
                    className="size-3.5 rounded border-border"
                  />
                  <span>Ongoing CPR / Post-Cardiac Arrest</span>
                </label>
              </div>
            </div>
          </div>

          {/* Results Column */}
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-xl border border-border/80 bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{scaiResult.label}</span>
                  <Badge
                    tone={
                      scaiResult.stage === "E"
                        ? "danger"
                        : scaiResult.stage === "D"
                        ? "danger"
                        : scaiResult.stage === "C"
                        ? "warn"
                        : scaiResult.stage === "B"
                        ? "info"
                        : "ok"
                    }
                  >
                    Mortality: {scaiResult.mortalityRiskTier}
                  </Badge>
                </div>
              </div>

              <p className="mt-2 text-xs text-muted-foreground">{scaiResult.description}</p>

              {/* Criteria Met */}
              <div className="mt-4 rounded-lg bg-muted/40 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Physiological Criteria Satisfied
                </h4>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {scaiResult.criteriaMet.map((c, i) => (
                    <li key={i} className="flex items-center gap-2 text-foreground">
                      <CheckCircle2 className="size-3.5 text-primary" /> {c}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommended Monitoring */}
              <div className="mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Invasive Hemodynamic & Telemetry Recommendations
                </h4>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {scaiResult.recommendedMonitoring.map((rec, i) => (
                    <div key={i} className="rounded-lg border border-border/60 bg-background/50 p-2.5 text-xs">
                      <p className="font-medium text-foreground">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Literature Citations */}
              <div className="mt-5 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                <span className="font-medium">Evidence Base:</span> {scaiResult.citations.join(" | ")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Receptor Selectivity Matrix */}
      {activeTab === "receptors" && (
        <div className="space-y-6">
          {/* Agent Selector Pills */}
          <div className="flex flex-wrap gap-2">
            {Object.values(VASOACTIVE_AGENTS).map((agent) => (
              <Button
                key={agent.id}
                variant={selectedAgentId === agent.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAgentId(agent.id)}
                className="gap-1.5 text-xs font-mono"
              >
                {agent.name.split(" ")[0]}
                <Badge tone="default" className="text-[10px]">
                  {agent.class}
                </Badge>
              </Button>
            ))}
          </div>

          {/* Selected Agent Deep Dive */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Receptor Bars */}
            <div className="rounded-xl border border-border/80 bg-card p-5 lg:col-span-1">
              <h3 className="text-sm font-semibold tracking-tight">{selectedAgent.name}</h3>
              <p className="text-xs text-muted-foreground">{selectedAgent.receptorProfile.primaryMechanism}</p>

              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">α1 (Vasoconstriction / SVR)</span>
                    <span className="font-mono">{selectedAgent.receptorProfile.alpha1}/4</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-red-500 transition-all"
                      style={{ width: `${(selectedAgent.receptorProfile.alpha1 / 4) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">β1 (Inotropy / HR / MVO2)</span>
                    <span className="font-mono">{selectedAgent.receptorProfile.beta1}/4</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-amber-500 transition-all"
                      style={{ width: `${(selectedAgent.receptorProfile.beta1 / 4) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">β2 (Vasodilation / Bronchodilation)</span>
                    <span className="font-mono">{selectedAgent.receptorProfile.beta2}/4</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${(selectedAgent.receptorProfile.beta2 / 4) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">V1a (Arteriolar Non-Adrenergic)</span>
                    <span className="font-mono">{selectedAgent.receptorProfile.v1a}/4</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-purple-500 transition-all"
                      style={{ width: `${(selectedAgent.receptorProfile.v1a / 4) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">DA1 (Renal / Splanchnic)</span>
                    <span className="font-mono">{selectedAgent.receptorProfile.da1}/4</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${(selectedAgent.receptorProfile.da1 / 4) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">AT1 (Angiotensin II Gq)</span>
                    <span className="font-mono">{selectedAgent.receptorProfile.at1}/4</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-cyan-500 transition-all"
                      style={{ width: `${(selectedAgent.receptorProfile.at1 / 4) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Hemodynamic Profiles & Safety Warnings */}
            <div className="space-y-4 lg:col-span-2">
              <div className="rounded-xl border border-border/80 bg-card p-5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Expected Directional Hemodynamic Response
                </h4>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <div className="rounded-lg border border-border/60 bg-muted/40 p-2.5 text-center">
                    <div className="text-[10px] uppercase text-muted-foreground">MAP</div>
                    <div className="mt-1 font-mono text-sm font-semibold capitalize">
                      {selectedAgent.receptorProfile.hemodynamicEffect.map}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/40 p-2.5 text-center">
                    <div className="text-[10px] uppercase text-muted-foreground">SVR</div>
                    <div className="mt-1 font-mono text-sm font-semibold capitalize">
                      {selectedAgent.receptorProfile.hemodynamicEffect.svr}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/40 p-2.5 text-center">
                    <div className="text-[10px] uppercase text-muted-foreground">Cardiac Output</div>
                    <div className="mt-1 font-mono text-sm font-semibold capitalize">
                      {selectedAgent.receptorProfile.hemodynamicEffect.co}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/40 p-2.5 text-center">
                    <div className="text-[10px] uppercase text-muted-foreground">Heart Rate</div>
                    <div className="mt-1 font-mono text-sm font-semibold capitalize">
                      {selectedAgent.receptorProfile.hemodynamicEffect.hr}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/40 p-2.5 text-center">
                    <div className="text-[10px] uppercase text-muted-foreground">MVO2 Demand</div>
                    <div className="mt-1 font-mono text-sm font-semibold capitalize">
                      {selectedAgent.receptorProfile.hemodynamicEffect.mvo2}
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Pharmacokinetic & Clearance Dynamics
                  </h4>
                  <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                    <div className="rounded-lg bg-muted/30 p-2.5">
                      <span className="font-medium text-foreground">Onset / Half-Life:</span>{" "}
                      {selectedAgent.onsetMinutes} min onset · {selectedAgent.halfLifeMinutes} min t1/2
                    </div>
                    <div className="rounded-lg bg-muted/30 p-2.5">
                      <span className="font-medium text-foreground">Renal Elimination Fraction:</span>{" "}
                      {Math.round(selectedAgent.renalClearanceFraction * 100)}% unchanged
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{selectedAgent.metabolismAndClearance}</p>
                </div>

                <div className="mt-5 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Critical Safety Alerts
                  </h4>
                  {selectedAgent.keySafetyAlerts.map((alert, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-amber-200">
                      <AlertTriangle className="size-4 shrink-0 text-amber-400" />
                      <span>{alert}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Epinephrine Type B Lactate Evaluator */}
      {activeTab === "lactate" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-border/80 bg-card p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <Flame className="size-4 text-amber-400" /> Epinephrine Aerobic Lactate Diagnostic Aid
            </h3>
            <p className="text-xs text-muted-foreground">
              Differentiates benign beta-2 stimulated aerobic glycogenolysis from true anaerobic tissue hypoperfusion.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground">Serum Lactate (mmol/L)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={lactate}
                  onChange={(e) => setLactate(Number(e.target.value))}
                  className="mt-1 h-8 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-muted-foreground">Arterial pH</label>
                <Input
                  type="number"
                  step="0.01"
                  value={arterialPh}
                  onChange={(e) => setArterialPh(Number(e.target.value))}
                  className="mt-1 h-8 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-muted-foreground">Central Venous Oxygen Saturation ScvO2 (%)</label>
                <Input
                  type="number"
                  value={scvO2}
                  onChange={(e) => setScvO2(Number(e.target.value))}
                  className="mt-1 h-8 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-muted-foreground">Hourly Urine Output (mL/h)</label>
                <Input
                  type="number"
                  value={urineOutput}
                  onChange={(e) => setUrineOutput(Number(e.target.value))}
                  className="mt-1 h-8 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-border/80 bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">{lactateResult.classification}</span>
              <Badge tone={lactateResult.isBenignMetabolicArtifact ? "accent" : "danger"}>
                {lactateResult.isBenignMetabolicArtifact ? "Aerobic Mechanism" : "Tissue Ischemia"}
              </Badge>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              {lactateResult.physiologicalRationale}
            </p>

            <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-xs">
              <h4 className="font-semibold text-foreground">Clinical Strategy</h4>
              <p className="mt-1 text-muted-foreground">{lactateResult.clinicalActionSummary}</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Milrinone vs Dobutamine Renal Failure Trap */}
      {activeTab === "renal" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border/80 bg-card p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold tracking-tight">
                  Inotrope Renal Elimination Dynamics: Milrinone vs Dobutamine
                </h3>
                <p className="text-xs text-muted-foreground">
                  Severe renal failure extends Milrinone half-life up to 10-fold, creating refractory vasodilation
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">CrCl (mL/min):</span>
                <Input
                  type="number"
                  value={patientCrCl}
                  onChange={(e) => setPatientCrCl(Number(e.target.value))}
                  className="h-8 w-24 font-mono text-xs"
                />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Milrinone Card */}
              <div
                className={cn(
                  "rounded-lg border p-4 text-xs space-y-2.5",
                  inotropeRenalResult.milrinone.accumulationRiskTier === "normal"
                    ? "border-border bg-card"
                    : "border-red-500/30 bg-red-500/5 text-red-200",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">Milrinone (Inodilator)</span>
                  <Badge
                    tone={inotropeRenalResult.milrinone.accumulationRiskTier === "normal" ? "ok" : "danger"}
                  >
                    t1/2 ~ {inotropeRenalResult.milrinone.estimatedHalfLifeHours} hrs
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  Elimination: 80–85% unchanged renal filtration. Normal t1/2 = 2.4 hours.
                </p>
                <p className="font-medium text-foreground">
                  Status: {inotropeRenalResult.milrinone.accumulationRiskTier}
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  {inotropeRenalResult.milrinone.doseAdjustmentRationale}
                </p>
              </div>

              {/* Dobutamine Card */}
              <div className="rounded-lg border border-border bg-card p-4 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">Dobutamine (Inotrope)</span>
                  <Badge tone="ok">t1/2 ~ 2 min</Badge>
                </div>
                <p className="text-muted-foreground">
                  Elimination: Rapid hepatic COMT metabolism to inactive 3-O-methyldobutamine. Zero renal accumulation.
                </p>
                <p className="font-medium text-foreground">
                  Status: {inotropeRenalResult.dobutamine.accumulationRiskTier}
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  {inotropeRenalResult.dobutamine.clinicalRecommendation}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Extravasation Phentolamine Protocol */}
      {activeTab === "extravasation" && (
        <div className="rounded-xl border border-border/80 bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Syringe className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">{extravasationProtocol.antidote}</h3>
              <p className="text-xs text-muted-foreground">
                Emergency competitive alpha-1 blockade for vasopressor peripheral IV extravasation ischemia
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-xs">
            <div className="rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="font-semibold text-foreground">Dose & Dilution:</span>{" "}
              {extravasationProtocol.doseAndPreparation}
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="font-semibold text-foreground">Infiltration Technique:</span>{" "}
              {extravasationProtocol.administrationTechnique}
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="font-semibold text-foreground">Therapeutic Window:</span> Administer within{" "}
              {extravasationProtocol.timeWindowHours} hours of extravasation for maximum tissue salvage.
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="font-semibold text-foreground">Topical Alternative:</span>{" "}
              {extravasationProtocol.alternativeAgent}
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="font-semibold text-foreground">Monitoring:</span>{" "}
              {extravasationProtocol.monitoringGuidance}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function VasoactivePanel({ ids, host }: VasoactiveStationProps) {
  return <VasoactiveStation ids={ids} host={host} />;
}
