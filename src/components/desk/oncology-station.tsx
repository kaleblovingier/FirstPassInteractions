import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, Sparkles, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { HostContext } from "@/lib/drugs/types";
import {
  calculateLeucovorinRescue,
  detectMtxCollisions,
  evaluateCniTriazoleCollision,
  evaluateGlucarpidaseCriteria,
  evaluateMtxElimination,
  evaluateThiopurineXoCollision,
  evaluateUrineAlkalinization,
  HDMTX_MILESTONES,
  mtxMgLToUmol,
  mtxUmolToMgL,
  oncologyReportOnDesk,
  ONCOLOGY_CITATIONS,
  ONCOLOGY_KINETICS_REGULATORY_DISCLAIMER,
} from "@/lib/drugs/oncology-kinetics";

export function OncologyPanel({ ids, host }: { ids: string[]; host: HostContext }) {
  const report = useMemo(() => oncologyReportOnDesk(ids, host), [ids.join("|"), host.kidney, host.age]);

  // HDMTX Interactive State
  const [postInfusionHours, setPostInfusionHours] = useState<number>(48);
  const [mtxConcentration, setMtxConcentration] = useState<string>("2.2");
  const [concentrationUnit, setConcentrationUnit] = useState<"umol" | "mgl">("umol");
  const [baselineCr, setBaselineCr] = useState<string>("0.9");
  const [currentCr, setCurrentCr] = useState<string>("1.5");
  const [urinePh, setUrinePh] = useState<string>("7.2");
  const [hydrationLiters, setHydrationLiters] = useState<string>("3.5");

  // Converted numeric values
  const numMtxInput = Math.max(0, Number(mtxConcentration) || 0);
  const mtxUmol = concentrationUnit === "umol" ? numMtxInput : mtxMgLToUmol(numMtxInput);
  const mtxMgL = concentrationUnit === "mgl" ? numMtxInput : mtxUmolToMgL(numMtxInput);
  const numBaselineCr = Math.max(0.2, Number(baselineCr) || 0.9);
  const numCurrentCr = Math.max(0.2, Number(currentCr) || 1.5);
  const numUrinePh = Math.max(4.0, Math.min(9.0, Number(urinePh) || 7.2));
  const numHydration = Math.max(0.5, Number(hydrationLiters) || 3.5);

  // Computations
  const eliminationEval = useMemo(
    () => evaluateMtxElimination(postInfusionHours, mtxUmol),
    [postInfusionHours, mtxUmol],
  );

  const leucovorinEval = useMemo(
    () => calculateLeucovorinRescue(postInfusionHours, mtxUmol),
    [postInfusionHours, mtxUmol],
  );

  const glucarpidaseEval = useMemo(
    () =>
      evaluateGlucarpidaseCriteria({
        hoursPostStart: postInfusionHours,
        mtxConcentrationUmolL: mtxUmol,
        baselineScrMgDl: numBaselineCr,
        currentScrMgDl: numCurrentCr,
      }),
    [postInfusionHours, mtxUmol, numBaselineCr, numCurrentCr],
  );

  const urineEval = useMemo(
    () =>
      evaluateUrineAlkalinization({
        urinePh: numUrinePh,
        hydrationRateLPerM2Day: numHydration,
      }),
    [numUrinePh, numHydration],
  );

  const mtxCollisions = useMemo(() => detectMtxCollisions(ids), [ids.join("|")]);
  const thiopurineEval = useMemo(() => evaluateThiopurineXoCollision(ids, host), [ids.join("|"), host.phenotypes]);
  const cniEval = useMemo(() => evaluateCniTriazoleCollision(ids), [ids.join("|")]);

  return (
    <div className="space-y-6 text-xs text-fg">
      {/* Header Banner */}
      <div className="rounded-lg bg-surface-sunken p-4 border border-border space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-accent" />
            <span className="font-serif font-bold text-sm tracking-tight text-fg">
              Oncology Antimetabolite, Immunosuppressant & Rescue Station
            </span>
          </div>
          <Badge
            tone={
              report.overallRiskTier === "critical"
                ? "danger"
                : report.overallRiskTier === "high"
                  ? "warn"
                  : report.overallRiskTier === "moderate"
                    ? "accent"
                    : "ok"
            }
            className="font-mono uppercase text-[10px]"
          >
            Risk: {report.overallRiskTier}
          </Badge>
        </div>
        <p className="text-muted leading-relaxed">
          High-Dose Methotrexate (HDMTX) kinetics, Leucovorin rescue nomogram (Bleyer), Glucarpidase salvage
          criteria, Thiopurine (6-MP/AZA) &amp; xanthine oxidase diversion, and Calcineurin inhibitor (Tacrolimus/Cyclosporine)
          triazole trough amplification.
        </p>
      </div>

      {/* Critical Desk Collisions Alert */}
      {report.hdmtxReport.collisions.length > 0 ? (
        <div className="rounded-md border border-danger/40 bg-danger-soft/20 p-4 space-y-3">
          <div className="flex items-center gap-2 text-danger font-semibold text-sm">
            <ShieldAlert className="h-4 w-4" />
            <span>Detected Methotrexate Transporter Collisions ({report.hdmtxReport.collisions.length})</span>
          </div>
          <div className="space-y-2">
            {report.hdmtxReport.collisions.map((c) => (
              <div key={c.drugId} className="rounded border border-danger/30 bg-surface p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-fg">{c.drugName} ({c.collisionClass.toUpperCase()})</span>
                  <Badge tone={c.severity === "contraindicated" ? "danger" : "warn"} className="text-[10px] uppercase font-mono">
                    {c.severity}
                  </Badge>
                </div>
                <p className="text-muted">{c.hazard}</p>
                <p className="text-danger font-medium text-[11px]">{c.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* SECTION 1: HIGH-DOSE METHOTREXATE KINETICS & RESCUE */}
      <section className="rounded-lg border border-border bg-surface p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
          <div>
            <h3 className="font-serif font-bold text-sm text-fg">
              1. High-Dose Methotrexate (HDMTX) Elimination & Rescue Nomogram
            </h3>
            <p className="text-muted text-[11px]">
              Canonical elimination curve, folinic acid dose escalation, and Voraxaze salvage decision support.
            </p>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-muted">
            <span>Targets: 24h &le; 5.0 &micro;M &bull; 48h &le; 1.0 &micro;M &bull; 72h &le; 0.1 &micro;M</span>
          </div>
        </div>

        {/* Interactive Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">Hours Post-Infusion Start</label>
            <div className="flex gap-1">
              {[24, 36, 42, 48, 72].map((hr) => (
                <button
                  key={hr}
                  type="button"
                  onClick={() => setPostInfusionHours(hr)}
                  className={cn(
                    "flex-1 rounded border py-1.5 text-xs font-mono transition-colors",
                    postInfusionHours === hr
                      ? "border-accent bg-accent text-accent-fg font-semibold"
                      : "border-border bg-surface-sunken text-muted hover:text-fg",
                  )}
                >
                  {hr}h
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-muted">Serum Methotrexate</label>
              <button
                type="button"
                onClick={() => setConcentrationUnit(concentrationUnit === "umol" ? "mgl" : "umol")}
                className="text-[10px] text-accent underline font-mono"
              >
                Unit: {concentrationUnit === "umol" ? "µmol/L (µM)" : "mg/L (µg/mL)"}
              </button>
            </div>
            <Input
              type="number"
              step="0.1"
              value={mtxConcentration}
              onChange={(e) => setMtxConcentration(e.target.value)}
              className="h-9 font-mono text-xs"
              placeholder="e.g. 2.2"
            />
            <span className="text-[10px] text-muted block mt-0.5">
              Equiv: {concentrationUnit === "umol" ? `${mtxMgL.toFixed(3)} mg/L` : `${mtxUmol.toFixed(2)} µmol/L`}
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">Renal Trend (Baseline &rarr; Current Cr)</label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                step="0.1"
                value={baselineCr}
                onChange={(e) => setBaselineCr(e.target.value)}
                className="h-9 font-mono text-xs w-1/2"
                placeholder="Base"
              />
              <span className="text-muted">&rarr;</span>
              <Input
                type="number"
                step="0.1"
                value={currentCr}
                onChange={(e) => setCurrentCr(e.target.value)}
                className="h-9 font-mono text-xs w-1/2"
                placeholder="Current"
              />
            </div>
            <span className="text-[10px] text-muted block mt-0.5">
              Cr Delta: {(((numCurrentCr - numBaselineCr) / numBaselineCr) * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Results Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {/* Elimination Curve Card */}
          <div
            className={cn(
              "rounded border p-3 space-y-1.5",
              eliminationEval?.isDelayed ? "border-danger/40 bg-danger-soft/10" : "border-ok/40 bg-ok-soft/10",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-fg">Elimination Trajectory</span>
              <Badge
                tone={eliminationEval?.isDelayed ? "danger" : "ok"}
                className="text-[10px] uppercase font-mono"
              >
                {eliminationEval?.status}
              </Badge>
            </div>
            <p className="text-[11px] text-muted">
              At {postInfusionHours}h: measured <span className="font-mono font-semibold">{mtxUmol.toFixed(2)} &micro;M</span>{" "}
              vs target threshold &le;{" "}
              <span className="font-mono font-semibold">{eliminationEval?.targetCutoffUmolL} &micro;M</span>.
            </p>
            <p className="text-[11px] text-fg font-medium">{eliminationEval?.clinicalImplication}</p>
          </div>

          {/* Leucovorin Rescue Nomogram Card */}
          {leucovorinEval ? (
            <div
              className={cn(
                "rounded border p-3 space-y-1.5",
                leucovorinEval.tier !== "standard" ? "border-warning/40 bg-warning-soft/10" : "border-border bg-surface-sunken",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-fg">Leucovorin Nomogram</span>
                <Badge tone="accent" className="text-[10px] uppercase font-mono">
                  {leucovorinEval.tier}
                </Badge>
              </div>
              <p className="text-[11px] font-mono font-semibold text-fg">{leucovorinEval.actionSummary}</p>
              <p className="text-[11px] text-muted leading-relaxed">{leucovorinEval.routeRationale}</p>
              {leucovorinEval.route === "IV strictly" ? (
                <span className="block text-[10px] text-danger font-semibold">
                  * Oral RFC-1 transporter saturated at doses &gt; 25 mg; IV strictly required.
                </span>
              ) : null}
            </div>
          ) : null}

          {/* Glucarpidase Salvage Card */}
          {glucarpidaseEval ? (
            <div
              className={cn(
                "rounded border p-3 space-y-1.5",
                glucarpidaseEval.meetsSalvageCriteria ? "border-danger bg-danger-soft/20" : "border-border bg-surface-sunken",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-fg">Glucarpidase (Voraxaze)</span>
                <Badge
                  tone={glucarpidaseEval.meetsSalvageCriteria ? "danger" : "default"}
                  className="text-[10px] uppercase font-mono"
                >
                  {glucarpidaseEval.meetsSalvageCriteria ? "Candidate" : "Not Candidate"}
                </Badge>
              </div>
              <p className="text-[11px] text-fg leading-relaxed">{glucarpidaseEval.clinicalGuidance}</p>
              <p className="text-[10px] text-danger font-medium leading-tight">
                {glucarpidaseEval.criticalTimingWarning}
              </p>
            </div>
          ) : null}
        </div>

        {/* Urine Alkalinization Bar */}
        {urineEval ? (
          <div className="rounded border border-border bg-surface-sunken p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-fg">Tubular Acidification & Precipitation Safeguards</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] text-muted">Urine pH:</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={urinePh}
                    onChange={(e) => setUrinePh(e.target.value)}
                    className="h-7 w-16 font-mono text-xs"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] text-muted">Hydration (L/m²/d):</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={hydrationLiters}
                    onChange={(e) => setHydrationLiters(e.target.value)}
                    className="h-7 w-16 font-mono text-xs"
                  />
                </div>
              </div>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              {urineEval.clinicalGuidance} Solubility expands from &sim;0.44 mmol/L at pH 5.0 to &gt;22 mmol/L at pH &ge; 7.0.
            </p>
          </div>
        ) : null}

        {/* Transporter Collisions Table */}
        {mtxCollisions.length > 0 ? (
          <div className="space-y-1.5">
            <span className="font-semibold text-xs text-danger block">
              Active Transporter Collisions on Desk ({mtxCollisions.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {mtxCollisions.map((col) => (
                <div key={col.drugId} className="rounded border border-danger/30 bg-surface p-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-fg">{col.drugName}</span>
                    <Badge tone="danger" className="text-[9px] uppercase">
                      {col.collisionClass}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted">{col.transporterOrMechanism}: {col.hazard}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* SECTION 2: THIOPURINE & XANTHINE OXIDASE ENGINE */}
      <section className="rounded-lg border border-border bg-surface p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div>
            <h3 className="font-serif font-bold text-sm text-fg">
              2. Thiopurine (6-MP / Azathioprine) &times; Xanthine Oxidase (XO) Shunt
            </h3>
            <p className="text-muted text-[11px]">
              Metabolic bypass diverting purine antimetabolites into cytotoxic 6-thioguanine nucleotides (6-TGN).
            </p>
          </div>
          <Badge
            tone={thiopurineEval.hasCollision ? "danger" : "default"}
            className="text-[10px] uppercase font-mono"
          >
            {thiopurineEval.hasCollision ? thiopurineEval.severity : "No Co-prescription"}
          </Badge>
        </div>

        {thiopurineEval.hasCollision ? (
          <div className="rounded border border-danger/40 bg-danger-soft/15 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-danger">
                Collision: {thiopurineEval.thiopurineAgent} + {thiopurineEval.xoInhibitorAgent}
              </span>
              <span className="font-mono font-bold text-danger text-xs">
                MANDATORY {thiopurineEval.requiredDoseReductionPercent}% DOSE REDUCTION
              </span>
            </div>
            <p className="text-[11px] text-fg leading-relaxed">{thiopurineEval.biochemicalMechanism}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="rounded bg-surface p-2 border border-border">
                <span className="font-semibold block text-fg">TPMT Pharmacogenomics</span>
                <span className="text-muted">{thiopurineEval.pharmacogenomicSynergy.tpmtRiskDescription}</span>
              </div>
              <div className="rounded bg-surface p-2 border border-border">
                <span className="font-semibold block text-fg">NUDT15 Pharmacogenomics</span>
                <span className="text-muted">{thiopurineEval.pharmacogenomicSynergy.nudt15RiskDescription}</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted text-[11px]">
            Co-administering allopurinol or febuxostat with azathioprine or 6-mercaptopurine blocks the primary 6-thiouric acid
            clearance pathway. Shunting to HGPRT multiplies cytotoxic 6-TGN by 400–500%, precipitating fatal pancytopenia unless
            the thiopurine dose is reduced by 67% to 75%.
          </p>
        )}
      </section>

      {/* SECTION 3: CALCINEURIN INHIBITOR & TRIAZOLE TROUGHS */}
      <section className="rounded-lg border border-border bg-surface p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div>
            <h3 className="font-serif font-bold text-sm text-fg">
              3. Calcineurin Inhibitors (Tacrolimus / Cyclosporine) &times; Triazole Antifungals
            </h3>
            <p className="text-muted text-[11px]">
              CYP3A4/3A5 and enterocyte P-gp inhibition causing 3- to 5-fold elevation in immunosuppressive troughs.
            </p>
          </div>
          <Badge
            tone={cniEval.hasCollision ? "warn" : "default"}
            className="text-[10px] uppercase font-mono"
          >
            {cniEval.hasCollision ? cniEval.severity : "No Co-prescription"}
          </Badge>
        </div>

        {cniEval.hasCollision ? (
          <div className="rounded border border-warning/40 bg-warning-soft/15 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-warning">
                Collision: {cniEval.cniAgent} + {cniEval.triazoleAgent}
              </span>
              <span className="font-mono text-xs font-semibold text-fg">
                Target Trough: {cniEval.targetTroughRange?.troughRangeNgMl ?? "TDM Required"}
              </span>
            </div>
            <p className="text-[11px] text-fg leading-relaxed">{cniEval.molecularMechanism}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="rounded bg-surface p-2 border border-border">
                <span className="font-semibold block text-fg">Dose Modification Strategy</span>
                <span className="text-muted">Empiric proactive reduction of {cniEval.recommendedEmpiricDoseReductionPercent}% upon triazole initiation.</span>
              </div>
              <div className="rounded bg-surface p-2 border border-border">
                <span className="font-semibold block text-fg">TDM Monitoring Rails</span>
                <span className="text-muted">{cniEval.monitoringFrequencyGuidance}</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted text-[11px]">
            Triazole antifungals (voriconazole, posaconazole, isavuconazole, itraconazole) potently inhibit intestinal and hepatic
            CYP3A4/3A5 and P-glycoprotein. Without proactive 60–75% empiric dose reduction of tacrolimus, toxic trough accumulation
            triggers afferent arteriolar acute kidney injury, posterior reversible encephalopathy syndrome (PRES), and thrombotic microangiopathy.
          </p>
        )}
      </section>

      {/* Clinical Pearls Shelf */}
      <section className="rounded-lg border border-accent/30 bg-accent-soft/15 p-4 space-y-2">
        <div className="flex items-center gap-2 text-accent font-semibold text-xs">
          <Sparkles className="h-4 w-4" />
          <span>High-Yield Oncology Clinical Pearls</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-[11px] text-muted leading-relaxed">
          {report.clinicalPearls.map((pearl, i) => (
            <li key={i}>{pearl}</li>
          ))}
        </ul>
      </section>

      {/* Regulatory Footer */}
      <div className="rounded bg-surface-sunken p-3 text-[10px] text-muted leading-relaxed border border-border">
        <p className="font-semibold text-fg mb-0.5">FD&amp;C Act &sect; 520(o)(1)(E) Non-Device Clinical Decision Support:</p>
        <p>{ONCOLOGY_KINETICS_REGULATORY_DISCLAIMER}</p>
      </div>
    </div>
  );
}

