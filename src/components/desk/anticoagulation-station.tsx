import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Droplets,
  FlaskConical,
  HeartPulse,
  Info,
  Layers,
  Scale,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { HostContext } from "@/lib/drugs/types";
import {
  ANTICOAGULATION_CDS_DISCLAIMER,
  ANTICOAGULANT_PROFILES,
  COAGULATION_LAB_TRAPS,
  anticoagulationReportOnDesk,
  calculate4FPccWarfarinDosing,
  calculateAndexanetAlfaDosing,
  calculateProtamineDosing,
  get4FPccOffLabelDoacGuidance,
  getIdarucizumabProtocol,
  type AnticoagulantProfile,
  type LabTrapItem,
} from "@/lib/drugs/anticoagulation-reversal";

export interface AnticoagulationStationProps {
  ids: string[];
  host: HostContext;
}

export function AnticoagulationStation({ ids, host }: AnticoagulationStationProps) {
  // Navigation / active section
  const [activeTab, setActiveTab] = useState<"calculators" | "comparison" | "lab-traps">("calculators");

  // --- Calculator 1: Andexanet alfa State ---
  const [andexTarget, setAndexTarget] = useState<"apixaban" | "rivaroxaban">("apixaban");
  const [andexDoseMg, setAndexDoseMg] = useState<number>(5);
  const [andexHoursElapsed, setAndexHoursElapsed] = useState<number>(4);

  // --- Calculator 2: 4F-PCC (Kcentra) State ---
  const [pccWeightKg, setPccWeightKg] = useState<number>(80);
  const [pccInr, setPccInr] = useState<number>(3.8);

  // --- Calculator 3: Protamine Sulfate State ---
  const [protamineAgent, setProtamineAgent] = useState<"heparin" | "enoxaparin" | "fondaparinux" | "dalteparin">("heparin");
  const [protamineDoseInput, setProtamineDoseInput] = useState<number>(5000); // 5000 U or 80 mg
  const [protamineHours, setProtamineHours] = useState<number>(1.0);
  const [hasFishAllergy, setHasFishAllergy] = useState<boolean>(false);
  const [hasPriorNph, setHasPriorNph] = useState<boolean>(false);
  const [hasVasectomy, setHasVasectomy] = useState<boolean>(false);

  // Report from current desk
  const deskReport = useMemo(
    () =>
      anticoagulationReportOnDesk(ids, host, {
        weightKg: pccWeightKg,
        baselineInr: pccInr,
        lastDoseMg: andexDoseMg,
        hoursSinceLastDose: andexHoursElapsed,
        fishAllergy: hasFishAllergy,
        priorNphInsulin: hasPriorNph,
        priorVasectomy: hasVasectomy,
      }),
    [ids.join("|"), host, pccWeightKg, pccInr, andexDoseMg, andexHoursElapsed, hasFishAllergy, hasPriorNph, hasVasectomy],
  );

  // Dynamic calculations
  const andexCalc = useMemo(
    () =>
      calculateAndexanetAlfaDosing({
        agent: andexTarget,
        lastDoseMg: andexDoseMg,
        hoursSinceLastDose: andexHoursElapsed,
      }),
    [andexTarget, andexDoseMg, andexHoursElapsed],
  );

  const pccCalc = useMemo(
    () =>
      calculate4FPccWarfarinDosing({
        baselineInr: pccInr,
        weightKg: pccWeightKg,
      }),
    [pccInr, pccWeightKg],
  );

  const pccDoacGuidance = useMemo(() => get4FPccOffLabelDoacGuidance(), []);

  const idarucizumabProto = useMemo(() => getIdarucizumabProtocol(), []);

  const protamineCalc = useMemo(
    () =>
      calculateProtamineDosing({
        agent: protamineAgent,
        doseUnitsOrMg: protamineDoseInput,
        hoursElapsed: protamineHours,
        fishAllergy: hasFishAllergy,
        priorNphInsulin: hasPriorNph,
        priorVasectomy: hasVasectomy,
      }),
    [protamineAgent, protamineDoseInput, protamineHours, hasFishAllergy, hasPriorNph, hasVasectomy],
  );

  return (
    <div className="space-y-6 text-xs text-fg">
      {/* 1. Header Banner & CDS Notice */}
      <div className="rounded-xl border border-border bg-surface-sunken p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-accent/15 p-2 text-accent">
              <Droplets className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-base font-bold tracking-tight text-fg">
                  Anticoagulation Reversal &amp; DOAC Hemostatic Station
                </span>
                <Badge tone="accent" className="font-mono text-[10px] uppercase">
                  FD&amp;C Act § 520(o)(1)(E) CDS
                </Badge>
              </div>
              <p className="text-[11px] text-muted">
                Direct FXa/FIIa inhibitors, Vitamin K Antagonists, Heparinoid reversal kinetics, ANNEXA-4 / RE-VERSE AD trial nomograms, and coagulation lab traps.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant={activeTab === "calculators" ? "default" : "secondary"}
              size="sm"
              onClick={() => setActiveTab("calculators")}
              className="text-xs"
            >
              <Zap className="mr-1.5 h-3.5 w-3.5" />
              Calculators
            </Button>
            <Button
              variant={activeTab === "comparison" ? "default" : "secondary"}
              size="sm"
              onClick={() => setActiveTab("comparison")}
              className="text-xs"
            >
              <Layers className="mr-1.5 h-3.5 w-3.5" />
              Agent Matrix
            </Button>
            <Button
              variant={activeTab === "lab-traps" ? "default" : "secondary"}
              size="sm"
              onClick={() => setActiveTab("lab-traps")}
              className="text-xs"
            >
              <FlaskConical className="mr-1.5 h-3.5 w-3.5" />
              Lab Traps ({COAGULATION_LAB_TRAPS.length})
            </Button>
          </div>
        </div>

        {/* Desk Detection Status Pill */}
        {deskReport.onDesk.hasAnticoagulant && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/60">
            <span className="text-[11px] font-medium text-muted">Active Anticoagulants on Desk:</span>
            {deskReport.onDesk.anticoagulants.map((id) => {
              const prof = ANTICOAGULANT_PROFILES[id];
              return (
                <Badge key={id} tone="danger" className="text-[11px]">
                  {prof?.name ?? id} ({prof?.class.replace(/-/g, " ")})
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. TAB 1: INTERACTIVE CALCULATORS */}
      {activeTab === "calculators" && (
        <div className="space-y-6">
          {/* CALCULATOR 1: Andexanet Alfa (Andexxa) */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-accent" />
                <span className="font-semibold text-sm text-fg">
                  Andexanet Alfa (Andexxa) Dosing Engine
                </span>
                <span className="text-muted text-[11px]">(ANNEXA-4 Trial Nomogram)</span>
              </div>
              <Badge tone={andexCalc.isHighDose ? "danger" : "info"} className="font-mono uppercase text-[11px]">
                {andexCalc.regimenTier} ({andexCalc.totalDoseMg} mg Total)
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Agent selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted">Target Direct FXa Inhibitor</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    type="button"
                    variant={andexTarget === "apixaban" ? "default" : "secondary"}
                    size="sm"
                    onClick={() => {
                      setAndexTarget("apixaban");
                      setAndexDoseMg(5);
                    }}
                    className="text-xs"
                  >
                    Apixaban (Eliquis)
                  </Button>
                  <Button
                    type="button"
                    variant={andexTarget === "rivaroxaban" ? "default" : "secondary"}
                    size="sm"
                    onClick={() => {
                      setAndexTarget("rivaroxaban");
                      setAndexDoseMg(20);
                    }}
                    className="text-xs"
                  >
                    Rivaroxaban (Xarelto)
                  </Button>
                </div>
              </div>

              {/* Dose input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <label className="font-medium text-muted">Last Dose Taken (mg)</label>
                  <span className="font-mono font-bold text-fg">{andexDoseMg} mg</span>
                </div>
                <Input
                  type="number"
                  min="2.5"
                  max="60"
                  step="2.5"
                  value={andexDoseMg}
                  onChange={(e) => setAndexDoseMg(Math.max(1, Number(e.target.value) || 5))}
                  className="h-9 text-xs"
                />
                <div className="flex gap-1 pt-1">
                  {andexTarget === "apixaban" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setAndexDoseMg(2.5)}
                        className="px-2 py-0.5 rounded bg-bg-sunken text-[10px] text-muted hover:text-fg"
                      >
                        2.5 mg
                      </button>
                      <button
                        type="button"
                        onClick={() => setAndexDoseMg(5)}
                        className="px-2 py-0.5 rounded bg-bg-sunken text-[10px] text-muted hover:text-fg"
                      >
                        5 mg (Std)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAndexDoseMg(10)}
                        className="px-2 py-0.5 rounded bg-bg-sunken text-[10px] text-muted hover:text-fg"
                      >
                        10 mg (VTE)
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setAndexDoseMg(10)}
                        className="px-2 py-0.5 rounded bg-bg-sunken text-[10px] text-muted hover:text-fg"
                      >
                        10 mg (Proph)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAndexDoseMg(15)}
                        className="px-2 py-0.5 rounded bg-bg-sunken text-[10px] text-muted hover:text-fg"
                      >
                        15 mg (DVT)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAndexDoseMg(20)}
                        className="px-2 py-0.5 rounded bg-bg-sunken text-[10px] text-muted hover:text-fg"
                      >
                        20 mg (Std)
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Hours Elapsed */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <label className="font-medium text-muted">Time Since Last Dose</label>
                  <span className="font-mono font-bold text-fg">{andexHoursElapsed} hours</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={andexHoursElapsed}
                  onChange={(e) => setAndexHoursElapsed(Number(e.target.value))}
                  className="mt-2 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-bg-sunken accent-accent"
                />
                <div className="flex justify-between text-[10px] text-muted">
                  <span>0.5h (Peak)</span>
                  <span className="font-bold text-accent">&le; 8h Cutoff</span>
                  <span>24h (Cleared)</span>
                </div>
              </div>
            </div>

            {/* Dosing Protocol Display Card */}
            <div className="rounded-lg bg-surface-sunken p-4 border border-border/80 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 border-r border-border/50 pr-4">
                  <div className="flex items-center gap-1.5 text-fg font-semibold">
                    <Zap className="h-4 w-4 text-accent" />
                    Phase 1: IV Bolus Administration
                  </div>
                  <div className="text-xl font-mono font-bold text-accent">
                    {andexCalc.ivBolusMg} mg IV
                  </div>
                  <p className="text-[11px] text-muted">
                    Infuse at target rate of <strong>{andexCalc.ivBolusRateMgMin} mg/min</strong> over{" "}
                    <strong>~{andexCalc.ivBolusDurationMinutes} minutes</strong>.
                  </p>
                </div>

                <div className="space-y-2 pl-2">
                  <div className="flex items-center gap-1.5 text-fg font-semibold">
                    <Clock className="h-4 w-4 text-accent" />
                    Phase 2: Continuous IV Infusion
                  </div>
                  <div className="text-xl font-mono font-bold text-accent">
                    {andexCalc.continuousInfusionMg} mg IV
                  </div>
                  <p className="text-[11px] text-muted">
                    Infuse immediately following bolus at <strong>{andexCalc.continuousInfusionRateMgMin} mg/min</strong> for{" "}
                    <strong>{andexCalc.continuousInfusionDurationHours} hours</strong> (120 minutes).
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="text-muted">
                  <strong>Vial Packaging:</strong> Requires {andexCalc.vialsRequired.vials100mgOnly} &times; 100 mg vials OR{" "}
                  {andexCalc.vialsRequired.vials200mgOnly} &times; 200 mg vials.
                </div>
                <div className="text-muted italic">
                  Mechanism: Catalytically inactive Factor Xa decoy (Ser419Ala, deleted Gla domain).
                </div>
              </div>
            </div>

            {/* Rationale & Warnings */}
            <div className="rounded-lg bg-danger/10 p-3 border border-danger/30 space-y-1.5 text-[11px]">
              <div className="flex items-center gap-1.5 font-semibold text-danger">
                <ShieldAlert className="h-4 w-4" />
                ANNEXA-4 Rebound Thrombosis &amp; Heparin Resistance Warning
              </div>
              <p className="text-fg leading-relaxed">
                {andexCalc.safetyWarnings.prothromboticRisk}
              </p>
              <p className="text-muted leading-relaxed">
                {andexCalc.safetyWarnings.heparinResistance}
              </p>
            </div>
          </div>

          {/* CALCULATOR 2: 4-Factor PCC (Kcentra) */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-accent" />
                <span className="font-semibold text-sm text-fg">
                  4-Factor PCC (Kcentra) Warfarin Reversal Nomogram
                </span>
                <span className="text-muted text-[11px]">(FDA Labeled INR Rails)</span>
              </div>
              <Badge tone={pccInr >= 2.0 ? "accent" : "default"} className="font-mono uppercase text-[11px]">
                {pccCalc.dosingTierUnitsPerKg > 0 ? `${pccCalc.dosingTierUnitsPerKg} Units/kg Tier` : "INR < 2.0 (Below Rail)"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sliders */}
              <div className="space-y-4">
                {/* Weight Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <label className="font-medium text-fg">Patient Body Weight (kg)</label>
                    <span className="font-mono font-bold text-accent">{pccWeightKg} kg</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="140"
                    step="1"
                    value={pccWeightKg}
                    onChange={(e) => setPccWeightKg(Number(e.target.value))}
                    className="mt-1 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-bg-sunken accent-accent"
                  />
                  <div className="flex justify-between text-[10px] text-muted">
                    <span>40 kg</span>
                    <span>70 kg (Reference)</span>
                    <span className="font-bold text-accent">100 kg (Dose Cap Threshold)</span>
                    <span>140 kg</span>
                  </div>
                </div>

                {/* Baseline INR Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <label className="font-medium text-fg">Pre-Treatment Baseline INR</label>
                    <span className="font-mono font-bold text-accent">INR {pccInr.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="1.5"
                    max="10.0"
                    step="0.1"
                    value={pccInr}
                    onChange={(e) => setPccInr(Number(e.target.value))}
                    className="mt-1 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-bg-sunken accent-accent"
                  />
                  <div className="flex justify-between text-[10px] text-muted">
                    <span>&lt; 2.0</span>
                    <span>2.0–3.9 (25 U/kg)</span>
                    <span>4.0–6.0 (35 U/kg)</span>
                    <span className="font-bold text-accent">&gt; 6.0 (50 U/kg)</span>
                  </div>
                </div>
              </div>

              {/* Output Card */}
              <div className="rounded-lg bg-surface-sunken p-4 border border-border/80 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[11px] font-medium text-muted">Administered 4F-PCC Dose</span>
                  <div className="text-2xl font-mono font-bold text-accent mt-1">
                    {pccCalc.cappedDoseUnits.toLocaleString()} Units Factor IX
                  </div>
                  <p className="text-[11px] text-muted mt-1 leading-relaxed">
                    Calculated: {pccCalc.calculatedUnitsRaw.toLocaleString()} units ({pccWeightKg} kg &times; {pccCalc.dosingTierUnitsPerKg} U/kg).{" "}
                    {pccCalc.calculatedUnitsRaw > pccCalc.cappedDoseUnits ? (
                      <span className="text-warn font-semibold">
                        Maximum dose cap of {pccCalc.maximumCapApplied.toLocaleString()} units enforced.
                      </span>
                    ) : (
                      "Within labeled maximum cap."
                    )}
                  </p>
                </div>

                {/* Concurrent Vitamin K Callout */}
                <div className="rounded-md bg-ok/10 p-2.5 border border-ok/30 space-y-1">
                  <div className="flex items-center gap-1.5 text-ok font-semibold text-[11px]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Mandatory Concurrent IV Vitamin K (Phytonadione)
                  </div>
                  <p className="text-[10px] text-fg leading-relaxed">
                    <strong>{pccCalc.mandatoryVitaminK.dose}</strong> via {pccCalc.mandatoryVitaminK.routeAndRate}.{" "}
                    <em>Factor VII decays in ~6 hours; without Vitamin K restoring hepatic synthesis, INR rebounds within 12–24h.</em>
                  </p>
                </div>
              </div>
            </div>

            {/* Off-label DOAC Reversal Callout */}
            <div className="rounded-lg bg-bg-sunken p-3 border border-border/60 text-[11px] space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-fg">
                <Info className="h-4 w-4 text-accent" />
                Off-Label 4F-PCC Guidance for DOAC Hemorrhage (Apixaban / Rivaroxaban / Edoxaban / Dabigatran)
              </div>
              <p className="text-muted leading-relaxed">
                When specific antidotes (Andexanet alfa or Idarucizumab) are unavailable: CHEST, ASH, and Neurocritical Care Society consensus recommends{" "}
                <strong>Fixed 2,000 units Factor IX IV</strong> (or weight-based 25–50 units/kg). 4F-PCC provides a supra-physiological factor surge to overcome competitive active-site inhibition. Vitamin K is NOT indicated for DOACs.
              </p>
            </div>
          </div>

          {/* CALCULATOR 3: Protamine Sulfate */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-accent" />
                <span className="font-semibold text-sm text-fg">
                  Protamine Sulfate Heparinoid Reversal Engine
                </span>
                <span className="text-muted text-[11px]">(Time-Decay Kinetics &amp; Safety Rails)</span>
              </div>
              <Badge
                tone={protamineCalc.isFondaparinuxZeroReversal ? "danger" : "accent"}
                className="font-mono uppercase text-[11px]"
              >
                {protamineCalc.isFondaparinuxZeroReversal ? "0% Reversal (Refractory)" : `${protamineCalc.calculatedProtamineDoseMg} mg IV`}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Agent Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted">Heparinoid Molecule</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    type="button"
                    variant={protamineAgent === "heparin" ? "default" : "secondary"}
                    size="sm"
                    onClick={() => {
                      setProtamineAgent("heparin");
                      setProtamineDoseInput(5000);
                    }}
                    className="text-xs"
                  >
                    UFH (Heparin)
                  </Button>
                  <Button
                    type="button"
                    variant={protamineAgent === "enoxaparin" ? "default" : "secondary"}
                    size="sm"
                    onClick={() => {
                      setProtamineAgent("enoxaparin");
                      setProtamineDoseInput(80);
                    }}
                    className="text-xs"
                  >
                    Enoxaparin (LMWH)
                  </Button>
                  <Button
                    type="button"
                    variant={protamineAgent === "dalteparin" ? "default" : "secondary"}
                    size="sm"
                    onClick={() => {
                      setProtamineAgent("dalteparin");
                      setProtamineDoseInput(5000);
                    }}
                    className="text-xs"
                  >
                    Dalteparin
                  </Button>
                  <Button
                    type="button"
                    variant={protamineAgent === "fondaparinux" ? "danger" : "secondary"}
                    size="sm"
                    onClick={() => {
                      setProtamineAgent("fondaparinux");
                      setProtamineDoseInput(7.5);
                    }}
                    className="text-xs"
                  >
                    Fondaparinux
                  </Button>
                </div>
              </div>

              {/* Dose Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <label className="font-medium text-muted">
                    {protamineAgent === "heparin" || protamineAgent === "dalteparin" ? "Dose Administered (Units)" : "Dose Administered (mg)"}
                  </label>
                  <span className="font-mono font-bold text-fg">
                    {protamineDoseInput} {protamineAgent === "heparin" || protamineAgent === "dalteparin" ? "Units" : "mg"}
                  </span>
                </div>
                <Input
                  type="number"
                  value={protamineDoseInput}
                  onChange={(e) => setProtamineDoseInput(Math.max(1, Number(e.target.value) || 100))}
                  className="h-9 text-xs"
                />
                <span className="text-[10px] text-muted">
                  {protamineAgent === "heparin" ? "Units administered in last 2–3 hours." : "Recent therapeutic dose."}
                </span>
              </div>

              {/* Hours Elapsed */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <label className="font-medium text-muted">Time Elapsed Since Infusion Stop / Dose</label>
                  <span className="font-mono font-bold text-fg">{protamineHours} hours</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="12"
                  step="0.1"
                  value={protamineHours}
                  onChange={(e) => setProtamineHours(Number(e.target.value))}
                  className="mt-2 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-bg-sunken accent-accent"
                />
                <div className="flex justify-between text-[10px] text-muted">
                  <span>Immediate (&lt;30m)</span>
                  <span>1h–2h</span>
                  <span>&gt; 2h (Decayed)</span>
                </div>
              </div>
            </div>

            {/* Anaphylaxis Screening Toggles */}
            <div className="rounded-lg bg-surface-sunken p-3 border border-border/80 space-y-2 text-[11px]">
              <span className="font-semibold text-fg flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-warn" />
                Severe Anaphylactoid &amp; Pulmonary Vasoconstriction Screening
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasFishAllergy}
                    onChange={(e) => setHasFishAllergy(e.target.checked)}
                    className="rounded border-border text-accent focus:ring-accent"
                  />
                  <span>Fish / Salmon Hypersensitivity</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasPriorNph}
                    onChange={(e) => setHasPriorNph(e.target.checked)}
                    className="rounded border-border text-accent focus:ring-accent"
                  />
                  <span>Prior NPH Insulin Exposure</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasVasectomy}
                    onChange={(e) => setHasVasectomy(e.target.checked)}
                    className="rounded border-border text-accent focus:ring-accent"
                  />
                  <span>Prior Vasectomy</span>
                </label>
              </div>
            </div>

            {/* Output Card */}
            <div
              className={cn(
                "rounded-lg p-4 border space-y-2",
                protamineCalc.isFondaparinuxZeroReversal
                  ? "bg-danger/15 border-danger/40"
                  : protamineCalc.anaphylactoidRiskFlags.isHighRiskAnaphylaxis
                  ? "bg-warn/15 border-warn/40"
                  : "bg-surface-sunken border-border/80",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-medium text-muted">Recommended Protamine Dose</span>
                  <div className="text-2xl font-mono font-bold text-fg mt-0.5">
                    {protamineCalc.calculatedProtamineDoseMg} mg IV
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-medium text-muted">Anticoagulant Neutralization</span>
                  <div className="font-mono font-semibold text-fg mt-0.5">
                    {protamineCalc.percentNeutralization}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-fg leading-relaxed">
                {protamineCalc.clinicalRationale}
              </p>

              <div className="pt-2 border-t border-border/50 text-[10px] text-muted flex justify-between">
                <span>{protamineCalc.administrationRate}</span>
                <span className="font-bold text-warn">Maximum single dose: 50 mg cap</span>
              </div>

              {protamineCalc.anaphylactoidRiskFlags.isHighRiskAnaphylaxis && (
                <div className="rounded bg-danger/15 p-2 border border-danger/30 text-[10px] text-danger font-medium">
                  {protamineCalc.anaphylactoidRiskFlags.pulmonaryVasoconstrictionWarning}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB 2: REVERSAL AGENTS COMPARATIVE MATRIX */}
      {activeTab === "comparison" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-serif text-base font-bold text-fg">Targeted Reversal Agents &amp; Benchmark Protocols</h3>
              <p className="text-muted text-[11px]">
                Molecular mechanisms, clinical trial evidence, and dosing regimens for specific antidotes and prothrombin complex concentrates.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-sunken text-muted">
                    <th className="p-3 font-semibold">Agent</th>
                    <th className="p-3 font-semibold">Target Anticoagulant</th>
                    <th className="p-3 font-semibold">Molecular Mechanism</th>
                    <th className="p-3 font-semibold">Trial Evidence</th>
                    <th className="p-3 font-semibold">Standard Regimen</th>
                    <th className="p-3 font-semibold">Onset &amp; Offset</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {/* Row 1: Andexanet alfa */}
                  <tr className="hover:bg-bg-sunken/50">
                    <td className="p-3 font-semibold text-fg">
                      Andexanet alfa
                      <div className="text-[10px] text-muted font-normal">Andexxa (recombinant decoy FXa)</div>
                    </td>
                    <td className="p-3">
                      <Badge tone="danger">Apixaban</Badge> <Badge tone="danger">Rivaroxaban</Badge>
                    </td>
                    <td className="p-3 text-muted">
                      Decoy Factor Xa with catalytic Ser419Ala mutation and deleted Gla domain. High-affinity stoichiometric sequestration of FXa inhibitors.
                    </td>
                    <td className="p-3 text-muted">
                      <strong>ANNEXA-4</strong> (82% good/excellent hemostatic efficacy; 92% anti-Xa reduction).
                    </td>
                    <td className="p-3 font-mono">
                      Low: 400 mg bolus + 480 mg inf.<br />
                      High: 800 mg bolus + 960 mg inf.
                    </td>
                    <td className="p-3 text-muted">Immediate onset (&lt;2 min); duration persists ~2h after infusion ends.</td>
                  </tr>

                  {/* Row 2: Idarucizumab */}
                  <tr className="hover:bg-bg-sunken/50">
                    <td className="p-3 font-semibold text-fg">
                      Idarucizumab
                      <div className="text-[10px] text-muted font-normal">Praxbind (humanized Fab)</div>
                    </td>
                    <td className="p-3">
                      <Badge tone="danger">Dabigatran</Badge>
                    </td>
                    <td className="p-3 text-muted">
                      Monoclonal antibody Fab fragment binding dabigatran with <strong>350-fold higher affinity</strong> than thrombin (Kd ~ 2.1 pM).
                    </td>
                    <td className="p-3 text-muted">
                      <strong>RE-VERSE AD</strong> (&gt;98% complete reversal within minutes; median hemostasis 2.5h).
                    </td>
                    <td className="p-3 font-mono">
                      Fixed <strong>5 g IV</strong> (two 2.5 g / 50 mL vials back-to-back within &le; 15 min).
                    </td>
                    <td className="p-3 text-muted">Immediate (complete reversal within minutes); renal clearance of Fab complex.</td>
                  </tr>

                  {/* Row 3: 4F-PCC */}
                  <tr className="hover:bg-bg-sunken/50">
                    <td className="p-3 font-semibold text-fg">
                      4-Factor PCC
                      <div className="text-[10px] text-muted font-normal">Kcentra (Factors II, VII, IX, X)</div>
                    </td>
                    <td className="p-3">
                      <Badge tone="danger">Warfarin</Badge>
                      <div className="text-[10px] text-muted mt-1">Off-label DOACs</div>
                    </td>
                    <td className="p-3 text-muted">
                      Purified human plasma factors II, VII, IX, X + Protein C/S + heparin. Restores depleted clotting factors immediately.
                    </td>
                    <td className="p-3 text-muted">
                      <strong>Sarode et al., Circulation 2013</strong> (Superior to FFP for rapid INR correction &amp; hemostasis).
                    </td>
                    <td className="p-3 font-mono">
                      INR 2–3.9: 25 U/kg<br />
                      INR 4–6: 35 U/kg<br />
                      INR &gt;6: 50 U/kg<br />
                      + <strong>Vit K 10 mg IV</strong>
                    </td>
                    <td className="p-3 text-muted">Immediate INR correction; sustained by concurrent Vitamin K synthesis.</td>
                  </tr>

                  {/* Row 4: Protamine sulfate */}
                  <tr className="hover:bg-bg-sunken/50">
                    <td className="p-3 font-semibold text-fg">
                      Protamine sulfate
                      <div className="text-[10px] text-muted font-normal">Basic polycationic peptide</div>
                    </td>
                    <td className="p-3">
                      <Badge tone="danger">Heparin (UFH)</Badge>
                      <Badge tone="warn" className="ml-1">Enoxaparin (partial)</Badge>
                    </td>
                    <td className="p-3 text-muted">
                      Strongly basic polycation neutralizing polyanionic heparin via electrostatic salt complexation.
                    </td>
                    <td className="p-3 text-muted">
                      Standard of care cardiopulmonary bypass &amp; ICU reversal.
                    </td>
                    <td className="p-3 font-mono">
                      1 mg per 100 U UFH (&le;30m)<br />
                      1 mg per 1 mg Enoxaparin (&le;8h)<br />
                      <strong>Max 50 mg cap</strong>
                    </td>
                    <td className="p-3 text-muted">Immediate onset (&lt;5 min). Fondaparinux is 100% refractory!</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 3: COAGULATION LAB TRAPS */}
      {activeTab === "lab-traps" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-serif text-base font-bold text-fg">Coagulation Laboratory Traps &amp; Monitoring Diagnostic Matrix</h3>
              <p className="text-muted text-[11px]">
                High-yield assay insensitivities, artifactual test elevations, and critical exclusion rules essential for emergency bedside assessment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {COAGULATION_LAB_TRAPS.map((trap, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-border bg-surface-sunken p-4 space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        tone={
                          trap.trapType === "misleading-normal"
                            ? "danger"
                            : trap.trapType === "exclusion-rule"
                            ? "ok"
                            : trap.trapType === "artifactual-elevation"
                            ? "warn"
                            : "accent"
                        }
                        className="font-mono uppercase text-[10px]"
                      >
                        {trap.trapType.replace(/-/g, " ")}
                      </Badge>
                      <span className="text-[11px] font-semibold text-fg">{trap.targetDrug}</span>
                    </div>

                    <div className="text-xs font-bold text-fg pt-1">
                      {trap.assayName}
                    </div>

                    <p className="text-[11px] font-medium text-danger leading-relaxed">
                      {trap.clinicalRule}
                    </p>
                  </div>

                  <p className="text-[10px] text-muted leading-relaxed border-t border-border/50 pt-2">
                    <strong>Biochemical Mechanism:</strong> {trap.underlyingMechanics}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Regulatory Footer */}
      <div className="rounded-lg bg-surface-sunken p-3 border border-border/60 text-[10px] text-muted leading-relaxed">
        <strong>Regulatory Notice:</strong> {ANTICOAGULATION_CDS_DISCLAIMER}
      </div>
    </div>
  );
}

/**
 * Standard alias for ClinicalBoard desk tab mounting.
 */
export const AnticoagulationPanel = AnticoagulationStation;
