import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Droplets,
  FlaskConical,
  Flame,
  HelpCircle,
  Info,
  Pill,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { HostContext } from "@/lib/drugs/types";
import {
  calculateRumackTreatmentLine,
  calculateRumackHighRiskLine,
  evaluateRumackMatthewNomogram,
  calculateOsmolalGap,
  calculateSalicylateIonization,
  calculateNaloxoneInfusionRate,
  toxicologyReportOnDesk,
  TOXICOLOGY_CDS_DISCLAIMER,
  APAP_CLINICAL_PHASES,
  NAC_IV_REGIMENS,
  NAC_ANAPHYLACTOID_MANAGEMENT,
  NAC_STOPPING_CRITERIA,
  TOXIC_ALCOHOL_PROFILES,
  FOMEPIZOLE_PROTOCOL,
  TOXIC_ALCOHOL_EXTRIP_HEMODIALYSIS,
  SALICYLATE_OVERDOSE_PROFILE,
  OPIOID_REVERSAL_PROFILE,
  type ApapNomogramBand,
} from "@/lib/drugs/toxicology-kinetics";

type ToxicStationTab = "apap" | "toxic-alcohol" | "salicylate" | "opioid" | "protocols";

export function ToxicologyStation({ ids, host }: { ids: string[]; host: HostContext }) {
  return <ToxicologyPanel ids={ids} host={host} />;
}

export function ToxicologyPanel({ ids, host }: { ids: string[]; host: HostContext }) {
  const [activeTab, setActiveTab] = useState<ToxicStationTab>("apap");

  // 1. APAP Nomogram Calculator State
  const [apapHours, setApapHours] = useState<string>("8");
  const [apapLevel, setApapLevel] = useState<string>("120");
  const [chronicAlcohol, setChronicAlcohol] = useState<boolean>(host.alcohol === "chronic");
  const [acuteAlcohol, setAcuteAlcohol] = useState<boolean>(host.alcohol === "acute");
  const [fastingMalnutrition, setFastingMalnutrition] = useState<boolean>(false);
  const [isoniazidCoIngestion, setIsoniazidCoIngestion] = useState<boolean>(false);

  // 2. Toxic Alcohol Osmolal Gap Calculator State
  const [measuredOsm, setMeasuredOsm] = useState<string>("330");
  const [serumSodium, setSerumSodium] = useState<string>("140");
  const [serumGlucose, setSerumGlucose] = useState<string>("90");
  const [serumBun, setSerumBun] = useState<string>("14");
  const [serumEthanol, setSerumEthanol] = useState<string>("0");

  // 3. Salicylate Ion-Trapping State
  const [urinePh, setUrinePh] = useState<string>("5.5");
  const [serumSalicylateLevel, setSerumSalicylateLevel] = useState<string>("45");

  // 4. Opioid Renarcotization Tracker State
  const [initialNaloxoneBolus, setInitialNaloxoneBolus] = useState<string>("0.4");

  // Numeric sanitizations
  const numApapHours = Math.max(0, Math.min(168, Number(apapHours) || 0));
  const numApapLevel = Math.max(0, Math.min(2500, Number(apapLevel) || 0));

  const numMeasuredOsm = Math.max(200, Math.min(500, Number(measuredOsm) || 290));
  const numSodium = Math.max(100, Math.min(180, Number(serumSodium) || 140));
  const numGlucose = Math.max(10, Math.min(2000, Number(serumGlucose) || 90));
  const numBun = Math.max(1, Math.min(200, Number(serumBun) || 14));
  const numEthanol = Math.max(0, Math.min(1000, Number(serumEthanol) || 0));

  const numUrinePh = Math.max(4.0, Math.min(9.0, Number(urinePh) || 5.5));
  const numSalicylate = Math.max(0, Math.min(200, Number(serumSalicylateLevel) || 0));
  const numNaloxoneBolus = Math.max(0.04, Math.min(20, Number(initialNaloxoneBolus) || 0.4));

  // Compute Evaluators
  const report = useMemo(
    () =>
      toxicologyReportOnDesk(ids, host, {
        apapNomogram: {
          hoursPostIngestion: numApapHours,
          serumApapMcgMl: numApapLevel,
          chronicAlcoholOrInducer: chronicAlcohol,
          acuteAlcoholCoIngestion: acuteAlcohol,
          malnutritionOrFasting: fastingMalnutrition,
          isoniazidCoIngestion: isoniazidCoIngestion,
        },
        osmolalGap: {
          measuredOsmolality: numMeasuredOsm,
          sodiumMeqL: numSodium,
          glucoseMgDl: numGlucose,
          bunMgDl: numBun,
          ethanolMgDl: numEthanol,
        },
        urinePhForSalicylate: numUrinePh,
        initialNaloxoneBolusMg: numNaloxoneBolus,
      }),
    [
      ids.join("|"),
      host,
      numApapHours,
      numApapLevel,
      chronicAlcohol,
      acuteAlcohol,
      fastingMalnutrition,
      isoniazidCoIngestion,
      numMeasuredOsm,
      numSodium,
      numGlucose,
      numBun,
      numEthanol,
      numUrinePh,
      numNaloxoneBolus,
    ],
  );

  const apapEval = report.apapEvaluation!;
  const osmEval = report.osmolalGapEvaluation!;
  const salEval = report.salicylateIonizationEvaluation!;
  const nlxCalc = report.naloxoneInfusionCalculation!;

  const getNomogramBadgeTone = (band: ApapNomogramBand) => {
    switch (band) {
      case "high-risk":
        return "danger";
      case "above-treatment":
        return "danger";
      case "below-treatment":
        return "ok";
      case "too-early":
        return "accent";
      case "late-presentation":
        return "danger";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-6 text-xs text-fg">
      {/* Header Banner */}
      <div className="rounded-lg bg-surface-sunken p-4 border border-border space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-accent" />
            <span className="font-serif font-bold text-sm tracking-tight text-fg">
              Emergency Toxicology, Nomograms &amp; Antidote Kinetics Station
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge
              tone={report.alerts.some((a) => a.tier === "critical") ? "danger" : report.onDesk.hasToxicologyAgent ? "accent" : "default"}
              className="font-mono uppercase text-[10px]"
            >
              {report.alerts.some((a) => a.tier === "critical")
                ? "Critical Toxicology Alert"
                : `${report.onDesk.allToxicologyIds.length} Toxicology Agents Active`}
            </Badge>
          </div>
        </div>
        <p className="text-muted leading-relaxed">
          FD&amp;C Act &sect; 520(o)(1)(E) non-device decision support: Rumack-Matthew APAP nomogram (150-treatment line &amp; Zone 3 necrosis), toxic alcohol serum osmolal gap &amp; co-factor pathways, salicylate Henderson-Hasselbalch ion-trapping &amp; paradoxical aciduria prevention, and naloxone half-life renarcotization titration.
        </p>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/60">
          <button
            type="button"
            onClick={() => setActiveTab("apap")}
            className={cn(
              "px-3 py-1.5 rounded-md font-medium text-xs transition-colors flex items-center gap-1.5",
              activeTab === "apap" ? "bg-accent text-bg font-semibold" : "bg-surface hover:bg-surface-elevated text-muted hover:text-fg",
            )}
          >
            <Pill className="h-3.5 w-3.5" />
            <span>APAP &amp; NAC Nomogram</span>
            {report.onDesk.hasApap && (
              <span className="h-2 w-2 rounded-full bg-danger animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("toxic-alcohol")}
            className={cn(
              "px-3 py-1.5 rounded-md font-medium text-xs transition-colors flex items-center gap-1.5",
              activeTab === "toxic-alcohol" ? "bg-accent text-bg font-semibold" : "bg-surface hover:bg-surface-elevated text-muted hover:text-fg",
            )}
          >
            <Droplets className="h-3.5 w-3.5" />
            <span>Toxic Alcohols &amp; Osmolal Gap</span>
            {report.onDesk.hasToxicAlcohol && (
              <span className="h-2 w-2 rounded-full bg-danger animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("salicylate")}
            className={cn(
              "px-3 py-1.5 rounded-md font-medium text-xs transition-colors flex items-center gap-1.5",
              activeTab === "salicylate" ? "bg-accent text-bg font-semibold" : "bg-surface hover:bg-surface-elevated text-muted hover:text-fg",
            )}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>Salicylate Ion-Trapping</span>
            {report.onDesk.hasSalicylate && (
              <span className="h-2 w-2 rounded-full bg-danger animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("opioid")}
            className={cn(
              "px-3 py-1.5 rounded-md font-medium text-xs transition-colors flex items-center gap-1.5",
              activeTab === "opioid" ? "bg-accent text-bg font-semibold" : "bg-surface hover:bg-surface-elevated text-muted hover:text-fg",
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Opioid Renarcotization</span>
            {report.onDesk.hasHighRenarcotizationRisk && (
              <span className="h-2 w-2 rounded-full bg-danger animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("protocols")}
            className={cn(
              "px-3 py-1.5 rounded-md font-medium text-xs transition-colors flex items-center gap-1.5",
              activeTab === "protocols" ? "bg-accent text-bg font-semibold" : "bg-surface hover:bg-surface-elevated text-muted hover:text-fg",
            )}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Clinical Protocols &amp; Pearls</span>
          </button>
        </div>
      </div>

      {/* Active High-Priority Alerts on Desk */}
      {report.alerts.length > 0 && (
        <div className="space-y-2">
          {report.alerts.map((alert, idx) => (
            <div
              key={idx}
              className={cn(
                "rounded-md border p-3 flex items-start gap-3 transition-all",
                alert.tier === "critical"
                  ? "border-danger/60 bg-danger-soft/20 text-fg"
                  : alert.tier === "warning"
                    ? "border-accent/40 bg-accent-soft/20 text-fg"
                    : "border-border bg-surface text-fg",
              )}
            >
              <AlertCircle
                className={cn(
                  "h-4 w-4 mt-0.5 shrink-0",
                  alert.tier === "critical" ? "text-danger" : alert.tier === "warning" ? "text-accent" : "text-muted",
                )}
              />
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs text-fg">{alert.title}</span>
                  <Badge
                    tone={alert.tier === "critical" ? "danger" : alert.tier === "warning" ? "accent" : "default"}
                    className="text-[9px] uppercase font-mono"
                  >
                    {alert.tier}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">{alert.rationale}</p>
                <div className="pt-1 text-[11px] font-medium text-fg">
                  <span className={alert.tier === "critical" ? "text-danger font-bold" : "text-accent font-bold"}>
                    Recommended Action:{" "}
                  </span>
                  {alert.actionGuidance}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 1: ACETAMINOPHEN (APAP) & RUMACK-MATTHEW NOMOGRAM                 */}
      {/* ===================================================================== */}
      {activeTab === "apap" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <span className="font-semibold text-fg text-sm">Rumack-Matthew Nomogram Calculator</span>
                <p className="text-muted text-[11px]">
                  Single acute ingestion (4 to 24 hours). Conventional 150 mcg/mL treatment threshold line at 4 hours.
                </p>
              </div>
              <Badge tone={getNomogramBadgeTone(apapEval.band)} className="text-[10px] uppercase font-mono">
                {apapEval.band.replace("-", " ")}
              </Badge>
            </div>

            {/* Input Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] text-muted block mb-1">Hours Post-Ingestion (h):</label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="168"
                  value={apapHours}
                  onChange={(e) => setApapHours(e.target.value)}
                  className="font-mono text-center font-bold text-xs text-fg"
                />
                <span className="text-[10px] text-muted mt-0.5 block">Nomogram valid 4–24 hours</span>
              </div>
              <div>
                <label className="text-[11px] text-muted block mb-1">Serum APAP Level (mcg/mL):</label>
                <Input
                  type="number"
                  step="5"
                  min="0"
                  max="2500"
                  value={apapLevel}
                  onChange={(e) => setApapLevel(e.target.value)}
                  className={cn(
                    "font-mono text-center font-bold text-xs",
                    apapEval.nacIndicated ? "text-danger border-danger" : "text-fg",
                  )}
                />
                <span className="text-[10px] text-muted mt-0.5 block">1 mcg/mL = 1 mg/L = 6.62 mcmol/L</span>
              </div>
              <div className="sm:col-span-2 space-y-2">
                <span className="text-[11px] text-muted block">High-Risk Modifiers &amp; Enzyme Inducers:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setChronicAlcohol(!chronicAlcohol)}
                    className={cn(
                      "px-2 py-1.5 rounded text-[11px] border text-left transition-colors",
                      chronicAlcohol ? "bg-accent text-bg border-accent font-semibold" : "bg-surface-sunken text-muted border-border hover:text-fg",
                    )}
                  >
                    Chronic Ethanol (CYP2E1 &uarr;)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAcuteAlcohol(!acuteAlcohol)}
                    className={cn(
                      "px-2 py-1.5 rounded text-[11px] border text-left transition-colors",
                      acuteAlcohol ? "bg-ok text-bg border-ok font-semibold" : "bg-surface-sunken text-muted border-border hover:text-fg",
                    )}
                  >
                    Acute Ethanol (2E1 Inhibitor)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFastingMalnutrition(!fastingMalnutrition)}
                    className={cn(
                      "px-2 py-1.5 rounded text-[11px] border text-left transition-colors",
                      fastingMalnutrition ? "bg-accent text-bg border-accent font-semibold" : "bg-surface-sunken text-muted border-border hover:text-fg",
                    )}
                  >
                    Malnutrition / Fasting (GSH &darr;)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsoniazidCoIngestion(!isoniazidCoIngestion)}
                    className={cn(
                      "px-2 py-1.5 rounded text-[11px] border text-left transition-colors",
                      isoniazidCoIngestion ? "bg-accent text-bg border-accent font-semibold" : "bg-surface-sunken text-muted border-border hover:text-fg",
                    )}
                  >
                    Isoniazid (CYP2E1 Inducer)
                  </button>
                </div>
              </div>
            </div>

            {/* Calculated Results Banner */}
            <div className={cn(
              "rounded-md border p-3 space-y-2",
              apapEval.nacIndicated ? "bg-danger-soft/20 border-danger/40" : "bg-surface-sunken border-border",
            )}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-fg">{apapEval.label}</span>
                <span className="font-mono text-[11px] font-bold text-muted">{apapEval.formulaUsed}</span>
              </div>
              <p className="text-[11px] text-fg leading-relaxed">{apapEval.clinicalGuidance}</p>
              <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border/60 text-[11px]">
                <div>
                  <span className="text-muted">150-Treatment Line: </span>
                  <span className="font-mono font-bold text-fg">
                    {apapEval.treatmentLineMcgMl !== null ? `${apapEval.treatmentLineMcgMl} mcg/mL` : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-muted">300 High-Risk Line: </span>
                  <span className="font-mono font-bold text-fg">
                    {apapEval.highRiskLineMcgMl !== null ? `${apapEval.highRiskLineMcgMl} mcg/mL` : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-muted">NAC Indicated: </span>
                  <span className={cn("font-bold", apapEval.nacIndicated ? "text-danger" : "text-ok")}>
                    {apapEval.nacIndicated ? "YES - INITIATE IMMEDIATELY" : "NO"}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-muted italic">{apapEval.toxicologyPearl}</p>
            </div>

            {/* Pathophysiology Box: NAPQI & Zone 3 Necrosis */}
            <div className="rounded-md border border-border bg-surface-sunken p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-accent font-semibold text-xs">
                <Zap className="h-3.5 w-3.5" />
                <span>CYP2E1 Reactive Electrophile Pathway &amp; Centrilobular Necrosis</span>
              </div>
              <p className="text-muted text-[11px] leading-relaxed">
                Therapeutic APAP undergoes 90% Phase II glucuronidation and sulfation. In overdose, Phase II saturates, shunting drug to hepatic <strong className="text-fg">CYP2E1</strong> which oxidizes APAP to the toxic electrophile <strong className="text-fg">N-acetyl-p-benzoquinone imine (NAPQI)</strong>. Once hepatic glutathione reserves deplete below <strong className="text-danger">&lt; 30% baseline</strong>, free NAPQI binds covalently to cysteinyl sulfhydryls on mitochondrial proteins, driving mitochondrial permeability transition pore (mPTP) collapse and <strong className="text-fg">centrilobular (Zone 3) coagulative hepatic necrosis</strong>.
              </p>
            </div>

            {/* Four Clinical Phases of APAP Toxicity */}
            <div className="space-y-2 pt-2">
              <span className="font-semibold text-xs text-fg">Four Classical Clinical Phases of APAP Toxicity</span>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {Object.values(APAP_CLINICAL_PHASES).map((p) => (
                  <div key={p.phase} className="rounded-md border border-border bg-surface p-2.5 space-y-1.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <Badge tone="default" className="text-[9px] uppercase font-mono">{p.phase}</Badge>
                        <span className="text-[10px] text-muted font-mono">{p.timing}</span>
                      </div>
                      <span className="font-semibold text-fg text-xs block mt-1">{p.clinicalName}</span>
                      <p className="text-muted text-[10px] leading-relaxed mt-1">{p.pathophysiology}</p>
                    </div>
                    <div className="border-t border-border/40 pt-1 text-[10px]">
                      <span className="text-accent font-semibold block">Lab Key:</span>
                      <p className="text-muted">{p.laboratoryFindings[0]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* IV NAC Protocols: 3-Bag vs 2-Bag */}
            <div className="space-y-2 pt-2">
              <span className="font-semibold text-xs text-fg">Intravenous N-Acetylcysteine (NAC) Protocols (Total 300 mg/kg)</span>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* 3-Bag */}
                <div className="rounded-md border border-border bg-surface p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-fg text-xs">{NAC_IV_REGIMENS.threeBag21h.name}</span>
                    <Badge tone="default" className="text-[9px]">21 Hours</Badge>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    {NAC_IV_REGIMENS.threeBag21h.bags.map((b) => (
                      <div key={b.bagNumber} className="flex justify-between items-center py-0.5 border-b border-border/40">
                        <span className="font-mono font-medium text-fg">Bag {b.bagNumber} ({b.doseMgKg} mg/kg):</span>
                        <span className="text-muted">{b.infusionDurationHours}h in {b.diluentVolumeMl}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2-Bag */}
                <div className="rounded-md border border-accent/40 bg-accent-soft/10 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-fg text-xs">{NAC_IV_REGIMENS.twoBag20h.name}</span>
                    <Badge tone="accent" className="text-[9px]">20 Hours</Badge>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    {NAC_IV_REGIMENS.twoBag20h.bags.map((b) => (
                      <div key={b.bagNumber} className="flex justify-between items-center py-0.5 border-b border-border/40">
                        <span className="font-mono font-medium text-fg">Bag {b.bagNumber} ({b.doseMgKg} mg/kg):</span>
                        <span className="text-muted">{b.infusionDurationHours}h in {b.diluentVolumeMl}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-accent font-medium">
                    Australian / Consensus regimen: Halves non-IgE anaphylactoid events and eliminates nurse compounding errors.
                  </p>
                </div>
              </div>
            </div>

            {/* Stopping Criteria & Anaphylactoid Management */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="rounded-md border border-border bg-surface-sunken p-3 space-y-1.5">
                <span className="font-semibold text-xs text-fg flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-ok" />
                  NAC Stopping Criteria
                </span>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-muted">
                  {NAC_STOPPING_CRITERIA.criteria.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-md border border-border bg-surface-sunken p-3 space-y-1.5">
                <span className="font-semibold text-xs text-fg flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-accent" />
                  Non-IgE Anaphylactoid Management
                </span>
                <p className="text-[10px] text-muted">
                  Direct mast cell histamine release during Bag 1 loading. <strong className="text-fg">DO NOT STOP NAC PERMANENTLY.</strong>
                </p>
                <div className="text-[10px] text-muted space-y-0.5">
                  <p>1. Pause infusion temporarily.</p>
                  <p>2. Administer IV H1/H2 blockers (Diphenhydramine + Famotidine).</p>
                  <p>3. Once symptoms resolve, restart at reduced rate (50% speed).</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: TOXIC ALCOHOLS & OSMOLAL GAP CALCULATOR                        */}
      {/* ===================================================================== */}
      {activeTab === "toxic-alcohol" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <span className="font-semibold text-fg text-sm">Serum Osmolal Gap Calculator</span>
                <p className="text-muted text-[11px]">
                  Measured Osmolality &minus; [2*Na + Glucose/18 + BUN/2.8 + Ethanol/4.6]. Normal threshold &le; 10 mOsm/kg.
                </p>
              </div>
              <Badge tone={osmEval.isGapElevated ? "danger" : "ok"} className="text-[10px] uppercase font-mono">
                {osmEval.isGapElevated ? "Elevated Osmolal Gap" : "Normal Osmolal Gap"}
              </Badge>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="text-[11px] text-muted block mb-1">Measured Osm (mOsm/kg):</label>
                <Input
                  type="number"
                  step="1"
                  min="200"
                  max="500"
                  value={measuredOsm}
                  onChange={(e) => setMeasuredOsm(e.target.value)}
                  className="font-mono text-center font-bold text-xs text-fg"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted block mb-1">Serum Na+ (mEq/L):</label>
                <Input
                  type="number"
                  step="1"
                  min="100"
                  max="180"
                  value={serumSodium}
                  onChange={(e) => setSerumSodium(e.target.value)}
                  className="font-mono text-center font-bold text-xs text-fg"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted block mb-1">Serum Glucose (mg/dL):</label>
                <Input
                  type="number"
                  step="5"
                  min="10"
                  max="2000"
                  value={serumGlucose}
                  onChange={(e) => setSerumGlucose(e.target.value)}
                  className="font-mono text-center font-bold text-xs text-fg"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted block mb-1">BUN (mg/dL):</label>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  max="200"
                  value={serumBun}
                  onChange={(e) => setSerumBun(e.target.value)}
                  className="font-mono text-center font-bold text-xs text-fg"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted block mb-1">Serum Ethanol (mg/dL):</label>
                <Input
                  type="number"
                  step="10"
                  min="0"
                  max="1000"
                  value={serumEthanol}
                  onChange={(e) => setSerumEthanol(e.target.value)}
                  className="font-mono text-center font-bold text-xs text-fg"
                />
              </div>
            </div>

            {/* Calculated Osmolal Gap Output */}
            <div className={cn(
              "rounded-md border p-3.5 space-y-2",
              osmEval.isGapElevated ? "bg-danger-soft/20 border-danger/40" : "bg-surface-sunken border-border",
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-fg">Calculated Osmolal Gap:</span>
                  <span className={cn("font-mono font-bold text-sm", osmEval.isGapElevated ? "text-danger" : "text-ok")}>
                    {osmEval.osmolalGap} mOsm/kg
                  </span>
                </div>
                <span className="text-[10px] text-muted font-mono">
                  Calculated Osm: {osmEval.calculatedOsmolality} mOsm/kg
                </span>
              </div>
              <p className="text-[11px] text-fg leading-relaxed">{osmEval.interpretation}</p>
              <div className="rounded bg-surface p-2 border border-border text-[10px] space-y-1">
                <span className="font-semibold text-accent block">Kinetic Pearl: The Gap Trade-Off</span>
                <p className="text-muted leading-relaxed">{osmEval.gapTradeOffNote}</p>
              </div>
            </div>

            {/* Methanol vs Ethylene Glycol Comparison Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              {/* Methanol Card */}
              <div className="rounded-md border border-border bg-surface p-3.5 space-y-2">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Droplets className="h-4 w-4 text-accent" />
                    <span className="font-semibold text-fg text-xs">{TOXIC_ALCOHOL_PROFILES.methanol.name}</span>
                  </div>
                  <Badge tone="default" className="text-[9px]">Formic Acid</Badge>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div>
                    <span className="text-muted block">Enzymatic Pathway:</span>
                    <span className="text-fg font-mono text-[10px]">{TOXIC_ALCOHOL_PROFILES.methanol.metabolicPathway}</span>
                  </div>
                  <div>
                    <span className="text-muted block">Pathology / Target Organs:</span>
                    <ul className="list-disc pl-4 text-muted space-y-0.5 text-[10px]">
                      {TOXIC_ALCOHOL_PROFILES.methanol.primaryPathology.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded bg-surface-sunken p-2 border border-border">
                    <span className="font-semibold text-accent block text-[10px]">Co-Factor Therapy:</span>
                    <p className="text-fg font-bold text-[11px]">{TOXIC_ALCOHOL_PROFILES.methanol.coFactorTherapy.agents}</p>
                    <p className="text-muted text-[10px] mt-0.5">{TOXIC_ALCOHOL_PROFILES.methanol.coFactorTherapy.biochemicalMechanism}</p>
                  </div>
                </div>
              </div>

              {/* Ethylene Glycol Card */}
              <div className="rounded-md border border-border bg-surface p-3.5 space-y-2">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Droplets className="h-4 w-4 text-accent" />
                    <span className="font-semibold text-fg text-xs">{TOXIC_ALCOHOL_PROFILES["ethylene-glycol"].name}</span>
                  </div>
                  <Badge tone="default" className="text-[9px]">Glycolic &amp; Oxalic Acid</Badge>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div>
                    <span className="text-muted block">Enzymatic Pathway:</span>
                    <span className="text-fg font-mono text-[10px]">{TOXIC_ALCOHOL_PROFILES["ethylene-glycol"].metabolicPathway}</span>
                  </div>
                  <div>
                    <span className="text-muted block">Pathology / Target Organs:</span>
                    <ul className="list-disc pl-4 text-muted space-y-0.5 text-[10px]">
                      {TOXIC_ALCOHOL_PROFILES["ethylene-glycol"].primaryPathology.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded bg-surface-sunken p-2 border border-border">
                    <span className="font-semibold text-accent block text-[10px]">Co-Factor Therapy:</span>
                    <p className="text-fg font-bold text-[11px]">{TOXIC_ALCOHOL_PROFILES["ethylene-glycol"].coFactorTherapy.agents}</p>
                    <p className="text-muted text-[10px] mt-0.5">{TOXIC_ALCOHOL_PROFILES["ethylene-glycol"].coFactorTherapy.biochemicalMechanism}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Fomepizole Protocol & EXTRIP Hemodialysis Criteria */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              <div className="rounded-md border border-border bg-surface-sunken p-3 space-y-2">
                <span className="font-semibold text-xs text-fg flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-accent" />
                  Fomepizole (4-Methylpyrazole) Dosing Protocol
                </span>
                <p className="text-muted text-[10px] leading-relaxed">
                  {FOMEPIZOLE_PROTOCOL.pharmacology} {FOMEPIZOLE_PROTOCOL.affinityVsEthanol}
                </p>
                <div className="space-y-1 text-[11px] border-t border-border/40 pt-1.5">
                  <p><strong className="text-fg">Loading: </strong>{FOMEPIZOLE_PROTOCOL.loadingDose}</p>
                  <p><strong className="text-fg">Doses 1–4: </strong>{FOMEPIZOLE_PROTOCOL.maintenanceDoses}</p>
                  <p><strong className="text-fg">Dose 5+: </strong>{FOMEPIZOLE_PROTOCOL.escalatedMaintenanceDose}</p>
                  <p><strong className="text-muted text-[10px]">Dialysis: </strong><span className="text-[10px] text-muted">{FOMEPIZOLE_PROTOCOL.dialysisDosing}</span></p>
                </div>
              </div>

              <div className="rounded-md border border-border bg-surface-sunken p-3 space-y-2">
                <span className="font-semibold text-xs text-fg flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-danger" />
                  EXTRIP Hemodialysis Indications
                </span>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-muted">
                  {TOXIC_ALCOHOL_EXTRIP_HEMODIALYSIS.indications.map((ind, i) => (
                    <li key={i}>{ind}</li>
                  ))}
                </ul>
                <p className="text-[10px] text-muted italic pt-1 border-t border-border/40">
                  {TOXIC_ALCOHOL_EXTRIP_HEMODIALYSIS.targetClearanceEndpoint}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: SALICYLATE OVERDOSE & URINARY ALKALINIZATION                   */}
      {/* ===================================================================== */}
      {activeTab === "salicylate" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <span className="font-semibold text-fg text-sm">Salicylate Ion-Trapping &amp; Potassium Rule Station</span>
                <p className="text-muted text-[11px]">
                  Salicylic acid (pKa 3.5): Henderson-Hasselbalch ionization and non-ionic tubular reabsorption prevention.
                </p>
              </div>
              <Badge tone={salEval.ionizedPercent > 99.98 ? "ok" : "accent"} className="text-[10px] uppercase font-mono">
                {salEval.ionizedPercent > 99.98 ? "Ion-Trapping Active" : "Inadequate Urine Alkalinization"}
              </Badge>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-muted block mb-1">Measured Urine pH:</label>
                <Input
                  type="number"
                  step="0.1"
                  min="4.0"
                  max="9.0"
                  value={urinePh}
                  onChange={(e) => setUrinePh(e.target.value)}
                  className="font-mono text-center font-bold text-xs text-fg"
                />
                <span className="text-[10px] text-muted mt-0.5 block">Target: 7.5 to 8.0</span>
              </div>
              <div>
                <label className="text-[11px] text-muted block mb-1">Serum Salicylate Level (mg/dL):</label>
                <Input
                  type="number"
                  step="5"
                  min="0"
                  max="200"
                  value={serumSalicylateLevel}
                  onChange={(e) => setSerumSalicylateLevel(e.target.value)}
                  className={cn(
                    "font-mono text-center font-bold text-xs",
                    numSalicylate > 100 ? "text-danger border-danger" : "text-fg",
                  )}
                />
                <span className="text-[10px] text-muted mt-0.5 block">Dialysis threshold: &gt; 100 acute / &gt; 60 chronic</span>
              </div>
            </div>

            {/* Henderson-Hasselbalch Calculations Box */}
            <div className="rounded-md border border-border bg-surface-sunken p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-fg">Henderson-Hasselbalch Ionization Ratio</span>
                <span className="font-mono text-xs font-bold text-accent">
                  [A&minus;] / [HA] = {salEval.ionizedRatio.toLocaleString()} : 1
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] pt-1">
                <div className="rounded bg-surface p-2 border border-border">
                  <span className="text-muted block text-[10px]">Ionized Percentage:</span>
                  <span className="font-mono font-bold text-sm text-fg">{salEval.ionizedPercent}%</span>
                </div>
                <div className="rounded bg-surface p-2 border border-border">
                  <span className="text-muted block text-[10px]">Clearance Surge:</span>
                  <span className="font-mono font-bold text-sm text-ok">~{salEval.clearanceFoldIncreaseApprox}&times; baseline</span>
                </div>
                <div className="rounded bg-surface p-2 border border-border col-span-2 sm:col-span-1">
                  <span className="text-muted block text-[10px]">Tubular Membrane Status:</span>
                  <span className="font-medium text-xs text-fg">{salEval.ionizedPercent > 99.98 ? "Membrane Impermeable" : "Lipid Reabsorption"}</span>
                </div>
              </div>
              <p className="text-[11px] text-muted leading-relaxed pt-1">{salEval.clinicalSignificance}</p>
            </div>

            {/* Mandatory Potassium Replacement Rule Alert */}
            <div className="rounded-md border border-danger/40 bg-danger-soft/20 p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-danger font-semibold text-xs">
                <AlertCircle className="h-4 w-4" />
                <span>The Mandatory Potassium Replacement Rule &amp; Paradoxical Aciduria</span>
              </div>
              <p className="text-[11px] text-fg leading-relaxed">
                {SALICYLATE_OVERDOSE_PROFILE.potassiumRule.physiologicalMechanism}
              </p>
              <div className="rounded bg-surface p-2.5 border border-border text-[11px] space-y-1">
                <p className="font-semibold text-danger">
                  WARNING: {SALICYLATE_OVERDOSE_PROFILE.potassiumRule.paradoxicalAciduria}
                </p>
                <p className="text-fg font-medium">
                  {SALICYLATE_OVERDOSE_PROFILE.potassiumRule.replacementInstruction} Target serum K+ &ge; 4.0–4.5 mEq/L!
                </p>
              </div>
            </div>

            {/* Dual Acid-Base Disturbance & EXTRIP Criteria */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              <div className="rounded-md border border-border bg-surface-sunken p-3 space-y-2">
                <span className="font-semibold text-xs text-fg flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-accent" />
                  Dual Acid-Base Disturbance
                </span>
                <p className="text-[11px] text-muted leading-relaxed">
                  <strong className="text-fg">1. Respiratory Alkalosis: </strong>
                  {SALICYLATE_OVERDOSE_PROFILE.dualAcidBaseMechanics.primaryRespiratoryAlkalosis}
                </p>
                <p className="text-[11px] text-muted leading-relaxed">
                  <strong className="text-fg">2. High Anion Gap Metabolic Acidosis: </strong>
                  {SALICYLATE_OVERDOSE_PROFILE.dualAcidBaseMechanics.primaryMetabolicAcidosis}
                </p>
                <p className="text-[10px] text-accent font-medium">
                  {SALICYLATE_OVERDOSE_PROFILE.dualAcidBaseMechanics.cnsToxicityRisk}
                </p>
              </div>

              <div className="rounded-md border border-border bg-surface-sunken p-3 space-y-2">
                <span className="font-semibold text-xs text-fg flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-danger" />
                  EXTRIP Hemodialysis Criteria for Salicylate
                </span>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-muted">
                  {SALICYLATE_OVERDOSE_PROFILE.extripHemodialysisCriteria.clinicalCriteria.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: OPIOID OVERDOSE & NALOXONE RENARCOTIZATION TRACKER             */}
      {/* ===================================================================== */}
      {activeTab === "opioid" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <span className="font-semibold text-fg text-sm">Opioid Overdose &amp; Naloxone Renarcotization Tracker</span>
                <p className="text-muted text-[11px]">
                  Competitive &mu;-opioid receptor antagonism (Ki ~ 1-2 nM). Half-life disparity &amp; continuous infusion kinetics.
                </p>
              </div>
              <Badge tone={report.onDesk.hasHighRenarcotizationRisk ? "danger" : "accent"} className="text-[10px] uppercase font-mono">
                {report.onDesk.hasHighRenarcotizationRisk ? "High Renarcotization Risk" : "Standard Monitoring"}
              </Badge>
            </div>

            {/* Input Bolus & Infusion Calculator */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] text-muted block mb-1">Effective Initial Bolus (mg):</label>
                <Input
                  type="number"
                  step="0.04"
                  min="0.04"
                  max="10"
                  value={initialNaloxoneBolus}
                  onChange={(e) => setInitialNaloxoneBolus(e.target.value)}
                  className="font-mono text-center font-bold text-xs text-fg"
                />
                <span className="text-[10px] text-muted mt-0.5 block">Total dose that restored spontaneous respiration</span>
              </div>
              <div className="sm:col-span-2 rounded-md border border-accent/40 bg-accent-soft/10 p-3 space-y-1">
                <span className="text-accent font-semibold text-xs block">Continuous Naloxone Infusion Protocol (2/3 Bolus/h)</span>
                <div className="flex items-center gap-3 pt-1">
                  <div>
                    <span className="text-muted text-[10px] block">Calculated Hourly Infusion Rate:</span>
                    <span className="font-mono font-bold text-base text-fg">{nlxCalc.hourlyInfusionRateMg} mg/hour</span>
                  </div>
                  <div className="border-l border-border pl-3">
                    <span className="text-muted text-[10px] block">IV Preparation &amp; Pump Speed:</span>
                    <span className="text-[11px] text-fg font-medium">{nlxCalc.mixingInstruction}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Half-Life Mismatch & Renarcotization Explanation */}
            <div className="rounded-md border border-border bg-surface-sunken p-3.5 space-y-2">
              <span className="font-semibold text-xs text-fg flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-accent" />
                The Lethal Half-Life Mismatch: Why Patients Renarcotize
              </span>
              <p className="text-[11px] text-muted leading-relaxed">
                {OPIOID_REVERSAL_PROFILE.renarcotizationKinetics.pathophysiology}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="rounded bg-surface p-2 border border-border">
                  <span className="text-muted block text-[10px]">Naloxone Plasma Half-Life:</span>
                  <span className="font-mono font-bold text-xs text-fg">{OPIOID_REVERSAL_PROFILE.naloxonePharmacology.halfLifeMinutes}</span>
                  <p className="text-muted text-[10px] mt-0.5">Effective clinical duration is only 45–90 minutes.</p>
                </div>
                <div className="rounded bg-surface p-2 border border-border">
                  <span className="text-muted block text-[10px]">Observation Window Requirement:</span>
                  <span className="font-mono font-bold text-xs text-accent">&ge; 4 to 6 Hours Post-Infusion</span>
                  <p className="text-muted text-[10px] mt-0.5">Never discharge early after reversing long-acting or synthetic opioids.</p>
                </div>
              </div>
            </div>

            {/* High-Risk Opioid Agents List */}
            <div className="space-y-2 pt-1">
              <span className="font-semibold text-xs text-fg">High-Renarcotization-Risk Opioids</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {OPIOID_REVERSAL_PROFILE.renarcotizationKinetics.highRiskOpioids.map((o) => (
                  <div key={o.id} className="rounded-md border border-border bg-surface p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-fg text-xs">{o.name}</span>
                      <Badge tone="danger" className="text-[9px]">High Risk</Badge>
                    </div>
                    <span className="text-[10px] text-accent font-mono block">{o.halfLifeOrLipophilicity}</span>
                    <p className="text-[11px] text-muted leading-relaxed">{o.clinicalRisk}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: PROTOCOLS & CLINICAL PEARLS SUMMARY                            */}
      {/* ===================================================================== */}
      {activeTab === "protocols" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
            <span className="font-semibold text-fg text-sm block">Core Emergency Toxicology Clinical Pearls</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-md border border-border bg-surface-sunken p-3 space-y-1.5">
                <span className="font-semibold text-xs text-fg flex items-center gap-1.5">
                  <Pill className="h-3.5 w-3.5 text-accent" />
                  APAP Timing &amp; Staggered Ingestions
                </span>
                <p className="text-[11px] text-muted leading-relaxed">
                  The Rumack-Matthew nomogram applies strictly to single acute ingestions presenting 4–24 hours post-ingestion. For staggered, chronic supratherapeutic, or unknown ingestion times, treat empirically with IV NAC if serum APAP is detectable or AST/ALT is elevated.
                </p>
              </div>

              <div className="rounded-md border border-border bg-surface-sunken p-3 space-y-1.5">
                <span className="font-semibold text-xs text-fg flex items-center gap-1.5">
                  <Droplets className="h-3.5 w-3.5 text-accent" />
                  Vapor Pressure Osmometry Pitfall
                </span>
                <p className="text-[11px] text-muted leading-relaxed">
                  Toxic alcohols are volatile. Always verify that measured osmolality was obtained via <strong className="text-fg">freezing-point depression osmometry</strong>. Vapor pressure osmometry will evaporate volatile alcohols (methanol, ethanol, isopropanol), generating a falsely normal osmolality and masking a lethal gap!
                </p>
              </div>

              <div className="rounded-md border border-border bg-surface-sunken p-3 space-y-1.5">
                <span className="font-semibold text-xs text-fg flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-accent" />
                  Salicylate Intubation Hazard
                </span>
                <p className="text-[11px] text-muted leading-relaxed">
                  Endotracheal intubation of a severely tachypneic salicylate-poisoned patient is exceedingly hazardous. Even momentary hypoventilation during paralysis causes acute pCO2 surge and severe acidemia, driving un-ionized salicylic acid across the blood-brain barrier and triggering instantaneous brain death! Avoid intubation unless in absolute respiratory arrest.
                </p>
              </div>

              <div className="rounded-md border border-border bg-surface-sunken p-3 space-y-1.5">
                <span className="font-semibold text-xs text-fg flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-accent" />
                  Naloxone Resuscitation Goal
                </span>
                <p className="text-[11px] text-muted leading-relaxed">
                  The goal of naloxone administration is restoration of adequate spontaneous breathing (RR &ge; 10–12/min), NOT full awake alertness. Slamming high doses precipitates acute opioid withdrawal, which can cause violent delirium, intractable emesis, pulmonary aspiration, and flash catecholamine-induced pulmonary edema.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statutory Non-Device CDS Disclaimer Footer */}
      <div className="rounded-md border border-border/80 bg-surface-sunken p-3 text-[10px] text-muted leading-relaxed space-y-1">
        <div className="flex items-center gap-1 text-fg font-semibold">
          <Info className="h-3.5 w-3.5 text-accent" />
          <span>Statutory Non-Device Clinical Decision Support (CDS) Notice</span>
        </div>
        <p>{report.disclaimer}</p>
      </div>
    </div>
  );
}
