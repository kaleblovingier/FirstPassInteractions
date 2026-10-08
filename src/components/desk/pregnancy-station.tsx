import { useMemo, useState } from "react";
import { Activity, AlertCircle, AlertTriangle, Baby, HeartPulse, ShieldAlert, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { HostContext } from "@/lib/drugs/types";
import {
  calculateRelativeInfantDose,
  EMBRYOGENESIS_PHASES,
  getTrimesterVulnerability,
  pregnancyReportOnDesk,
  PREGNANCY_LACTATION_REGULATORY_DISCLAIMER,
} from "@/lib/drugs/pregnancy-lactation";

export function PregnancyPanel({ ids, host }: { ids: string[]; host: HostContext }) {
  // Gestational Age in weeks (default 7.0 = peak organogenesis)
  const [gaWeeks, setGaWeeks] = useState<string>("7.0");
  const [maternalDoseMg, setMaternalDoseMg] = useState<string>("100");
  const [milkConcMgL, setMilkConcMgL] = useState<string>("0.5");

  const numGa = Math.max(1, Math.min(42, Number(gaWeeks) || 7.0));
  const numMatDose = Math.max(1, Number(maternalDoseMg) || 100);
  const numMilkConc = Math.max(0.01, Number(milkConcMgL) || 0.5);

  const report = useMemo(
    () =>
      pregnancyReportOnDesk(ids, host, {
        gestationalAgeWeeks: numGa,
        totalDailyMaternalDoseMg: numMatDose,
      }),
    [ids.join("|"), host, numGa, numMatDose],
  );

  const activeWindows = useMemo(() => getTrimesterVulnerability(numGa), [numGa]);

  // Interactive RID calculation
  const customRid = useMemo(() => {
    return calculateRelativeInfantDose({
      milkConcentrationMgL: numMilkConc,
      totalDailyMaternalDoseMg: numMatDose,
      maternalWeightKg: 65,
    });
  }, [numMilkConc, numMatDose]);

  const isCritical = report.summaryStatus === "critical";
  const isWarning = report.summaryStatus === "warning";

  return (
    <div className="space-y-6 text-xs text-fg">
      {/* Header Banner */}
      <div className="rounded-lg bg-surface-sunken p-4 border border-border space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Baby className="h-4 w-4 text-accent" />
            <span className="font-serif font-bold text-sm tracking-tight text-fg">
              Obstetric Teratogenesis, Placental Barrier Kinetics &amp; Lactation Station
            </span>
          </div>
          <Badge
            tone={isCritical ? "danger" : isWarning ? "warn" : "ok"}
            className="font-mono uppercase text-[10px]"
          >
            {report.summaryStatus.toUpperCase()}
          </Badge>
        </div>
        <p className="text-muted leading-relaxed">
          Trimester-specific embryogenesis critical windows (weeks 3–8 organogenesis vs fetogenesis), molecular teratogenic pathways (CRBN, RAR/RXR, DHFR, AT1, COX), placental syncytiotrophoblast efflux (P-gp/BCRP), and lactation Relative Infant Dose (RID &lt; 10%) modeling.
        </p>
      </div>

      {/* Critical Gestational Age Slider / Parameter Bar */}
      <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="font-semibold text-fg text-sm">Gestational Age Vulnerability Navigator</span>
            <p className="text-muted text-[11px]">
              Evaluate organogenesis closure windows and phase susceptibility in real time.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-medium text-muted">Gestational Age (weeks):</label>
            <Input
              type="number"
              step="0.5"
              min="1"
              max="42"
              value={gaWeeks}
              onChange={(e) => setGaWeeks(e.target.value)}
              className="w-20 font-mono text-center font-bold text-fg text-xs"
            />
          </div>
        </div>

        {/* Phase Pill Indicator */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {EMBRYOGENESIS_PHASES.map((ph) => {
            const isActive = numGa >= ph.gestationalAgeWeeks.min && numGa <= ph.gestationalAgeWeeks.max;
            return (
              <div
                key={ph.id}
                className={cn(
                  "p-3 rounded-md border text-[11px] transition-colors",
                  isActive
                    ? "bg-accent-soft/30 border-accent text-fg font-semibold shadow-sm"
                    : "bg-surface-sunken/40 border-border text-muted",
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{ph.name}</span>
                  <Badge tone={isActive ? "accent" : "default"} className="text-[9px]">
                    GA {ph.gestationalAgeWeeks.min}–{ph.gestationalAgeWeeks.max}w
                  </Badge>
                </div>
                <p className="text-[10px] text-muted line-clamp-2">{ph.biologicalHallmark}</p>
              </div>
            );
          })}
        </div>

        {/* Active Organogenesis Windows at this GA */}
        {activeWindows.length > 0 && (
          <div className="rounded-md border border-warn/30 bg-warn-soft/20 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-warn font-semibold text-xs">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Active Morphogenetic Vulnerability Windows at GA {numGa} Weeks</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeWindows.map((win) => (
                <div key={win.name} className="rounded bg-surface p-2.5 border border-border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-fg">{win.name} ({win.organSystem})</span>
                    <span className="text-[10px] font-mono text-muted">
                      GA {win.gestationalAgeWeeks.min}–{win.gestationalAgeWeeks.max}w
                    </span>
                  </div>
                  <p className="text-[11px] text-muted">{win.vulnerabilityDescription}</p>
                  <div className="text-[10px] text-danger font-medium">
                    Culprit Agents: {win.primaryCulpritClasses.join(", ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* High-Yield Teratogen Collisions Banner */}
      {report.detectedCollisions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-danger" />
            <span className="font-serif font-bold text-sm text-fg">
              Detected High-Yield Teratogenic Collisions &amp; Black Box Alerts ({report.detectedCollisions.length})
            </span>
          </div>
          <div className="space-y-3">
            {report.detectedCollisions.map((col, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-lg border p-4 space-y-2",
                  col.severity === "critical"
                    ? "border-danger/50 bg-danger-soft/25"
                    : col.severity === "high"
                      ? "border-warn/50 bg-warn-soft/20"
                      : "border-border bg-surface",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-fg">{col.headline}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      tone={col.severity === "critical" ? "danger" : col.severity === "high" ? "warn" : "accent"}
                      className="text-[10px] uppercase font-mono"
                    >
                      {col.severity}
                    </Badge>
                    <Badge tone="default" className="text-[10px]">
                      {col.hazardType}
                    </Badge>
                  </div>
                </div>
                <p className="text-fg leading-relaxed">{col.mechanismExplanation}</p>
                <div className="rounded bg-surface-sunken p-2.5 border border-border text-[11px] space-y-1">
                  <p className="font-medium text-fg">
                    <span className="text-danger font-bold">Safer Alternatives: </span>
                    {col.saferAlternatives.join(", ")}
                  </p>
                  <p className="text-muted text-[10px]">
                    <span className="font-medium text-fg">Critical Timing Window: </span>
                    {col.criticalTimingWindow}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Maternal-Fetal Placental Permeation Transporter Section */}
      <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent" />
          <span className="font-serif font-bold text-sm text-fg">
            Placental Syncytiotrophoblast Barrier &amp; Transporter Dynamics
          </span>
        </div>
        <p className="text-muted text-[11px] leading-relaxed">
          Passive diffusion across maternal-fetal interface follows Fick&apos;s Law (MW &lt; 500 Da crosses freely, &gt; 1000 Da like heparin/insulin cannot cross). Apical efflux pumps (P-gp / ABCB1 and BCRP / ABCG2) actively extrude selected substrates back into maternal circulation.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {report.placentalPermeationAnalyses.map((pl) => (
            <div key={pl.drugName} className="rounded-md border border-border bg-surface-sunken p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-fg text-xs">{pl.drugName}</span>
                <Badge
                  tone={pl.placentalCrossingRisk === "negligible" ? "ok" : pl.placentalCrossingRisk === "low" ? "accent" : "warn"}
                  className="text-[10px]"
                >
                  {pl.placentalCrossingRisk.toUpperCase()} TRANSFER
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-muted">
                <span>MW: {pl.molecularWeightDa} Da</span>
                <span>Cord/Maternal: {pl.fetalCordToMaternalRatioEstimate}</span>
              </div>
              <p className="text-[11px] text-fg leading-relaxed">{pl.pharmacologicalSummary}</p>
              {pl.effluxTransporters.length > 0 && (
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="text-muted">Efflux Pumps:</span>
                  {pl.effluxTransporters.map((pump) => (
                    <Badge key={pump} tone="accent" className="text-[9px]">
                      {pump}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Lactation Safety & Relative Infant Dose (RID) Modeling */}
      <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-accent" />
          <span className="font-serif font-bold text-sm text-fg">
            Lactation Pharmacokinetics &amp; Relative Infant Dose (RID)
          </span>
        </div>

        {/* Interactive RID Calculator */}
        <div className="rounded-md border border-border bg-surface-sunken p-3.5 space-y-3">
          <span className="font-semibold text-fg text-xs block">
            Interactive Relative Infant Dose (RID) Calculator
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-muted block mb-1">Maternal Dose (mg/day):</label>
              <Input
                type="number"
                value={maternalDoseMg}
                onChange={(e) => setMaternalDoseMg(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted block mb-1">Milk Conc (mg/L):</label>
              <Input
                type="number"
                step="0.05"
                value={milkConcMgL}
                onChange={(e) => setMilkConcMgL(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
            <div className="text-[11px]">
              <span className="text-muted">Calculated RID: </span>
              <span className="font-mono font-bold text-fg text-sm">{customRid.relativeInfantDosePercent}%</span>
              <span className="text-muted text-[10px] ml-2">
                (Daily Infant Dose: {customRid.infantDoseMgKgDay.toFixed(4)} mg/kg/day)
              </span>
            </div>
            <Badge
              tone={
                customRid.benchmarkTier === "compatible-low-risk"
                  ? "ok"
                  : customRid.benchmarkTier === "moderate-monitor"
                    ? "warn"
                    : "danger"
              }
              className="text-[10px] uppercase font-mono"
            >
              {customRid.benchmarkTier.replace("-", " ")}
            </Badge>
          </div>
          <p className="text-[10px] text-muted">{customRid.clinicalInterpretation}</p>
        </div>

        {/* Detected Lactation Profiles */}
        {report.lactationAnalyses.length > 0 && (
          <div className="space-y-2">
            <span className="font-semibold text-fg text-xs block">
              Drug Lactation Profiles on Desk ({report.lactationAnalyses.length})
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {report.lactationAnalyses.map((lp) => (
                <div key={lp.drugName} className="rounded-md border border-border bg-surface-sunken p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-fg text-xs">{lp.drugName}</span>
                    <Badge
                      tone={
                        lp.safetyRating === "compatible-low-risk"
                          ? "ok"
                          : lp.safetyRating === "moderate-monitor"
                            ? "warn"
                            : "danger"
                      }
                      className="text-[10px]"
                    >
                      RID: {lp.relativeInfantDosePercent}%
                    </Badge>
                  </div>
                  <p className="text-[11px] text-fg leading-relaxed">{lp.clinicalExplanation}</p>
                  <p className="text-[10px] text-muted">
                    <span className="font-medium text-fg">Infant Bioavailability: </span>
                    {lp.infantBioavailabilityPercent}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CYP2D6 Ultra-Rapid Metabolizer Opioid Warning */}
        {report.cyp2d6LactationAlert && (
          <div className="rounded-md border border-danger/40 bg-danger-soft/20 p-3 space-y-1 text-xs">
            <div className="flex items-center gap-1.5 text-danger font-semibold">
              <AlertCircle className="h-4 w-4" />
              <span>Boxed Warning: Maternal CYP2D6 Ultra-Rapid Metabolizer Opioid Hazard</span>
            </div>
            <p className="text-fg leading-relaxed">{report.cyp2d6LactationAlert.warningText}</p>
            <p className="text-muted text-[10px]">{report.cyp2d6LactationAlert.pathophysiology}</p>
          </div>
        )}
      </div>

      {/* High-Yield Clinical Pharmacology Pearls */}
      <div className="rounded-lg border border-accent/30 bg-accent-soft/20 p-4 space-y-2 text-xs">
        <div className="flex items-center gap-1.5 text-accent font-semibold text-sm">
          <Sparkles className="h-4 w-4" />
          <span>Perinatal Clinical Pharmacology Pearls</span>
        </div>
        <ul className="space-y-1.5 list-disc list-inside text-fg leading-relaxed">
          {report.clinicalPearls.map((pearl, idx) => (
            <li key={idx}>{pearl}</li>
          ))}
        </ul>
      </div>

      {/* Statutory Non-Device Regulatory Footer */}
      <p className="text-[11px] leading-relaxed text-muted border-t border-border pt-3">
        {PREGNANCY_LACTATION_REGULATORY_DISCLAIMER}
      </p>
    </div>
  );
}

