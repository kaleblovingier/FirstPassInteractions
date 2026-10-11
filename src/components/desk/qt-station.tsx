import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Heart,
  Zap,
  ShieldAlert,
  Flame,
  CheckCircle2,
  HelpCircle,
  Stethoscope,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { HostContext } from "@/lib/drugs/types";
import {
  calculateMultiQtc,
  deriveTisdaleDefaults,
  evaluateTisdaleScore,
  evaluateQtDesk,
  getTdpResuscitationNomogram,
  type Sex,
  type TisdaleInput,
} from "@/lib/drugs/qt-resus";

interface QtStationProps {
  ids: string[];
  host: HostContext;
}

export function QtStation({ ids, host }: QtStationProps) {
  // Evaluation from active desk
  const deskEval = useMemo(() => evaluateQtDesk(ids, host), [ids.join("|"), host.age, host.kidney]);

  // Calculator inputs
  const [qtInput, setQtInput] = useState("440");
  const [hrInput, setHrInput] = useState("78");
  const [sexInput, setSexInput] = useState<Sex>("male");
  const [baselineQtInput, setBaselineQtInput] = useState("");

  // Tisdale interactive state (initialized from auto-detected desk defaults)
  const autoTisdale = useMemo(() => deriveTisdaleDefaults(ids, host), [ids.join("|"), host.age]);
  const [tisdaleState, setTisdaleState] = useState<TisdaleInput>(autoTisdale);

  // Update tisdale state if desk changes
  useMemo(() => {
    setTisdaleState((prev) => ({
      ...prev,
      ageGeriatric: autoTisdale.ageGeriatric,
      loopDiuretic: autoTisdale.loopDiuretic,
      twoOrMoreQtDrugs: autoTisdale.twoOrMoreQtDrugs,
    }));
  }, [autoTisdale]);

  // TdP Nomogram status selection
  const [tdpStatus, setTdpStatus] = useState<"stable-recurrent-bursts" | "unstable-pulseless">("stable-recurrent-bursts");

  // Multi-formula computation
  const multiQtc = useMemo(() => {
    const qt = parseFloat(qtInput);
    const hr = parseFloat(hrInput);
    const base = baselineQtInput ? parseFloat(baselineQtInput) : undefined;
    if (isNaN(qt) || isNaN(hr)) return null;
    return calculateMultiQtc({
      qtMs: qt,
      hrBpm: hr,
      sex: sexInput,
      baselineQtcMs: !isNaN(base!) ? base : undefined,
    });
  }, [qtInput, hrInput, sexInput, baselineQtInput]);

  // Tisdale computation
  const tisdaleResult = useMemo(() => evaluateTisdaleScore(tisdaleState), [tisdaleState]);

  // TdP nomogram
  const nomogram = useMemo(() => getTdpResuscitationNomogram(tdpStatus), [tdpStatus]);

  const toggleTisdaleFactor = (key: keyof TisdaleInput) => {
    setTisdaleState((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header Summary & Active Drugs on Desk */}
      <div className="rounded-xl border border-border bg-bg-sunken p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="size-5 text-accent" />
            <h3 className="font-serif text-lg font-medium text-fg">
              Cardiac QTc Risk & Torsades de Pointes (TdP) Emergency Station
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {deskEval.hasQtDrugs ? (
              <Badge tone="danger">
                {deskEval.activeQtRows.filter((r) => r.risk === "known").length} Known-Risk +{" "}
                {deskEval.activeQtRows.filter((r) => r.risk === "possible").length} Possible
              </Badge>
            ) : (
              <Badge tone="ok">No Primary QT Perpetrators on Active Desk</Badge>
            )}
            {deskEval.loopDiureticsOnDesk.length > 0 && (
              <Badge tone="warn">Loop Diuretic Active (K+/Mg2+ Depletion)</Badge>
            )}
          </div>
        </div>

        {/* Active Drug Strip */}
        {deskEval.hasQtDrugs ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium text-muted">
              Active hERG / IKr Channel Blockers on Current Regimen:
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {deskEval.activeQtRows.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-border/60 bg-surface/70 px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-fg">{r.name}</span>
                    <Badge tone={r.risk === "known" ? "danger" : "warn"}>
                      {r.risk === "known" ? "Known TdP Risk" : "Possible Risk"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">{r.note}</p>
                </div>
              ))}
            </div>
            {deskEval.qtReport?.amplifiers.length ? (
              <div className="mt-2 rounded-md bg-warn-soft/40 p-2 text-xs text-fg">
                <span className="font-medium text-warn">Desk Amplifiers: </span>
                {deskEval.qtReport.amplifiers.join(" · ")}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted">
            No QT-prolonging agents are on the active desk. Use the bedside calculators below to model clinical scenarios, heart rate correction discrepancies, and inpatient Tisdale risk scoring.
          </p>
        )}
      </div>

      {/* SECTION 1: Multi-Formula QTc Comparator & Rate Trap Analysis */}
      <section className="rounded-xl border border-border bg-surface p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Heart className="size-4 text-accent" />
            <h4 className="font-serif text-base font-semibold text-fg">
              1. Multi-Formula QTc Engine & Rate Discrepancy Analyzer
            </h4>
          </div>
          <span className="font-mono text-[11px] text-muted">
            Bazett · Fridericia (ACC/AHA/ESC) · Framingham · Hodges
          </span>
        </div>

        {/* Inputs row */}
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="block text-[11px] font-medium text-muted">
              Measured QT (ms)
            </label>
            <Input
              type="number"
              value={qtInput}
              onChange={(e) => setQtInput(e.target.value)}
              className="mt-1 font-mono text-sm"
              placeholder="e.g. 440"
            />
            <span className="text-[10px] text-subtle">Valid: 200–850 ms</span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted">
              Heart Rate (bpm)
            </label>
            <Input
              type="number"
              value={hrInput}
              onChange={(e) => setHrInput(e.target.value)}
              className="mt-1 font-mono text-sm"
              placeholder="e.g. 78"
            />
            <span className="text-[10px] text-subtle">Valid: 30–230 bpm</span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted">
              Biological Sex
            </label>
            <div className="mt-1 flex rounded-md border border-border bg-bg-sunken p-0.5 text-xs">
              <button
                type="button"
                aria-pressed={sexInput === "male"}
                onClick={() => setSexInput("male")}
                className={cn(
                  "flex-1 rounded py-1 font-mono text-xs transition",
                  sexInput === "male"
                    ? "bg-surface font-semibold text-fg shadow-xs"
                    : "text-muted hover:text-fg",
                )}
              >
                Male (≤450)
              </button>
              <button
                type="button"
                aria-pressed={sexInput === "female"}
                onClick={() => setSexInput("female")}
                className={cn(
                  "flex-1 rounded py-1 font-mono text-xs transition",
                  sexInput === "female"
                    ? "bg-surface font-semibold text-fg shadow-xs"
                    : "text-muted hover:text-fg",
                )}
              >
                Female (≤460)
              </button>
            </div>
            <span className="text-[10px] text-subtle">Sex-adjusted normal cutoffs</span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted">
              Prior Baseline QTc (ms) <span className="text-subtle">(optional)</span>
            </label>
            <Input
              type="number"
              value={baselineQtInput}
              onChange={(e) => setBaselineQtInput(e.target.value)}
              className="mt-1 font-mono text-sm"
              placeholder="e.g. 410"
            />
            <span className="text-[10px] text-subtle">Flags Δ ≥30 or ≥60 ms</span>
          </div>
        </div>

        {/* Results Grid */}
        {multiQtc ? (
          <div className="mt-4 space-y-3">
            {/* 4 Formula Cards */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {/* Bazett Card */}
              <div
                className={cn(
                  "rounded-lg border p-3",
                  multiQtc.rateTrap.type === "tachycardia-inflation"
                    ? "border-warn/40 bg-warn-soft/20"
                    : "border-border bg-bg-sunken",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-muted">Bazett</span>
                  <span className="text-[10px] text-subtle">QT / √RR</span>
                </div>
                <div className="mt-1 font-mono text-2xl font-bold tracking-tight text-fg">
                  {multiQtc.bazettMs}{" "}
                  <span className="text-xs font-normal text-muted">ms</span>
                </div>
                <p className="mt-1 text-[10px] text-subtle">
                  Standard 12-lead default. Overestimates in tachycardia.
                </p>
              </div>

              {/* Fridericia Card */}
              <div
                className={cn(
                  "rounded-lg border p-3 ring-1 ring-accent/30",
                  multiQtc.isCritical
                    ? "border-danger/40 bg-danger-soft/20"
                    : "border-accent/40 bg-accent-soft/20",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-accent">
                    Fridericia ★
                  </span>
                  <span className="rounded bg-accent/20 px-1 py-0.2 font-mono text-[9px] uppercase font-bold text-accent">
                    Guideline Std
                  </span>
                </div>
                <div className="mt-1 font-mono text-2xl font-bold tracking-tight text-fg">
                  {multiQtc.fridericiaMs}{" "}
                  <span className="text-xs font-normal text-muted">ms</span>
                </div>
                <p className="mt-1 text-[10px] text-subtle">
                  FDA / ACC / ESC recommended standard. QT / ∛RR.
                </p>
              </div>

              {/* Framingham Card */}
              <div className="rounded-lg border border-border bg-bg-sunken p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-muted">Framingham</span>
                  <span className="text-[10px] text-subtle">Linear</span>
                </div>
                <div className="mt-1 font-mono text-2xl font-bold tracking-tight text-fg">
                  {multiQtc.framinghamMs}{" "}
                  <span className="text-xs font-normal text-muted">ms</span>
                </div>
                <p className="mt-1 text-[10px] text-subtle">
                  QT + 154(1 - RR). Sagie 1992 population model.
                </p>
              </div>

              {/* Hodges Card */}
              <div className="rounded-lg border border-border bg-bg-sunken p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-muted">Hodges</span>
                  <span className="text-[10px] text-subtle">Linear</span>
                </div>
                <div className="mt-1 font-mono text-2xl font-bold tracking-tight text-fg">
                  {multiQtc.hodgesMs}{" "}
                  <span className="text-xs font-normal text-muted">ms</span>
                </div>
                <p className="mt-1 text-[10px] text-subtle">
                  QT + 1.75(HR - 60). Linear ECG software algorithm.
                </p>
              </div>
            </div>

            {/* Repolarization Risk Tier Callout */}
            <div
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3",
                multiQtc.riskBand === "critical"
                  ? "border-danger/50 bg-danger-soft/40 text-danger"
                  : multiQtc.riskBand === "prolonged"
                    ? "border-warn/50 bg-warn-soft/40 text-warn"
                    : multiQtc.riskBand === "borderline"
                      ? "border-warn/30 bg-warn-soft/20 text-fg"
                      : "border-ok/30 bg-ok-soft/20 text-ok",
              )}
            >
              <div className="flex items-center gap-2">
                {multiQtc.riskBand === "critical" ? (
                  <Flame className="size-5 text-danger" />
                ) : multiQtc.riskBand === "prolonged" ? (
                  <AlertTriangle className="size-5 text-warn" />
                ) : (
                  <CheckCircle2 className="size-5 text-ok" />
                )}
                <div>
                  <span className="font-serif font-semibold text-fg">
                    {multiQtc.riskLabel}
                  </span>
                  <span className="ml-2 font-mono text-xs text-muted">
                    (Recommended Fridericia: {multiQtc.recommendedQtcMs} ms | RR: {multiQtc.rrSec}s)
                  </span>
                </div>
              </div>
              <Badge
                tone={
                  multiQtc.riskBand === "critical"
                    ? "danger"
                    : multiQtc.riskBand === "prolonged"
                      ? "warn"
                      : multiQtc.riskBand === "borderline"
                        ? "warn"
                        : "ok"
                }
              >
                {multiQtc.riskBand.toUpperCase()}
              </Badge>
            </div>

            {/* Baseline Delta Alert if present */}
            {multiQtc.deltaBaselineAlert && (
              <div className="rounded-lg border border-danger/40 bg-danger-soft/30 p-2.5 text-xs text-fg">
                <div className="flex items-center gap-2 font-semibold text-danger">
                  <AlertTriangle className="size-4" />
                  <span>Baseline Delta Escalation Detected:</span>
                </div>
                <p className="mt-1 leading-relaxed text-muted">
                  {multiQtc.deltaBaselineAlert}
                </p>
              </div>
            )}

            {/* Rate Trap Educational Alert */}
            {multiQtc.rateTrap.type !== "concordant" && (
              <div
                className={cn(
                  "rounded-lg border p-3 text-xs leading-relaxed",
                  multiQtc.rateTrap.type === "tachycardia-inflation"
                    ? "border-warn/40 bg-warn-soft/30 text-fg"
                    : "border-danger/40 bg-danger-soft/30 text-fg",
                )}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldAlert className="size-4 text-warn" />
                  <span>{multiQtc.rateTrap.headline}</span>
                </div>
                <p className="mt-1 text-muted">{multiQtc.rateTrap.explanation}</p>
                <p className="mt-1.5 font-medium text-fg">
                  Clinical Action: {multiQtc.rateTrap.recommendation}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 text-xs text-warn">
            Please enter valid measured QT (200–850 ms) and heart rate (30–230 bpm) values.
          </p>
        )}
      </section>

      {/* SECTION 2: Validated Tisdale Inpatient QTc Risk Score Station */}
      <section className="rounded-xl border border-border bg-surface p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 text-accent" />
            <h4 className="font-serif text-base font-semibold text-fg">
              2. Tisdale Inpatient QTc Prolongation Risk Calculator (Circulation 2013)
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-fg">
              Score: {tisdaleResult.score} / {tisdaleResult.maxScore}
            </span>
            <Badge
              tone={
                tisdaleResult.tier === "high"
                  ? "danger"
                  : tisdaleResult.tier === "moderate"
                    ? "warn"
                    : "ok"
              }
            >
              {tisdaleResult.tierLabel}
            </Badge>
          </div>
        </div>

        {/* Score & Risk Summary banner */}
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-bg-sunken p-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
              Predicted Risk
            </span>
            <div className="mt-1 font-serif text-lg font-bold text-fg">
              {tisdaleResult.predictedRiskPercentage}
            </div>
            <p className="mt-0.5 text-[11px] text-subtle">
              Probability of developing critical QTc ≥ 500 ms during hospitalization
            </p>
          </div>

          <div className="rounded-lg border border-border bg-bg-sunken p-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
              Telemetry Directive
            </span>
            <div className="mt-1 font-serif text-base font-semibold text-fg">
              {tisdaleResult.telemetryRequirement}
            </div>
            <p className="mt-0.5 text-[11px] text-subtle">
              Based on validated inpatient prediction model
            </p>
          </div>

          <div className="rounded-lg border border-border bg-bg-sunken p-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
              Electrolyte Targets
            </span>
            <div className="mt-1 font-mono text-sm font-semibold text-accent">
              K+ {tisdaleResult.electrolyteTargets.potassiumMeqL} · Mg2+ {tisdaleResult.electrolyteTargets.magnesiumMgDl}
            </div>
            <p className="mt-0.5 text-[11px] text-subtle">
              Higher targets stabilize IKr conductance and suppress EAD triggers
            </p>
          </div>
        </div>

        {/* Interactive Factor Checklist */}
        <div className="mt-4">
          <h5 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Clinical Risk Factors (Click to toggle / audit):
          </h5>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {tisdaleResult.factors.map((f) => {
              const key = f.id as keyof TisdaleInput;
              const isAuto =
                (key === "ageGeriatric" && autoTisdale.ageGeriatric) ||
                (key === "loopDiuretic" && autoTisdale.loopDiuretic) ||
                (key === "twoOrMoreQtDrugs" && autoTisdale.twoOrMoreQtDrugs);
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={f.present}
                  onClick={() => toggleTisdaleFactor(key)}
                  className={cn(
                    "flex flex-col justify-between rounded-lg border p-2.5 text-left text-xs transition",
                    f.present
                      ? "border-accent/50 bg-accent-soft/30 text-fg shadow-2xs"
                      : "border-border/70 bg-bg-sunken/60 text-muted hover:border-border hover:text-fg",
                  )}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-medium">{f.label}</span>
                    <span className="shrink-0 font-mono text-[11px] font-bold text-accent">
                      +{f.points} pt{f.points > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <span className="text-subtle">{f.rationale}</span>
                    {isAuto && (
                      <span className="ml-1 shrink-0 rounded bg-surface px-1 py-0.5 font-mono text-[9px] uppercase font-bold text-accent">
                        Auto
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recommendations Checklist */}
        <div className="mt-4 rounded-lg border border-border/80 bg-bg-sunken p-3">
          <span className="font-serif text-xs font-semibold text-fg">
            Clinical Management Rails for {tisdaleResult.tierLabel}:
          </span>
          <ul className="mt-1.5 space-y-1 text-xs text-muted">
            {tisdaleResult.clinicalRecommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-accent">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* SECTION 3: Acute Torsades de Pointes (TdP) Emergency Resuscitation Nomogram */}
      <section className="rounded-xl border border-danger/30 bg-surface p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-danger" />
            <h4 className="font-serif text-base font-semibold text-fg">
              3. Acute Torsades de Pointes (TdP) Emergency Resuscitation Nomogram
            </h4>
          </div>

          {/* Toggle for Stable vs Unstable */}
          <div className="flex rounded-md border border-border bg-bg-sunken p-0.5 text-xs">
            <button
              type="button"
              aria-pressed={tdpStatus === "stable-recurrent-bursts"}
              onClick={() => setTdpStatus("stable-recurrent-bursts")}
              className={cn(
                "rounded px-2.5 py-1 font-mono text-xs transition",
                tdpStatus === "stable-recurrent-bursts"
                  ? "bg-surface font-semibold text-fg shadow-xs"
                  : "text-muted hover:text-fg",
              )}
            >
              Hemodynamically Stable (Bursts)
            </button>
            <button
              type="button"
              aria-pressed={tdpStatus === "unstable-pulseless"}
              onClick={() => setTdpStatus("unstable-pulseless")}
              className={cn(
                "rounded px-2.5 py-1 font-mono text-xs transition",
                tdpStatus === "unstable-pulseless"
                  ? "bg-danger font-semibold text-bg shadow-xs"
                  : "text-muted hover:text-fg",
              )}
            >
              Unstable / Pulseless (Code Blue)
            </button>
          </div>
        </div>

        {/* Nomogram Headline */}
        <div
          className={cn(
            "mt-3 rounded-lg border p-3 text-xs",
            nomogram.urgency === "emergent"
              ? "border-danger/60 bg-danger-soft/40 text-danger"
              : "border-warn/50 bg-warn-soft/30 text-fg",
          )}
        >
          <div className="flex items-center gap-2 font-bold">
            <Flame className="size-4" />
            <span>{nomogram.headline}</span>
          </div>
          <p className="mt-1 text-muted">
            Directives: {nomogram.electrolyteDirectives.laboratoryAlert} · {nomogram.electrolyteDirectives.potassiumTarget} · {nomogram.electrolyteDirectives.magnesiumTarget}
          </p>
        </div>

        {/* Steps sequence */}
        <div className="mt-3 space-y-2.5">
          {nomogram.steps.map((st) => (
            <div
              key={st.stepNumber}
              className="rounded-lg border border-border bg-bg-sunken p-3 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-1 border-b border-border/50 pb-1.5">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-bg">
                    {st.stepNumber}
                  </span>
                  <span className="font-serif font-bold text-fg">{st.title}</span>
                </div>
                <span className="font-mono text-[10px] uppercase text-muted">
                  Timing: {st.timing}
                </span>
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div>
                  <span className="font-medium text-fg">Agent & Regimen:</span>
                  <p className="font-mono text-sm font-semibold text-accent">
                    {st.dosingOrParameters}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    <span className="font-medium text-fg">Mechanism: </span>
                    {st.mechanism}
                  </p>
                </div>

                <div className="rounded-md border border-border/60 bg-surface/80 p-2">
                  <span className="font-medium text-fg">Critical Clinical Pearls:</span>
                  <ul className="mt-1 space-y-1 text-[11px] text-muted">
                    {st.clinicalPearls.map((cp, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-accent">•</span>
                        <span>{cp}</span>
                      </li>
                    ))}
                  </ul>
                  {st.warning && (
                    <p className="mt-1.5 border-t border-warn/30 pt-1 text-[11px] font-medium text-warn">
                      ⚠ {st.warning}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Antiarrhythmic Blacklist Box */}
        <div className="mt-4 rounded-lg border border-danger/40 bg-danger-soft/20 p-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-danger">
            <ShieldAlert className="size-4" />
            <span>Antiarrhythmic Blacklist in Drug-Induced TdP (DO NOT ADMINISTER):</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {nomogram.antiarrhythmicAvoidanceList.map((item, idx) => (
              <span
                key={idx}
                className="rounded bg-surface px-2 py-1 font-mono text-[11px] text-danger border border-danger/30"
              >
                ✖ {item}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-subtle">
            Standard VT algorithms (e.g. Amiodarone or Procainamide) block IKr and will worsen repolarization delay, transforming intermittent TdP into fatal refractory ventricular fibrillation.
          </p>
        </div>
      </section>

      {/* SECTION 4: Electrophysiology & Congenital LQTS Reference */}
      <section className="rounded-xl border border-border bg-bg-sunken p-4 text-xs leading-relaxed">
        <div className="flex items-center gap-2 border-b border-border/70 pb-2">
          <Info className="size-4 text-accent" />
          <h4 className="font-serif text-sm font-semibold text-fg">
            4. Electrophysiological Mechanism & Channel Dynamics Reference
          </h4>
        </div>

        <p className="mt-2 text-muted">{deskEval.pathophysiologySummary}</p>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface p-2.5">
            <div className="font-serif font-semibold text-fg">LQT1 (KCNQ1 / IKs)</div>
            <p className="mt-1 text-[11px] text-muted">
              Triggered by adrenergic stimulation, intense physical exercise, or cold water swimming. Beta-blockers are highly protective.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface p-2.5">
            <div className="font-serif font-semibold text-fg">LQT2 (KCNH2 / IKr)</div>
            <p className="mt-1 text-[11px] text-muted">
              Triggered by sudden auditory stimuli (alarms) and emotional stress. Resembles drug-induced LQTS. Potassium repletion directly restores IKr current.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface p-2.5">
            <div className="font-serif font-semibold text-fg">LQT3 (SCN5A / INa-late)</div>
            <p className="mt-1 text-[11px] text-muted">
              Triggered during rest, bradycardia, or sleep. Beta-blockers less effective; late sodium channel blockers (mexiletine) shorten the QT interval.
            </p>
          </div>
        </div>

        <p className="mt-3 text-[10px] text-subtle">
          Educational Decision Support (FD&C Act 520(o)(1)(E)). All algorithms and calculations are non-prescriptive learning aids. The FDA Prescribing Information and the attending clinician govern.
        </p>
      </section>
    </div>
  );
}

