import { useMemo, useState } from "react";
import { Activity, AlertCircle, ArrowDown, ArrowUp, HeartPulse, Minus, ShieldAlert, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { HostContext } from "@/lib/drugs/types";
import {
  evaluateAcidemiaAdrenergicUncoupling,
  getComparativeReceptorMatrix,
  VASOACTIVE_CDS_DISCLAIMER,
  vasoactiveReportOnDesk,
  type HemodynamicDirection,
  type TargetReceptorId,
} from "@/lib/drugs/vasoactive-kinetics";

export function VasoactivePanel({ ids, host }: { ids: string[]; host: HostContext }) {
  // Hemodynamic & Blood Gas inputs
  const [arterialPh, setArterialPh] = useState<string>("7.40");
  const [serumLactate, setSerumLactate] = useState<string>("2.0");
  const [scvO2, setScvO2] = useState<string>("72");
  const [pvaCo2Gap, setPvaCo2Gap] = useState<string>("5.0");
  const [hasDynamicLvot, setHasDynamicLvot] = useState<boolean>(false);

  const numPh = Math.max(6.8, Math.min(7.6, Number(arterialPh) || 7.4));
  const numLactate = Math.max(0.5, Math.min(25, Number(serumLactate) || 2.0));
  const numScvO2 = Math.max(20, Math.min(100, Number(scvO2) || 72));
  const numGap = Math.max(1, Math.min(20, Number(pvaCo2Gap) || 5.0));

  const report = useMemo(
    () =>
      vasoactiveReportOnDesk(ids, host, {
        arterialPh: numPh,
        lactateMmolL: numLactate,
        scvO2Pct: numScvO2,
        pvaCo2GapMmHg: numGap,
        hasLvotObstructionOrHocm: hasDynamicLvot,
      }),
    [ids.join("|"), host, numPh, numLactate, numScvO2, numGap, hasDynamicLvot],
  );

  const acidemiaEval = useMemo(
    () => evaluateAcidemiaAdrenergicUncoupling(numPh, report.onDesk.detectedVasoactiveIds),
    [numPh, report.onDesk.detectedVasoactiveIds],
  );

  const receptorMatrix = useMemo(() => getComparativeReceptorMatrix(), []);

  // Directional arrow helper
  const renderDirection = (dir?: HemodynamicDirection) => {
    switch (dir) {
      case "surge":
        return <ArrowUp className="h-4 w-4 text-accent font-bold" />;
      case "increase":
        return <ArrowUp className="h-3.5 w-3.5 text-accent" />;
      case "neutral":
        return <Minus className="h-3.5 w-3.5 text-muted" />;
      case "decrease":
        return <ArrowDown className="h-3.5 w-3.5 text-ok" />;
      case "marked-drop":
        return <div className="flex items-center text-ok font-bold"><ArrowDown className="h-3.5 w-3.5" /><ArrowDown className="h-3.5 w-3.5 -ml-2" /></div>;
      default:
        return <Minus className="h-3.5 w-3.5 text-muted" />;
    }
  };

  const agg = report.aggregatedHemodynamics;

  return (
    <div className="space-y-6 text-xs text-fg">
      {/* Header Banner */}
      <div className="rounded-lg bg-surface-sunken p-4 border border-border space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-accent" />
            <span className="font-serif font-bold text-sm tracking-tight text-fg">
              Critical Care Vasoactive Kinetics, Inotrope &amp; Adrenergic Hemodynamics Station
            </span>
          </div>
          <Badge
            tone={acidemiaEval.isAcidemicUncouplingRisk ? "danger" : report.activeDrugs.length > 0 ? "accent" : "default"}
            className="font-mono uppercase text-[10px]"
          >
            {acidemiaEval.isAcidemicUncouplingRisk ? "Severe Acidemia Uncoupling" : `${report.activeDrugs.length} Agents Active`}
          </Badge>
        </div>
        <p className="text-muted leading-relaxed">
          Quantitative receptor binding affinity matrix (&alpha;1, &alpha;2, &beta;1, &beta;2, V1a, AT1, D1, D2), net hemodynamic vector modeling, acidemia-induced adrenergic uncoupling (pH &lt; 7.20), and Epinephrine Type B aerobic hyperlactatemia differentiation.
        </p>
      </div>

      {/* Critical Care Bedside Hemodynamics & Gas Panel */}
      <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="font-semibold text-fg text-sm">Shock &amp; Metabolic Gas Parameters</span>
            <p className="text-muted text-[11px]">
              Simulate receptor uncoupling and lactic acid kinetics at current arterial pH and perfusion status.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setHasDynamicLvot(!hasDynamicLvot)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold border transition-colors",
              hasDynamicLvot ? "bg-danger text-bg border-danger" : "bg-surface-sunken text-muted border-border hover:text-fg",
            )}
          >
            {hasDynamicLvot ? "Dynamic LVOT Obstruction (HOCM) Active" : "Flag LVOT Obstruction / HOCM"}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] text-muted block mb-1">Arterial pH:</label>
            <Input
              type="number"
              step="0.05"
              min="6.8"
              max="7.6"
              value={arterialPh}
              onChange={(e) => setArterialPh(e.target.value)}
              className={cn("font-mono text-center font-bold text-xs", numPh < 7.2 ? "text-danger border-danger" : "text-fg")}
            />
          </div>
          <div>
            <label className="text-[11px] text-muted block mb-1">Serum Lactate (mmol/L):</label>
            <Input
              type="number"
              step="0.5"
              min="0.5"
              max="25"
              value={serumLactate}
              onChange={(e) => setSerumLactate(e.target.value)}
              className="font-mono text-center font-bold text-fg text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted block mb-1">ScvO2 (%):</label>
            <Input
              type="number"
              step="1"
              min="20"
              max="100"
              value={scvO2}
              onChange={(e) => setScvO2(e.target.value)}
              className="font-mono text-center font-bold text-fg text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted block mb-1">P(v-a)CO2 Gap (mmHg):</label>
            <Input
              type="number"
              step="0.5"
              min="1"
              max="20"
              value={pvaCo2Gap}
              onChange={(e) => setPvaCo2Gap(e.target.value)}
              className="font-mono text-center font-bold text-fg text-xs"
            />
          </div>
        </div>

        {/* Acidemia Uncoupling Advisory Banner */}
        {acidemiaEval.isAcidemicUncouplingRisk && (
          <div className="rounded-md border border-danger/40 bg-danger-soft/20 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-danger font-semibold text-xs">
                <AlertCircle className="h-4 w-4" />
                <span>Acidemia-Induced Adrenergic Uncoupling Detected (pH {numPh})</span>
              </div>
              <Badge tone="danger" className="text-[9px] uppercase font-mono">
                {acidemiaEval.uncouplingSeverity.replace("-", " ").toUpperCase()}
              </Badge>
            </div>
            <p className="text-fg text-[11px] leading-relaxed">{acidemiaEval.molecularMechanism}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] pt-1">
              <div className="rounded bg-surface p-2 border border-border">
                <span className="text-muted block">Catecholamine Responsiveness:</span>
                <span className="font-mono font-bold text-danger text-xs">{acidemiaEval.estimatedCatecholamineResponsivenessPct}%</span>
                <p className="text-muted text-[10px] mt-0.5">&alpha;1 and &beta;1 receptor protonation uncouples G-protein signaling.</p>
              </div>
              <div className="rounded bg-surface p-2 border border-border">
                <span className="text-muted block">Vasopressin V1a Responsiveness:</span>
                <span className="font-mono font-bold text-ok text-xs">{acidemiaEval.estimatedVasopressinResponsivenessPct}%</span>
                <p className="text-muted text-[10px] mt-0.5">V1a maintains Gq coupling and PKC closes vascular K_ATP channels.</p>
              </div>
            </div>
            <p className="text-fg font-medium text-[11px] pt-1 border-t border-danger/20">
              <span className="text-danger font-bold">Clinical Action: </span>
              {acidemiaEval.clinicalAction}
            </p>
          </div>
        )}

        {/* Epinephrine Hyperlactatemia Analysis Banner */}
        {report.hyperlactatemiaEvaluation && (
          <div className="rounded-md border border-border bg-surface-sunken p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-fg text-xs">
                Epinephrine Metabolic Lactate Analysis ({report.hyperlactatemiaEvaluation.classification.toUpperCase()})
              </span>
              <Badge
                tone={report.hyperlactatemiaEvaluation.isTypeBLactatemia ? "accent" : "danger"}
                className="text-[10px]"
              >
                {report.hyperlactatemiaEvaluation.isTypeBLactatemia ? "Aerobic Glycolysis (Type B)" : "Tissue Dysoxia (Type A)"}
              </Badge>
            </div>
            <p className="text-fg text-[11px] leading-relaxed">{report.hyperlactatemiaEvaluation.biochemicalMechanism}</p>
            <div className="rounded bg-surface p-2 border border-border text-[11px] space-y-1">
              <p className="font-medium text-fg">
                <span className="text-accent font-bold">Clinical Pearl: </span>
                {report.hyperlactatemiaEvaluation.pearl}
              </p>
              <p className="text-muted text-[10px]">
                ScvO2 &ge; 70% and normal CO2 gap confirm microvascular perfusion adequacy despite elevated blood lactate.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Aggregate Hemodynamic Trajectory Vector */}
      {agg && (
        <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" />
            <span className="font-serif font-bold text-sm text-fg">
              Net Hemodynamic Vector Trajectory
            </span>
          </div>
          <p className="text-muted text-[11px]">
            {agg.summary}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {[
              { label: "MAP", dir: agg.netMap, desc: "Mean Arterial Pressure" },
              { label: "SVR", dir: agg.netSvr, desc: "Systemic Vascular Resistance" },
              { label: "CO / CI", dir: agg.netCoCi, desc: "Cardiac Output / Index" },
              { label: "HR", dir: agg.netHr, desc: "Heart Rate" },
              { label: "PVR", dir: agg.netPvr, desc: "Pulmonary Vascular Resistance" },
              { label: "MVO2", dir: agg.netMvo2, desc: "Myocardial O2 Demand" },
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-border bg-surface-sunken p-2.5 text-center space-y-1">
                <span className="font-mono font-bold text-fg text-xs block">{item.label}</span>
                <div className="flex justify-center py-1">{renderDirection(item.dir)}</div>
                <span className="text-[9px] uppercase font-mono text-muted block">{item.dir?.replace("-", " ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Critical Receptor Clashes & Drug Collisions */}
      {report.collisions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-danger" />
            <span className="font-serif font-bold text-sm text-fg">
              Detected Critical Vasoactive Collisions &amp; Incompatibilities ({report.collisions.length})
            </span>
          </div>
          <div className="space-y-3">
            {report.collisions.map((col, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-lg border p-4 space-y-2",
                  col.severity === "contraindicated"
                    ? "border-danger/50 bg-danger-soft/25"
                    : col.severity === "major"
                      ? "border-warn/50 bg-warn-soft/20"
                      : "border-border bg-surface",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-fg">{col.headline}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      tone={col.severity === "contraindicated" ? "danger" : "warn"}
                      className="text-[10px] uppercase font-mono"
                    >
                      {col.severity}
                    </Badge>
                    <Badge tone="default" className="text-[10px]">
                      {col.category}
                    </Badge>
                  </div>
                </div>
                <p className="text-fg leading-relaxed">{col.molecularReceptorMechanism}</p>
                <div className="rounded bg-surface-sunken p-2.5 border border-border text-[11px] space-y-1">
                  <p className="font-medium text-fg">
                    <span className="text-danger font-bold">Action / Antidote: </span>
                    {col.clinicalAction}
                  </p>
                  {col.antidoteOrRescueStrategy && (
                    <p className="text-muted text-[10px]">
                      <span className="font-medium text-fg">Rescue Protocol: </span>
                      {col.antidoteOrRescueStrategy}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparative Receptor Binding Heatmap Matrix */}
      <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-accent" />
          <span className="font-serif font-bold text-sm text-fg">
            Pharmacodynamic Receptor Affinity Matrix (0 to 4 Scale)
          </span>
        </div>
        <p className="text-muted text-[11px]">
          Receptor selectivity profiles across adrenergic, vasopressinergic, angiotensin, and dopaminergic targets:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-border text-muted font-mono text-[10px]">
                <th className="py-2 px-2 font-medium">Drug</th>
                <th className="py-2 px-1 text-center font-medium">&alpha;1</th>
                <th className="py-2 px-1 text-center font-medium">&alpha;2</th>
                <th className="py-2 px-1 text-center font-medium">&beta;1</th>
                <th className="py-2 px-1 text-center font-medium">&beta;2</th>
                <th className="py-2 px-1 text-center font-medium">V1a</th>
                <th className="py-2 px-1 text-center font-medium">AT1</th>
                <th className="py-2 px-1 text-center font-medium">D1</th>
                <th className="py-2 px-1 text-center font-medium">D2</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono">
              {receptorMatrix.drugs.map((drug) => {
                const isSelected = ids.some((id) => drug.id.toLowerCase().includes(id.toLowerCase()));
                return (
                  <tr
                    key={drug.id}
                    className={cn(
                      "transition-colors",
                      isSelected ? "bg-accent-soft/25 font-bold" : "hover:bg-surface-sunken/40",
                    )}
                  >
                    <td className="py-1.5 px-2 font-sans font-medium text-fg">
                      {drug.name}
                      {isSelected && (
                        <span className="ml-1 text-[9px] text-accent uppercase font-mono font-bold">[ON DESK]</span>
                      )}
                    </td>
                    {(["alpha-1", "alpha-2", "beta-1", "beta-2", "V1a", "AT1", "D1", "D2"] as TargetReceptorId[]).map((recId) => {
                      const score = drug.affinities[recId];
                      return (
                        <td key={recId} className="py-1.5 px-1 text-center">
                          <span
                            className={cn(
                              "inline-block w-5 h-5 leading-5 rounded text-[10px] text-center",
                              score === 4
                                ? "bg-danger text-bg font-bold"
                                : score === 3
                                  ? "bg-warn text-bg font-bold"
                                  : score === 2
                                    ? "bg-accent text-bg"
                                    : score === 1
                                      ? "bg-accent-soft/40 text-fg"
                                      : "text-muted/40",
                            )}
                          >
                            {score}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* High-Yield Clinical Pharmacology Pearls */}
      <div className="rounded-lg border border-accent/30 bg-accent-soft/20 p-4 space-y-2 text-xs">
        <div className="flex items-center gap-1.5 text-accent font-semibold text-sm">
          <Sparkles className="h-4 w-4" />
          <span>Critical Care Hemodynamic Pearls</span>
        </div>
        <ul className="space-y-1.5 list-disc list-inside text-fg leading-relaxed">
          {report.clinicalPearls.map((pearl, idx) => (
            <li key={idx}>{pearl}</li>
          ))}
        </ul>
      </div>

      {/* Statutory Regulatory Disclaimer */}
      <p className="text-[11px] leading-relaxed text-muted border-t border-border pt-3">
        {VASOACTIVE_CDS_DISCLAIMER}
      </p>
    </div>
  );
}

