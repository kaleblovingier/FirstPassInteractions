import { useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, ShieldAlert, Sparkles, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { HostContext } from "@/lib/drugs/types";
import {
  calculateFosphenytoinEquivalent,
  calculateMichaelisMentenDose,
  calculatePhenytoinClearance,
  calculatePredictedCss,
  calculateSheinerTozer,
  estimateVmaxKmFromTwoPoints,
  evaluatePhenytoinLevel,
  evaluatePhenytoinPgx,
  findPhenytoinCollisions,
  phenytoinReportOnDesk,
  PHENYTOIN_CDS_DISCLAIMER,
  POPULATION_KM_MEAN_MG_L,
  POPULATION_VMAX_MEAN_MG_KG_DAY,
  simulateDoseTitrationJump,
  THERAPEUTIC_FREE_RANGE_MG_L,
  THERAPEUTIC_TOTAL_RANGE_MG_L,
} from "@/lib/drugs/phenytoin-kinetics";

export function PhenytoinPanel({ ids, host }: { ids: string[]; host: HostContext }) {
  // Phenytoin calculator states
  const [patientWeightKg, setPatientWeightKg] = useState<string>("70");
  const [observedTotal, setObservedTotal] = useState<string>("12.0");
  const [measuredFree, setMeasuredFree] = useState<string>("");
  const [serumAlbumin, setSerumAlbumin] = useState<string>(host.kidney === "ckd" ? "3.0" : "4.0");
  const [isEsrd, setIsEsrd] = useState<boolean>(host.kidney === "ckd");
  const [targetCss, setTargetCss] = useState<string>("15.0");
  const [currentDailyDose, setCurrentDailyDose] = useState<string>("300");

  const numWeight = Math.max(30, Math.min(250, Number(patientWeightKg) || 70));
  const numTotal = Math.max(0, Number(observedTotal) || 0);
  const numFree = measuredFree.trim() ? Math.max(0, Number(measuredFree)) : undefined;
  const numAlbumin = Math.max(0.5, Math.min(6.0, Number(serumAlbumin) || 4.0));
  const numTargetCss = Math.max(1, Math.min(40, Number(targetCss) || 15));
  const numCurrentDose = Math.max(50, Math.min(1000, Number(currentDailyDose) || 300));

  // Sheiner-Tozer correction
  const sheinerResult = useMemo(
    () => calculateSheinerTozer(numTotal, numAlbumin, isEsrd),
    [numTotal, numAlbumin, isEsrd],
  );

  // Level evaluation
  const levelEval = useMemo(
    () =>
      evaluatePhenytoinLevel({
        totalMcgMl: numTotal,
        measuredFreeMcgMl: numFree,
        albuminGDl: numAlbumin,
        isEsrdOrDialysis: isEsrd,
      }),
    [numTotal, numFree, numAlbumin, isEsrd],
  );

  // Michaelis-Menten dose needed for target Css
  const calculatedDoseForTarget = useMemo(
    () => calculateMichaelisMentenDose(numTargetCss, POPULATION_VMAX_MEAN_MG_KG_DAY, POPULATION_KM_MEAN_MG_L, numWeight),
    [numTargetCss, numWeight],
  );

  // Forward solve: predicted Css from current daily dose
  const forwardCss = useMemo(
    () => calculatePredictedCss(numCurrentDose, POPULATION_VMAX_MEAN_MG_KG_DAY, POPULATION_KM_MEAN_MG_L, numWeight),
    [numCurrentDose, numWeight],
  );

  // Clearance dynamics at current level
  const clAtCurrentLevel = useMemo(
    () =>
      calculatePhenytoinClearance(
        Math.max(1, forwardCss.predictedCss ?? 10),
        POPULATION_VMAX_MEAN_MG_KG_DAY,
        POPULATION_KM_MEAN_MG_L,
        numWeight,
      ),
    [forwardCss.predictedCss, numWeight],
  );

  // Titration jump simulation (e.g. 20% jump)
  const titrationSimulation = useMemo(
    () =>
      simulateDoseTitrationJump(
        numCurrentDose,
        20,
        numWeight * POPULATION_VMAX_MEAN_MG_KG_DAY,
        POPULATION_KM_MEAN_MG_L,
      ),
    [numCurrentDose, numWeight],
  );

  // Master report
  const report = useMemo(
    () =>
      phenytoinReportOnDesk(ids, host, {
        totalMcgMl: numTotal,
        measuredFreeMcgMl: numFree,
        albuminGDl: numAlbumin,
        isEsrdOrDialysis: isEsrd,
        weightKg: numWeight,
        dailyDoseMg: numCurrentDose,
      }),
    [ids.join("|"), host, numTotal, numFree, numAlbumin, isEsrd, numWeight, numCurrentDose],
  );

  const fosphenytoinInfo = useMemo(() => calculateFosphenytoinEquivalent(numCurrentDose), [numCurrentDose]);
  const valproateCollision = report.collisions.find((c) => c.category === "valproate-double-hit");
  const hasClinicalParadox = report.levelEval.clinicalParadoxDetected;

  return (
    <div className="space-y-6 text-xs text-fg">
      {/* Header Banner */}
      <div className="rounded-lg bg-surface-sunken p-4 border border-border space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-accent" />
            <span className="font-serif font-bold text-sm tracking-tight text-fg">
              Phenytoin & Fosphenytoin Nonlinear Saturation Kinetics & Protein-Binding Station
            </span>
          </div>
          <Badge
            tone={hasClinicalParadox ? "danger" : "accent"}
            className="font-mono uppercase text-[10px]"
          >
            {hasClinicalParadox ? "Clinical Paradox Detected" : "Michaelis-Menten Active"}
          </Badge>
        </div>
        <p className="text-muted leading-relaxed">
          Nonlinear capacity-limited Michaelis-Menten elimination, zero-order saturation concentration jumps, Sheiner-Tozer
          hypoalbuminemia & ESRD corrections, and the Valproate albumin displacement double-hit paradox.
        </p>
      </div>

      {/* Valproate Double-Hit Paradox Banner */}
      {valproateCollision || hasClinicalParadox ? (
        <div className="rounded-md border border-danger/40 bg-danger-soft/20 p-4 space-y-2">
          <div className="flex items-center gap-2 text-danger font-semibold text-sm">
            <ShieldAlert className="h-4 w-4" />
            <span>Valproate &times; Phenytoin Double-Hit Paradox Alert</span>
          </div>
          <p className="text-fg leading-relaxed">
            {valproateCollision?.clinicalAction ||
              "Valproate displaces phenytoin from plasma albumin binding sites AND inhibits CYP2C9 metabolism. Total serum phenytoin appears falsely normal or low while active unbound free phenytoin surges into toxicity. DO NOT escalate dose based on total level alone!"}
          </p>
        </div>
      ) : null}

      {/* SECTION 1: NONLINEAR MICHAELIS-MENTEN SATURATION CALCULATOR */}
      <section className="rounded-lg border border-border bg-surface p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
          <div>
            <h3 className="font-serif font-bold text-sm text-fg">
              1. Capacity-Limited Michaelis-Menten Elimination & Dose Calculator
            </h3>
            <p className="text-muted text-[11px]">
              Daily Dose R = (Vmax &times; Css) / (Km + Css) &bull; Adult mean Vmax &sim; 7 mg/kg/day, Km &sim; 4 mg/L.
            </p>
          </div>
          <div className="text-[11px] font-mono text-muted">
            Target Therapeutic Range: {THERAPEUTIC_TOTAL_RANGE_MG_L.min}&ndash;{THERAPEUTIC_TOTAL_RANGE_MG_L.max} &micro;g/mL
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">Patient Weight (kg)</label>
            <Input
              type="number"
              step="1"
              value={patientWeightKg}
              onChange={(e) => setPatientWeightKg(e.target.value)}
              className="h-9 font-mono text-xs"
              placeholder="70 kg"
            />
            <span className="text-[10px] text-muted block mt-0.5">
              Vmax_total = {(numWeight * POPULATION_VMAX_MEAN_MG_KG_DAY).toFixed(0)} mg/day
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">Target Steady-State (Css, &micro;g/mL)</label>
            <Input
              type="number"
              step="1"
              value={targetCss}
              onChange={(e) => setTargetCss(e.target.value)}
              className="h-9 font-mono text-xs"
              placeholder="15.0"
            />
            <span className="text-[10px] text-muted block mt-0.5">Recommended: 10–20 &micro;g/mL</span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">Current Daily Dose (mg/day)</label>
            <Input
              type="number"
              step="25"
              value={currentDailyDose}
              onChange={(e) => setCurrentDailyDose(e.target.value)}
              className="h-9 font-mono text-xs"
              placeholder="300"
            />
            <span className="text-[10px] text-muted block mt-0.5">
              Saturation ratio: {((numCurrentDose / (numWeight * POPULATION_VMAX_MEAN_MG_KG_DAY)) * 100).toFixed(0)}%
            </span>
          </div>

          <div className="rounded border border-border bg-surface-sunken p-2.5 space-y-1">
            <span className="font-semibold block text-fg">Calculated Dose for Target</span>
            <span className="font-mono font-bold text-sm text-accent block">
              {calculatedDoseForTarget.toFixed(0)} mg/day
            </span>
            <span className="text-[10px] text-muted">
              Predicted Css from {numCurrentDose} mg:{" "}
              <strong className="text-fg font-mono">
                {forwardCss.predictedCss !== null ? `${forwardCss.predictedCss.toFixed(1)} µg/mL` : "Saturated"}
              </strong>
            </span>
          </div>
        </div>

        {/* Saturation Dynamics & Clearance Collapse */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="rounded border border-border bg-surface-sunken p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-fg">Clearance Collapse at Saturation</span>
              <span className="font-mono text-xs font-semibold text-accent">
                CL = {clAtCurrentLevel.clearanceLPerDay.toFixed(1)} L/day
              </span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              At low concentrations, elimination is rapid (CL &gt; 80 L/day). As concentration approaches 15–20 &micro;g/mL,
              clearance collapses by &gt;70% (CL &sim; 25 L/day), and at 35 &micro;g/mL drops to &sim;12 L/day.
            </p>
          </div>

          <div
            className={cn(
              "rounded border p-3 space-y-1.5",
              titrationSimulation.cssIncreasePct && titrationSimulation.cssIncreasePct >= 100
                ? "border-warning/50 bg-warning-soft/15"
                : "border-border bg-surface-sunken",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-fg">Zero-Order Saturation Jump Simulation</span>
              <Badge tone="warn" className="text-[10px] font-mono">
                +{titrationSimulation.doseIncreasePct}% Dose &rarr; +{titrationSimulation.cssIncreasePct ?? "N/A"}% Level
              </Badge>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              Titrating dose from {numCurrentDose} to {titrationSimulation.newDoseMg} mg/day (+{titrationSimulation.doseIncreasePct}%)
              spikes predicted Css to{" "}
              <strong className="text-danger font-mono">
                {titrationSimulation.newCssMgL !== null ? `${titrationSimulation.newCssMgL.toFixed(1)} µg/mL` : "Metabolic Saturation"}
              </strong>.
            </p>
            <p className="text-[10px] text-muted font-medium">{titrationSimulation.alert}</p>
          </div>
        </div>
      </section>

      {/* SECTION 2: SHEINER-TOZER PROTEIN BINDING CORRECTION */}
      <section className="rounded-lg border border-border bg-surface p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
          <div>
            <h3 className="font-serif font-bold text-sm text-fg">
              2. Sheiner-Tozer Albumin Normalization & Free Phenytoin
            </h3>
            <p className="text-muted text-[11px]">
              Corrects observed total level for hypoalbuminemia and altered uremic binding affinity in ESRD.
            </p>
          </div>
          <div className="text-[11px] font-mono text-muted">
            Therapeutic Free: {THERAPEUTIC_FREE_RANGE_MG_L.min}&ndash;{THERAPEUTIC_FREE_RANGE_MG_L.max} &micro;g/mL (fu = 0.10)
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">Observed Total Level (&micro;g/mL)</label>
            <Input
              type="number"
              step="0.5"
              value={observedTotal}
              onChange={(e) => setObservedTotal(e.target.value)}
              className="h-9 font-mono text-xs"
              placeholder="12.0"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">Measured Free Level (&micro;g/mL)</label>
            <Input
              type="number"
              step="0.1"
              value={measuredFree}
              onChange={(e) => setMeasuredFree(e.target.value)}
              className="h-9 font-mono text-xs"
              placeholder="Optional, e.g. 1.5"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">Serum Albumin (g/dL)</label>
            <Input
              type="number"
              step="0.1"
              value={serumAlbumin}
              onChange={(e) => setSerumAlbumin(e.target.value)}
              className="h-9 font-mono text-xs"
              placeholder="4.0"
            />
            <span className="text-[10px] text-muted block mt-0.5">Normal: 3.5–5.0 g/dL</span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">ESRD / CrCl &lt; 10 / Dialysis</label>
            <button
              type="button"
              onClick={() => setIsEsrd(!isEsrd)}
              className={cn(
                "h-9 w-full rounded border text-xs font-medium transition-colors",
                isEsrd ? "border-accent bg-accent text-accent-fg font-semibold" : "border-border bg-surface-sunken text-muted hover:text-fg",
              )}
            >
              {isEsrd ? "ESRD / Dialysis (0.1 Factor)" : "Normal Affinity (0.2 Factor)"}
            </button>
          </div>
        </div>

        {/* Correction Output Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
          <div className="rounded border border-border bg-surface-sunken p-3 space-y-1">
            <span className="font-semibold block text-fg">Sheiner-Tozer Adjusted Total</span>
            <span className="font-mono text-base font-bold text-accent block">
              {sheinerResult.adjustedTotalMcgMl.toFixed(1)} &micro;g/mL
            </span>
            <span className="text-muted">Formula: {sheinerResult.formulaUsed}</span>
          </div>

          <div className="rounded border border-border bg-surface-sunken p-3 space-y-1">
            <span className="font-semibold block text-fg">Estimated Free Active Fraction</span>
            <span className="font-mono text-base font-bold text-fg block">
              {sheinerResult.estimatedFreeMcgMl.toFixed(2)} &micro;g/mL
            </span>
            <span className="text-muted">Target: 1.0–2.0 &micro;g/mL</span>
          </div>

          <div className="rounded border border-border bg-surface-sunken p-3 space-y-1">
            <span className="font-semibold block text-fg">Clinical Classification</span>
            <Badge tone="accent" className="text-[10px] uppercase font-mono">
              Total: {levelEval.totalBand} &bull; Free: {levelEval.freeBand}
            </Badge>
            <span className="text-muted block text-[10px]">{levelEval.clinicalInterpretation}</span>
          </div>
        </div>
      </section>

      {/* SECTION 3: FOSPHENOXY & ADMINISTRATION RAILS */}
      <section className="rounded-lg border border-border bg-surface p-4 space-y-3">
        <h3 className="font-serif font-bold text-sm text-fg">
          3. Fosphenytoin Sodium (Cerebyx) Conversion & Administration Safety
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
          <div className="rounded border border-border bg-surface-sunken p-3 space-y-1.5">
            <span className="font-semibold block text-fg">Prodrug Stoichiometry & Conversion</span>
            <p className="text-muted leading-relaxed">
              Current daily dose {numCurrentDose} mg phenytoin sodium ={" "}
              <strong className="text-fg font-mono">{fosphenytoinInfo.fosphenytoinDoseMg.toFixed(0)} mg</strong> fosphenytoin sodium
              ({fosphenytoinInfo.peEquivalentDoseMg} mg PE).
            </p>
            <p className="text-accent font-medium leading-relaxed">{fosphenytoinInfo.purpleGloveSyndromeRisk}</p>
          </div>

          <div className="rounded border border-border bg-surface-sunken p-3 space-y-1.5">
            <span className="font-semibold block text-fg">Infusion Rate Rails & Enteral Feeds</span>
            <p className="text-muted leading-relaxed">
              Max infusion speed: <strong className="text-fg font-mono">{fosphenytoinInfo.maxInfusionRateMgPEPerMin} mg PE/min</strong> (vs {fosphenytoinInfo.maxPhenytoinInfusionRateMgPerMin} mg/min max for IV phenytoin).
            </p>
            <p className="text-warning font-medium leading-relaxed">
              Enteral tube feeds bind phenytoin suspension, reducing bioavailability by 50–70%. Hold feeds 1–2h before and after dose.
            </p>
          </div>
        </div>
      </section>

      {/* Clinical Pearls Shelf */}
      <section className="rounded-lg border border-accent/30 bg-accent-soft/15 p-4 space-y-2">
        <div className="flex items-center gap-2 text-accent font-semibold text-xs">
          <Sparkles className="h-4 w-4" />
          <span>Phenytoin Clinical Pharmacokinetics Pearls</span>
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
        <p>{PHENYTOIN_CDS_DISCLAIMER}</p>
      </div>
    </div>
  );
}

