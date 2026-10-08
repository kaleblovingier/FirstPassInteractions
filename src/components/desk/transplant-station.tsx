import { useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, ArrowRight, HeartHandshake, ShieldAlert, Sparkles, Waves } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { HostContext } from "@/lib/drugs/types";
import {
  simulateCniSteroidTaper,
  simulateMpaEnterohepaticKinetics,
  SOLID_ORGAN_TDM_PROFILES,
  TRANSPLANT_CDS_REGULATORY_NOTICE,
  transplantReportOnDesk,
  type SolidOrgan,
} from "@/lib/drugs/transplant-immunosuppression";

export function TransplantPanel({ ids, host }: { ids: string[]; host: HostContext }) {
  // Organ selection
  const [organ, setOrgan] = useState<SolidOrgan>("kidney");
  const [weeksPostTransplant, setWeeksPostTransplant] = useState<string>("8");

  // Enterohepatic Recirculation simulation parameters
  const [mmfDoseMg, setMmfDoseMg] = useState<string>("1000");
  const [hasAntibioticSuppression, setHasAntibioticSuppression] = useState<boolean>(false);
  const [hasMrp2Inhibition, setHasMrp2Inhibition] = useState<boolean>(false);
  const [hasBileSequestrant, setHasBileSequestrant] = useState<boolean>(false);
  const [hasPpiActive, setHasPpiActive] = useState<boolean>(false);

  // Steroid taper simulation parameters
  const [currentCniTrough, setCurrentCniTrough] = useState<string>("8.0");
  const [startingSteroidMg, setStartingSteroidMg] = useState<string>("20.0");
  const [taperedSteroidMg, setTaperedSteroidMg] = useState<string>("5.0");

  const numWeeks = Math.max(0, Math.min(520, Number(weeksPostTransplant) || 8));
  const numMmfDose = Math.max(250, Math.min(2000, Number(mmfDoseMg) || 1000));
  const numCniTrough = Math.max(1, Math.min(40, Number(currentCniTrough) || 8.0));
  const numStartSteroid = Math.max(5, Math.min(100, Number(startingSteroidMg) || 20.0));
  const numTaperSteroid = Math.max(0, Math.min(50, Number(taperedSteroidMg) || 5.0));

  const report = useMemo(
    () =>
      transplantReportOnDesk(ids, host),
    [ids.join("|"), host],
  );

  const isFormulationEcMps = ids.includes("myfortic") || ids.includes("ec-mps");
  const isCsaPerpetrator = hasMrp2Inhibition || ids.includes("cyclosporine");
  const isTacPerpetrator = ids.includes("tacrolimus") && !isCsaPerpetrator;

  // EHC Simulation
  const ehcResult = useMemo(
    () =>
      simulateMpaEnterohepaticKinetics({
        formulation: isFormulationEcMps ? "ec-mps" : "mmf",
        doseMg: numMmfDose,
        cniPerpetrator: isCsaPerpetrator ? "cyclosporine" : isTacPerpetrator ? "tacrolimus" : "none",
        antibioticActive: hasAntibioticSuppression || report.collisions.some((c) => c.mechanismCategory === "microbiome_flora"),
        cholestyramineActive: hasBileSequestrant || report.collisions.some((c) => c.mechanismCategory === "intraluminal_binding"),
        ppiActive: hasPpiActive || report.collisions.some((c) => c.mechanismCategory === "gastric_dissolution"),
      }),
    [isFormulationEcMps, numMmfDose, isCsaPerpetrator, isTacPerpetrator, hasAntibioticSuppression, report.collisions, hasBileSequestrant, hasPpiActive],
  );

  // Steroid taper simulation
  const taperResult = useMemo(
    () =>
      simulateCniSteroidTaper({
        cniAgent: ids.includes("cyclosporine") ? "cyclosporine" : "tacrolimus",
        currentCniTroughNgMl: numCniTrough,
        initialPrednisoneDoseMg: numStartSteroid,
        taperedPrednisoneDoseMg: numTaperSteroid,
      }),
    [ids, numCniTrough, numStartSteroid, numTaperSteroid],
  );

  const tdmProfile = SOLID_ORGAN_TDM_PROFILES[organ];
  const hasCritical = report.collisions.some((c) => c.severity === "critical");
  const hasHigh = report.collisions.some((c) => c.severity === "high");

  return (
    <div className="space-y-6 text-xs text-fg">
      {/* Header Banner */}
      <div className="rounded-lg bg-surface-sunken p-4 border border-border space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-4 w-4 text-accent" />
            <span className="font-serif font-bold text-sm tracking-tight text-fg">
              Solid Organ Transplant Maintenance Immunosuppression &amp; Enterohepatic Recirculation Station
            </span>
          </div>
          <Badge
            tone={hasCritical ? "danger" : hasHigh ? "warn" : "ok"}
            className="font-mono uppercase text-[10px]"
          >
            {hasCritical ? "Critical Rejection Hazard" : hasHigh ? "High-Risk Collision" : "Quad-Therapy Stable"}
          </Badge>
        </div>
        <p className="text-muted leading-relaxed">
          Mycophenolate enterohepatic recirculation (EHC) dynamics, secondary MPA peak kinetics at 6–12h, Cyclosporine vs Tacrolimus MRP2 divergence, broad-spectrum antibiotic flora eradication, and corticosteroid taper CNI clearance rebound.
        </p>
      </div>

      {/* Organ Selection & Post-Transplant Timeline Bar */}
      <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-fg text-sm">Allograft Allotment &amp; TDM Rails</span>
            <p className="text-muted text-[11px]">
              Select allograft organ to display KDIGO / AASLD / ISHLT target trough guidelines.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-muted font-medium">Weeks Post-Op:</label>
            <Input
              type="number"
              min="0"
              max="520"
              value={weeksPostTransplant}
              onChange={(e) => setWeeksPostTransplant(e.target.value)}
              className="w-20 font-mono text-center font-bold text-fg text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(["kidney", "liver", "heart", "lung"] as SolidOrgan[]).map((org) => (
            <button
              key={org}
              type="button"
              onClick={() => setOrgan(org)}
              className={cn(
                "p-2.5 rounded-md border text-center transition-colors font-medium capitalize",
                organ === org
                  ? "bg-accent-soft/30 border-accent text-fg font-bold shadow-sm"
                  : "bg-surface-sunken/40 border-border text-muted hover:text-fg",
              )}
            >
              {org} Transplant
            </button>
          ))}
        </div>

        {/* Selected Organ Target Trough Rails */}
        <div className="rounded-md border border-border bg-surface-sunken p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-fg text-xs">
              {tdmProfile.organLabel} Protocol Target Troughs ({numWeeks < 12 ? "Early Phase: Months 0–3" : "Maintenance Phase: > 3–6 Months"})
            </span>
            <Badge tone="accent" className="text-[9px]">
              {report.quadTherapyProfile.regimenDescription}
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="rounded bg-surface p-2 border border-border">
              <span className="text-muted block text-[10px]">Tacrolimus (FK506):</span>
              <span className="font-mono font-bold text-fg">
                {numWeeks < 12 ? tdmProfile.tacrolimusTargets.months0to3 : tdmProfile.tacrolimusTargets.maintenance}
              </span>
            </div>
            <div className="rounded bg-surface p-2 border border-border">
              <span className="text-muted block text-[10px]">Cyclosporine (CsA):</span>
              <span className="font-mono font-bold text-fg">
                {numWeeks < 12 ? tdmProfile.cyclosporineTargets.months0to3 : tdmProfile.cyclosporineTargets.maintenance}
              </span>
            </div>
            <div className="rounded bg-surface p-2 border border-border">
              <span className="text-muted block text-[10px]">First-Line Maintenance:</span>
              <span className="text-fg font-medium text-[10px]">{tdmProfile.firstLineMaintenance}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enterohepatic Recirculation (EHC) & Secondary Peak Simulation */}
      <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Waves className="h-4 w-4 text-accent" />
          <span className="font-serif font-bold text-sm text-fg">
            Mycophenolate Enterohepatic Recirculation (EHC) Simulator
          </span>
        </div>
        <p className="text-muted text-[11px] leading-relaxed">
          Active MPA is glucuronidated to MPAG &rarr; excreted via biliary MRP2 &rarr; cleaved back to active MPA by gut bacterial &beta;-glucuronidase &rarr; reabsorbed, creating a secondary systemic peak at 6–12h contributing 25–35% of total AUC.
        </p>

        {/* EHC Modifiers */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setHasAntibioticSuppression(!hasAntibioticSuppression)}
            className={cn(
              "p-2.5 rounded border text-left text-[11px] transition-colors",
              hasAntibioticSuppression || report.collisions.some((c) => c.mechanismCategory === "microbiome_flora")
                ? "bg-danger-soft/30 border-danger text-fg font-semibold"
                : "bg-surface-sunken border-border text-muted hover:text-fg",
            )}
          >
            <div className="font-medium text-xs">Antibiotic Flora Eradication</div>
            <span className="text-[10px] text-muted">Eliminates bacterial &beta;-glucuronidase</span>
          </button>
          <button
            type="button"
            onClick={() => setHasMrp2Inhibition(!hasMrp2Inhibition)}
            className={cn(
              "p-2.5 rounded border text-left text-[11px] transition-colors",
              hasMrp2Inhibition || ids.includes("cyclosporine")
                ? "bg-warn-soft/30 border-warn text-fg font-semibold"
                : "bg-surface-sunken border-border text-muted hover:text-fg",
            )}
          >
            <div className="font-medium text-xs">MRP2 Biliary Block (Cyclosporine)</div>
            <span className="text-[10px] text-muted">Prevents biliary MPAG export</span>
          </button>
          <button
            type="button"
            onClick={() => setHasBileSequestrant(!hasBileSequestrant)}
            className={cn(
              "p-2.5 rounded border text-left text-[11px] transition-colors",
              hasBileSequestrant || report.collisions.some((c) => c.mechanismCategory === "intraluminal_binding")
                ? "bg-danger-soft/30 border-danger text-fg font-semibold"
                : "bg-surface-sunken border-border text-muted hover:text-fg",
            )}
          >
            <div className="font-medium text-xs">Bile Sequestrant (Cholestyramine)</div>
            <span className="text-[10px] text-muted">Binds luminal MPA/MPAG</span>
          </button>
          <button
            type="button"
            onClick={() => setHasPpiActive(!hasPpiActive)}
            className={cn(
              "p-2.5 rounded border text-left text-[11px] transition-colors",
              hasPpiActive || report.collisions.some((c) => c.mechanismCategory === "gastric_dissolution")
                ? "bg-accent-soft/30 border-accent text-fg font-semibold"
                : "bg-surface-sunken border-border text-muted hover:text-fg",
            )}
          >
            <div className="font-medium text-xs">PPI Gastric Hypochlorhydria</div>
            <span className="text-[10px] text-muted">Blunts MMF dissolution (spares EC-MPS)</span>
          </button>
        </div>

        {/* Simulation Output Card */}
        <div className="rounded-md border border-border bg-surface-sunken p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-muted block text-[11px]">Simulated Total 24h MPA AUC:</span>
              <div className="flex items-baseline gap-2">
                <span className="font-mono font-bold text-fg text-base">{ehcResult.effectiveAuc0_24} mg&middot;h/L</span>
                <span className="text-[11px] text-muted">
                  (Baseline: {ehcResult.baselineAuc0_24} mg&middot;h/L)
                </span>
                <Badge
                  tone={ehcResult.aucPercentChange < -25 ? "danger" : ehcResult.aucPercentChange < -10 ? "warn" : "ok"}
                  className="text-[10px]"
                >
                  {ehcResult.aucPercentChange < 0 ? `${ehcResult.aucPercentChange}% AUC DROP` : "EHC INTACT"}
                </Badge>
              </div>
            </div>
            <div className="text-right text-[11px]">
              <span className="text-muted block">Secondary Peak at 8h:</span>
              <span className="font-mono font-bold text-fg">
                {ehcResult.secondaryPeakCmaxMcgMl} mcg/mL
              </span>
              <span className="text-[10px] text-muted block">
                ({ehcResult.secondaryPeakAbolished ? "Abolished" : `${ehcResult.secondaryPeakContributionPct}% of AUC`})
              </span>
            </div>
          </div>
          <div className="space-y-1">
            {ehcResult.mechanisticNotes.map((note, idx) => (
              <p key={idx} className="text-[11px] text-fg leading-relaxed">&bull; {note}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Corticosteroid Taper & Dynamic CNI Rebound Model */}
      <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-accent" />
          <span className="font-serif font-bold text-sm text-fg">
            Steroid Taper &amp; CNI Clearance Rebound Model
          </span>
        </div>
        <p className="text-muted text-[11px] leading-relaxed">
          High-dose steroids induce CYP3A4/P-gp via PXR. As prednisone is tapered down, enzyme induction fades, CNI clearance drops, and trough levels surge by 30–50%, triggering acute nephrotoxicity unless doses are proactively tapered.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] text-muted block mb-1">Current CNI Trough (ng/mL):</label>
            <Input
              type="number"
              step="0.5"
              value={currentCniTrough}
              onChange={(e) => setCurrentCniTrough(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted block mb-1">Starting Prednisone (mg/day):</label>
            <Input
              type="number"
              step="5"
              value={startingSteroidMg}
              onChange={(e) => setStartingSteroidMg(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted block mb-1">Tapered Target Prednisone (mg/day):</label>
            <Input
              type="number"
              step="2.5"
              value={taperedSteroidMg}
              onChange={(e) => setTaperedSteroidMg(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
        </div>

        {/* Steroid Taper Projection Result */}
        <div className="rounded-md border border-border bg-surface-sunken p-3.5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-fg text-xs">
              Projected Trough Concentration Post-Taper
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-muted text-xs">{numCniTrough} ng/mL</span>
              <ArrowRight className="h-3.5 w-3.5 text-accent" />
              <span className="font-mono font-bold text-danger text-sm">{taperResult.projectedReboundTroughNgMl} ng/mL</span>
              <Badge tone="danger" className="text-[9px]">
                -{taperResult.predictedCniClearanceReductionPct}% Cl DROP
              </Badge>
            </div>
          </div>
          <p className="text-[11px] text-fg leading-relaxed">{taperResult.recommendedAction}</p>
        </div>
      </div>

      {/* Critical Collisions & Incompatibilities */}
      {report.collisions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-danger" />
            <span className="font-serif font-bold text-sm text-fg">
              Detected Transplant Collisions &amp; Pharmacokinetic Clashes ({report.collisions.length})
            </span>
          </div>
          <div className="space-y-3">
            {report.collisions.map((col, idx) => (
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
                  <span className="font-semibold text-sm text-fg">{col.title}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      tone={col.severity === "critical" ? "danger" : col.severity === "high" ? "warn" : "accent"}
                      className="text-[10px] uppercase font-mono"
                    >
                      {col.severity}
                    </Badge>
                    <Badge tone="default" className="text-[10px]">
                      {col.mechanismCategory}
                    </Badge>
                  </div>
                </div>
                <p className="text-fg leading-relaxed">{col.pharmacologicalMechanism}</p>
                <div className="rounded bg-surface-sunken p-2.5 border border-border text-[11px] space-y-1">
                  <p className="font-medium text-fg">
                    <span className="text-danger font-bold">Clinical Hazard: </span>
                    {col.clinicalHazard}
                  </p>
                  <p className="text-muted text-[10px]">
                    <span className="font-medium text-fg">Mitigation: </span>
                    {col.monitoringAndMitigation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Surgical Wound & mTOR Warning */}
      {report.surgicalWoundAdvisory && (
        <div className="rounded-md border border-warn/40 bg-warn-soft/20 p-4 space-y-2">
          <div className="flex items-center gap-2 text-warn font-semibold text-xs">
            <AlertTriangle className="h-4 w-4" />
            <span>Surgical Wound Dehiscence &amp; Anastomotic Complication Alert</span>
          </div>
          <p className="text-fg leading-relaxed">
            mTOR inhibitors (sirolimus, everolimus) inhibit VEGF and fibroblast collagen synthesis. Initiation within the early post-operative period risks fatal bronchial dehiscence (lung), hepatic artery thrombosis (liver), and massive perinephric lymphoceles (kidney).
          </p>
          <div className="rounded bg-surface p-2.5 border border-border text-[11px]">
            <p className="font-medium text-fg">
              <span className="text-warn font-bold">Safe Initiation Window: </span>
              {report.surgicalWoundAdvisory.recommendedHoldWindowWeeks}
            </p>
          </div>
        </div>
      )}

      {/* High-Yield Clinical Pharmacology Pearls */}
      <div className="rounded-lg border border-accent/30 bg-accent-soft/20 p-4 space-y-2 text-xs">
        <div className="flex items-center gap-1.5 text-accent font-semibold text-sm">
          <Sparkles className="h-4 w-4" />
          <span>Solid Organ Transplant Clinical Pearls</span>
        </div>
        <ul className="space-y-1.5 list-disc list-inside text-fg leading-relaxed">
          {report.hostVulnerabilities.clinicalAdvisories.map((pearl, idx) => (
            <li key={idx}>{pearl}</li>
          ))}
        </ul>
      </div>

      {/* Statutory Regulatory Disclaimer */}
      <p className="text-[11px] leading-relaxed text-muted border-t border-border pt-3">
        {TRANSPLANT_CDS_REGULATORY_NOTICE}
      </p>
    </div>
  );
}

