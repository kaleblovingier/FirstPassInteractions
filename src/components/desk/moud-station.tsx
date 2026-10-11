import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
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
  OPIOID_RECEPTOR_AFFINITIES,
  NOT_CLEARED,
  PI_FOOTER,
  evaluatePrecipitatedWithdrawalRisk,
  BERNESE_PROTOCOL_SCHEDULE,
  calculateNaloxoneInfusion,
  getXylazineProtocol,
  moudOnDesk,
  moudReportOnDesk,
} from "@/lib/drugs/moud-kinetics";

export interface MoudStationProps {
  ids: string[];
  host: HostContext;
}

export function MoudStation({ ids, host }: MoudStationProps) {
  const [lastAgonist, setLastAgonist] = useState<"fentanyl" | "methadone" | "short-acting (oxycodone/heroin/morphine)">("fentanyl");
  const [hoursSinceLastUse, setHoursSinceLastUse] = useState<number>(12);
  const [cowsScore, setCowsScore] = useState<number>(8);
  const [inductionMethod, setInductionMethod] = useState<"traditional" | "bernese-micro-induction" | "high-dose-macro-induction">("traditional");
  const [selectedBerneseDay, setSelectedBerneseDay] = useState<number>(1);
  const [wakingNaloxoneBolus, setWakingNaloxoneBolus] = useState<number>(0.8);
  const [activeTab, setActiveTab] = useState<"withdrawal" | "bernese" | "affinity" | "naloxone" | "xylazine">("withdrawal");

  const detection = useMemo(() => moudOnDesk(ids), [ids.join("|")]);

  const withdrawalResult = useMemo(
    () =>
      evaluatePrecipitatedWithdrawalRisk({
        lastFullAgonistUsed: lastAgonist,
        hoursSinceLastUse,
        currentCowsScore: cowsScore,
        inductionApproach: inductionMethod,
      }),
    [lastAgonist, hoursSinceLastUse, cowsScore, inductionMethod],
  );

  const naloxonePlan = useMemo(
    () =>
      calculateNaloxoneInfusion({
        successfulBolusMg: wakingNaloxoneBolus,
        suspectedOpioid: lastAgonist === "fentanyl" ? "fentanyl" : lastAgonist === "methadone" ? "methadone" : "short-acting heroin/morphine",
      }),
    [wakingNaloxoneBolus, lastAgonist],
  );

  const xylazineProtocol = useMemo(() => getXylazineProtocol(), []);
  const currentBerneseStep = BERNESE_PROTOCOL_SCHEDULE[selectedBerneseDay - 1] ?? BERNESE_PROTOCOL_SCHEDULE[0];

  return (
    <div className="space-y-6 text-foreground">
      {/* Statutory Header */}
      <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400">
              <Pill className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight">Medications for Opioid Use Disorder (MOUD) & Harm Reduction</h2>
                <Badge tone="default" className="text-[10px] font-mono">
                  ASAM / SAMHSA
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Buprenorphine precipitated withdrawal kinetics, lipophilic fentanyl depot clearance, and Bernese titration
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {detection.hasMoud ? (
              <Badge tone="accent" className="gap-1 font-mono text-xs">
                <Activity className="size-3" />
                {detection.detectedAgents.join(", ")} Active
              </Badge>
            ) : (
              <Badge tone="default" className="text-xs">
                Tray: Reference Mode
              </Badge>
            )}
            <Badge
              tone={
                withdrawalResult.riskTier === "high"
                  ? "danger"
                  : withdrawalResult.riskTier === "moderate"
                  ? "warn"
                  : withdrawalResult.riskTier === "low"
                  ? "info"
                  : "ok"
              }
              className="text-xs font-semibold uppercase"
            >
              Risk: {withdrawalResult.riskTier}
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
          variant={activeTab === "withdrawal" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("withdrawal")}
          className="gap-1.5 text-xs"
        >
          <AlertTriangle className="size-3.5" />
          Precipitated Withdrawal Risk
        </Button>
        <Button
          variant={activeTab === "bernese" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("bernese")}
          className="gap-1.5 text-xs"
        >
          <Timer className="size-3.5" />
          Bernese Micro-Induction Schedule
        </Button>
        <Button
          variant={activeTab === "affinity" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("affinity")}
          className="gap-1.5 text-xs"
        >
          <Layers className="size-3.5" />
          Receptor Affinity & Efficacy
        </Button>
        <Button
          variant={activeTab === "naloxone" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("naloxone")}
          className="gap-1.5 text-xs"
        >
          <Syringe className="size-3.5" />
          Naloxone Renarcotization & Infusion
        </Button>
        <Button
          variant={activeTab === "xylazine" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("xylazine")}
          className="gap-1.5 text-xs"
        >
          <ShieldAlert className="size-3.5" />
          Xylazine ("Tranq") Protocol
        </Button>
      </div>

      {/* TAB 1: Precipitated Withdrawal Risk */}
      {activeTab === "withdrawal" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Inputs Column */}
          <div className="space-y-4 rounded-xl border border-border/80 bg-card p-5 lg:col-span-1">
            <h3 className="text-sm font-semibold tracking-tight">Clinical Induction Assessment</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground">Last Full-Agonist Opioid</label>
                <select
                  value={lastAgonist}
                  onChange={(e) => setLastAgonist(e.target.value as any)}
                  className="mt-1 w-full rounded-md border border-border bg-background p-2 text-xs"
                >
                  <option value="fentanyl">Fentanyl (Illicit / lipophilic adipose retention)</option>
                  <option value="methadone">Methadone (Long erratic half-life 24-36h)</option>
                  <option value="short-acting (oxycodone/heroin/morphine)">Short-Acting (Heroin / Oxycodone / Morphine)</option>
                </select>
              </div>

              <div>
                <label className="text-muted-foreground">Hours Since Last Opioid Consumption</label>
                <Input
                  type="number"
                  value={hoursSinceLastUse}
                  onChange={(e) => setHoursSinceLastUse(Number(e.target.value))}
                  className="mt-1 h-8 font-mono text-xs"
                />
              </div>

              <div>
                <div className="flex justify-between">
                  <label className="text-muted-foreground">Current COWS Score</label>
                  <span className="font-mono">{cowsScore} / 48</span>
                </div>
                <Input
                  type="range"
                  min="0"
                  max="36"
                  value={cowsScore}
                  onChange={(e) => setCowsScore(Number(e.target.value))}
                  className="mt-1.5"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Mild (5-12)</span>
                  <span className="font-medium text-amber-400">Target (12-13+)</span>
                  <span>Severe (25+)</span>
                </div>
              </div>

              <div>
                <label className="text-muted-foreground">Induction Strategy</label>
                <select
                  value={inductionMethod}
                  onChange={(e) => setInductionMethod(e.target.value as any)}
                  className="mt-1 w-full rounded-md border border-border bg-background p-2 text-xs"
                >
                  <option value="traditional">Traditional Induction (Requires COWS &gt;= 12)</option>
                  <option value="bernese-micro-induction">Bernese Micro-Induction (Overlapping sub-mg)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Column */}
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-xl border border-border/80 bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold capitalize">
                  Precipitated Withdrawal Risk: {withdrawalResult.riskTier}
                </span>
                <Badge
                  tone={
                    withdrawalResult.riskTier === "high"
                      ? "danger"
                      : withdrawalResult.riskTier === "moderate"
                      ? "warn"
                      : "ok"
                  }
                >
                  Score: {withdrawalResult.riskScore} / 10
                </Badge>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {withdrawalResult.receptorMechanism}
              </p>

              <div className="mt-4 rounded-lg bg-muted/40 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  COWS & Clinical Readiness Recommendation
                </h4>
                <p className="mt-1 text-xs text-foreground font-medium">
                  {withdrawalResult.cowsRecommendation}
                </p>
              </div>

              <div className="mt-4 rounded-lg border border-border/60 bg-background/50 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Alternative Clinical Strategy
                </h4>
                <p className="mt-1 text-xs text-foreground">
                  {withdrawalResult.alternativeStrategy}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Bernese Micro-Induction Schedule */}
      {activeTab === "bernese" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border/80 bg-card p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold tracking-tight">
                  Low-Dose "Bernese" Micro-Induction Titration Protocol
                </h3>
                <p className="text-xs text-muted-foreground">
                  Hämmig et al. (2016) · Overlapping sub-milligram buprenorphine while maintaining full-agonist therapy
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <Button
                    key={day}
                    variant={selectedBerneseDay === day ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedBerneseDay(day)}
                    className="size-8 p-0 text-xs font-mono"
                  >
                    D{day}
                  </Button>
                ))}
              </div>
            </div>

            {/* Selected Day Card */}
            <div className="mt-5 rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">Day {currentBerneseStep.day} Regimen</span>
                <Badge tone="accent">
                  ~{currentBerneseStep.estimatedReceptorOccupancyPercent}% μ-Receptor Occupancy
                </Badge>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-foreground">Buprenorphine Dose:</span>{" "}
                  <span className="font-mono text-teal-400">{currentBerneseStep.buprenorphineDose}</span>
                </div>
                <div>
                  <span className="font-semibold text-foreground">Full-Agonist Instruction:</span>{" "}
                  <span className="text-amber-300 font-medium">{currentBerneseStep.fullAgonistInstruction}</span>
                </div>
                <div>
                  <span className="font-semibold text-foreground">Clinical Pearl:</span>{" "}
                  <span className="text-muted-foreground">{currentBerneseStep.clinicalNote}</span>
                </div>
              </div>

              {/* Visual Occupancy Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Receptor Saturation Progress</span>
                  <span>{currentBerneseStep.estimatedReceptorOccupancyPercent}%</span>
                </div>
                <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-teal-500 transition-all"
                    style={{ width: `${currentBerneseStep.estimatedReceptorOccupancyPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Schedule Table */}
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground">
                    <th className="pb-2 font-medium">Day</th>
                    <th className="pb-2 font-medium">Buprenorphine Dose</th>
                    <th className="pb-2 font-medium">Full-Agonist Baseline</th>
                    <th className="pb-2 font-medium">Receptor Occupancy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {BERNESE_PROTOCOL_SCHEDULE.map((s) => (
                    <tr
                      key={s.day}
                      className={cn(
                        "cursor-pointer hover:bg-muted/40 transition-colors",
                        selectedBerneseDay === s.day && "bg-muted/60 font-medium",
                      )}
                      onClick={() => setSelectedBerneseDay(s.day)}
                    >
                      <td className="py-2.5 font-mono">Day {s.day}</td>
                      <td className="py-2.5 font-mono text-teal-400">{s.buprenorphineDose}</td>
                      <td className="py-2.5 text-muted-foreground">{s.fullAgonistInstruction}</td>
                      <td className="py-2.5 font-mono">~{s.estimatedReceptorOccupancyPercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Receptor Affinity & Efficacy */}
      {activeTab === "affinity" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border/80 bg-card p-5">
            <h3 className="text-sm font-semibold tracking-tight">
              Comparative μ-Opioid Receptor Affinity & Intrinsic Efficacy
            </h3>
            <p className="text-xs text-muted-foreground">
              Lower Ki indicates tighter receptor binding; Efficacy (α) reflects signal transduction strength
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.values(OPIOID_RECEPTOR_AFFINITIES).map((op) => (
                <div key={op.agent} className="rounded-lg border border-border/60 bg-muted/30 p-3.5 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{op.agent}</span>
                    <Badge tone={op.intrinsicEfficacyAlpha === 0 ? "danger" : op.intrinsicEfficacyAlpha < 0.5 ? "warn" : "ok"}>
                      α = {op.intrinsicEfficacyAlpha}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">
                    Binding Affinity Ki: <span className="font-mono text-foreground">{op.kiNanomolar} nM</span>
                  </div>
                  <div className="text-muted-foreground">
                    Duration of Action: <span className="font-mono text-foreground">{op.durationHours} hrs</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {op.kiNanomolar < 1 ? "Very High Affinity" : op.kiNanomolar < 5 ? "Moderate Affinity" : "Low Affinity"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Naloxone Renarcotization & Infusion */}
      {activeTab === "naloxone" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-border/80 bg-card p-5">
            <h3 className="text-sm font-semibold tracking-tight">
              Naloxone Continuous Infusion Sizing
            </h3>
            <p className="text-xs text-muted-foreground">
              Prevents fatal recurrent apnea when naloxone (t1/2 ~ 45-60 min) clears before long-acting opioids
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground">Successful Waking Bolus Dose (mg)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={wakingNaloxoneBolus}
                  onChange={(e) => setWakingNaloxoneBolus(Number(e.target.value))}
                  className="mt-1 h-8 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-muted-foreground">Suspected Opioid Exposure</label>
                <select
                  value={lastAgonist}
                  onChange={(e) => setLastAgonist(e.target.value as any)}
                  className="mt-1 w-full rounded-md border border-border bg-background p-2 text-xs"
                >
                  <option value="fentanyl">Fentanyl (Lipophilic depot retention)</option>
                  <option value="methadone">Methadone (24-36h terminal half-life)</option>
                  <option value="short-acting (oxycodone/heroin/morphine)">Short-Acting Opioids (Heroin / Morphine)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-border/80 bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">Continuous Infusion Protocol</span>
              <Badge tone={naloxonePlan.renarcotizationRiskLevel === "high" ? "danger" : "warn"}>
                Renarcotization Risk: {naloxonePlan.renarcotizationRiskLevel}
              </Badge>
            </div>

            <div className="mt-2 space-y-2.5 text-xs">
              <div className="rounded-lg bg-muted/40 p-3">
                <span className="font-semibold text-foreground">Hourly Infusion Rate:</span>{" "}
                <span className="font-mono text-teal-400 font-bold">{naloxonePlan.hourlyContinuousInfusionMg} mg/hour</span>{" "}
                (2/3 of waking bolus)
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <span className="font-semibold text-foreground">Pump Rate (4 mg / 100 mL NS bag):</span>{" "}
                <span className="font-mono text-foreground font-bold">{naloxonePlan.hourlyInfusionMlPerHour} mL/hour</span>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <span className="font-semibold text-foreground">Mandatory Observation Period:</span>{" "}
                <span className="font-mono text-amber-300 font-bold">&gt;= {naloxonePlan.minimumObservationHours} hours</span> post-overdose
              </div>
            </div>

            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              {naloxonePlan.pharmacokineticTrap}
            </p>
          </div>
        </div>
      )}

      {/* TAB 5: Xylazine ("Tranq") Protocol */}
      {activeTab === "xylazine" && (
        <div className="rounded-xl border border-border/80 bg-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Xylazine ("Tranq") Co-Intoxication Management</h3>
              <p className="text-xs text-muted-foreground">
                Non-opioid central alpha-2 agonist adulterant · CDC / MMWR Harm Reduction Doctrine
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-4 shrink-0 text-red-400" />
              <span>{xylazineProtocol.naloxoneResponseAlert}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
              <h4 className="font-semibold text-foreground">Clinical Hallmarks</h4>
              <ul className="space-y-1.5 text-muted-foreground">
                {xylazineProtocol.clinicalHallmarks.map((h, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-primary" /> {h}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
              <h4 className="font-semibold text-foreground">Supportive Resuscitation Priorities</h4>
              <ul className="space-y-1.5 text-muted-foreground">
                {xylazineProtocol.supportiveCarePriorities.map((p, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-teal-400" /> {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-background/50 p-3 text-xs">
            <h4 className="font-semibold text-foreground">Necrotic Skin Ulceration & Wound Care Doctrine</h4>
            <p className="mt-1 text-muted-foreground leading-relaxed">
              {xylazineProtocol.woundCareGuidance}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function MoudPanel({ ids, host }: MoudStationProps) {
  return <MoudStation ids={ids} host={host} />;
}

