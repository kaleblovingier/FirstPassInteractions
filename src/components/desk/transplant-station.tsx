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
  CNI_TARGET_GUIDELINES,
  NOT_CLEARED,
  PI_FOOTER,
  evaluateMycophenolateEhc,
  evaluateSteroidTaperCniImpact,
  evaluateAzathioprineXanthineOxidase,
  transplantOnDesk,
  transplantReportOnDesk,
} from "@/lib/drugs/transplant-kinetics";

export interface TransplantStationProps {
  ids: string[];
  host: HostContext;
}

export function TransplantStation({ ids, host }: TransplantStationProps) {
  const [activeTab, setActiveTab] = useState<"cni" | "ehc" | "steroids" | "thiopurine" | "mtor">("cni");
  const [selectedCni, setSelectedCni] = useState<"tacrolimus" | "cyclosporine">("tacrolimus");
  const [postTransplantEra, setPostTransplantEra] = useState<"early" | "maintenance">("early");
  const [broadSpectrumAntibiotics, setBroadSpectrumAntibiotics] = useState<boolean>(true);
  const [steroidTaperActive, setSteroidTaperActive] = useState<boolean>(true);

  const detection = useMemo(() => transplantOnDesk(ids), [ids.join("|")]);

  const ehcResult = useMemo(
    () =>
      evaluateMycophenolateEhc({
        mycophenolateActive: detection.hasMycophenolate || true,
        broadSpectrumAntibioticsActive: broadSpectrumAntibiotics,
      }),
    [detection.hasMycophenolate, broadSpectrumAntibiotics],
  );

  const steroidResult = useMemo(
    () =>
      evaluateSteroidTaperCniImpact({
        cniActive: detection.hasTacrolimus || detection.hasCyclosporine || true,
        highDoseSteroidTapering: steroidTaperActive,
      }),
    [detection.hasTacrolimus, detection.hasCyclosporine, steroidTaperActive],
  );

  const thiopurineResult = useMemo(
    () => evaluateAzathioprineXanthineOxidase(detection.hasAzathioprine ? ids : ["azathioprine", "allopurinol"]),
    [detection.hasAzathioprine, ids.join("|")],
  );

  const currentCniGuide = CNI_TARGET_GUIDELINES[selectedCni];

  return (
    <div className="space-y-6 text-foreground">
      {/* Statutory Header */}
      <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight">Solid Organ Transplant & CNI Kinetics Station</h2>
                <Badge tone="default" className="text-[10px] font-mono">
                  KDIGO / ASTS 2020
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Calcineurin inhibitor TDM, erythrocyte partitioning traps, enterohepatic recirculation, and steroid taper rebound
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {detection.hasTransplant ? (
              <Badge tone="accent" className="gap-1 font-mono text-xs">
                <Activity className="size-3" />
                {detection.detectedAgents.join(", ")} Active
              </Badge>
            ) : (
              <Badge tone="default" className="text-xs">
                Tray: Reference Mode
              </Badge>
            )}
            <Badge tone="info" className="text-xs font-semibold">
              Whole Blood Tube Required
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
          variant={activeTab === "cni" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("cni")}
          className="gap-1.5 text-xs"
        >
          <Activity className="size-3.5" />
          CNI TDM & Sampling Trap
        </Button>
        <Button
          variant={activeTab === "ehc" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("ehc")}
          className="gap-1.5 text-xs"
        >
          <Droplets className="size-3.5" />
          Mycophenolate Gut Flora Rejection
        </Button>
        <Button
          variant={activeTab === "steroids" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("steroids")}
          className="gap-1.5 text-xs"
        >
          <Timer className="size-3.5" />
          Steroid Taper CYP3A4 Rebound
        </Button>
        <Button
          variant={activeTab === "thiopurine" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("thiopurine")}
          className="gap-1.5 text-xs"
        >
          <AlertTriangle className="size-3.5" />
          Azathioprine × Allopurinol Pancytopenia
        </Button>
      </div>

      {/* TAB 1: CNI TDM & Sampling Trap */}
      {activeTab === "cni" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 rounded-xl border border-border/80 bg-card p-5 lg:col-span-1">
            <h3 className="text-sm font-semibold tracking-tight">CNI Monitoring Parameters</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-muted-foreground">Calcineurin Inhibitor</label>
                <div className="mt-1 flex gap-2">
                  <Button
                    variant={selectedCni === "tacrolimus" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCni("tacrolimus")}
                    className="flex-1 text-xs"
                  >
                    Tacrolimus
                  </Button>
                  <Button
                    variant={selectedCni === "cyclosporine" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCni("cyclosporine")}
                    className="flex-1 text-xs"
                  >
                    Cyclosporine
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-muted-foreground">Post-Transplant Timing</label>
                <div className="mt-1 flex gap-2">
                  <Button
                    variant={postTransplantEra === "early" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPostTransplantEra("early")}
                    className="flex-1 text-xs"
                  >
                    Early (0-3 Months)
                  </Button>
                  <Button
                    variant={postTransplantEra === "maintenance" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPostTransplantEra("maintenance")}
                    className="flex-1 text-xs"
                  >
                    Maintenance (&gt;3 Mo)
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-4 shrink-0 text-red-400" />
                <span>{currentCniGuide.cellularPartitioningNote}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-xl border border-border/80 bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold capitalize">
                  {selectedCni} Target:{" "}
                  {postTransplantEra === "early"
                    ? currentCniGuide.earlyPostTransplantTarget
                    : currentCniGuide.maintenanceTarget}
                </span>
                <Badge tone="accent">{currentCniGuide.monitoringParameter}</Badge>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 text-xs">
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
                  <h4 className="font-semibold text-foreground">Nephrotoxicity Hallmarks</h4>
                  <ul className="space-y-1.5 text-muted-foreground">
                    {currentCniGuide.nephrotoxicityHallmarks.map((h, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5 text-red-400" /> {h}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
                  <h4 className="font-semibold text-foreground">Neurotoxicity Hallmarks</h4>
                  <ul className="space-y-1.5 text-muted-foreground">
                    {currentCniGuide.neurotoxicityHallmarks.map((h, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5 text-amber-400" /> {h}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Mycophenolate Gut Flora Rejection */}
      {activeTab === "ehc" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-border/80 bg-card p-5">
            <h3 className="text-sm font-semibold tracking-tight">Enterohepatic Recirculation Simulation</h3>
            <p className="text-xs text-muted-foreground">
              Intestinal commensal bacteria hydrolyze MPAG back into active MPA, providing 10-40% of total daily exposure
            </p>

            <div className="space-y-3 text-xs">
              <label className="flex items-center gap-2 text-foreground font-medium">
                <input
                  type="checkbox"
                  checked={broadSpectrumAntibiotics}
                  onChange={(e) => setBroadSpectrumAntibiotics(e.target.checked)}
                  className="size-4 rounded border-border"
                />
                <span>Co-administered Broad-Spectrum Antibiotics (Cipro, Augmentin, Pip-Tazo)</span>
              </label>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-border/80 bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">
                {ehcResult.antibioticGutFloraDecimation
                  ? "Allograft Rejection Vulnerability"
                  : "Intact Secondary MPA Peak"}
              </span>
              <Badge tone={ehcResult.antibioticGutFloraDecimation ? "danger" : "ok"}>
                {ehcResult.antibioticGutFloraDecimation
                  ? `-${ehcResult.predictedMpaAucReductionPercent}% MPA AUC Exposure`
                  : "Normal EHC"}
              </Badge>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              {ehcResult.rejectionRiskAlert}
            </p>

            <div className="rounded-lg bg-muted/40 p-3 text-xs">
              <h4 className="font-semibold text-foreground">Biochemical Pathway</h4>
              <p className="mt-1 text-muted-foreground leading-relaxed">{ehcResult.biochemicalMechanism}</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Steroid Taper CYP3A4 Rebound */}
      {activeTab === "steroids" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-border/80 bg-card p-5">
            <h3 className="text-sm font-semibold tracking-tight">Corticosteroid Taper Kinetics</h3>
            <p className="text-xs text-muted-foreground">
              High-dose steroids induce CYP3A4 and P-gp; tapering reverses induction, reducing CNI clearance
            </p>

            <div className="space-y-3 text-xs">
              <label className="flex items-center gap-2 text-foreground font-medium">
                <input
                  type="checkbox"
                  checked={steroidTaperActive}
                  onChange={(e) => setSteroidTaperActive(e.target.checked)}
                  className="size-4 rounded border-border"
                />
                <span>Active High-Dose Corticosteroid Taper</span>
              </label>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-border/80 bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">
                {steroidResult.steroidTaperActive ? "Rebound CNI Accumulation" : "Stable Clearance"}
              </span>
              <Badge tone={steroidResult.steroidTaperActive ? "danger" : "ok"}>
                +{steroidResult.expectedCniTroughSurgePercent}% Expected Trough Surge
              </Badge>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              {steroidResult.clinicalAction}
            </p>

            <div className="rounded-lg bg-muted/40 p-3 text-xs">
              <h4 className="font-semibold text-foreground">Molecular De-Induction Mechanism</h4>
              <p className="mt-1 text-muted-foreground leading-relaxed">{steroidResult.biochemicalMechanism}</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Azathioprine x Allopurinol */}
      {activeTab === "thiopurine" && (
        <div className="rounded-xl border border-border/80 bg-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">
                Azathioprine × Xanthine Oxidase Lethal Pancytopenia Shunt
              </h3>
              <p className="text-xs text-muted-foreground">
                Allopurinol or Febuxostat blocks 6-thiouric acid synthesis, shunting 6-MP to cytotoxic 6-TGN
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-200">
            <span className="font-bold">MANDATORY RULE:</span> {thiopurineResult.mandatoryDoseReductionRule}
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs space-y-2">
            <h4 className="font-semibold text-foreground">Biochemical Pathway & Cytotoxic Mechanism</h4>
            <p className="text-muted-foreground leading-relaxed">
              {thiopurineResult.molecularPathwayShunt}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function TransplantPanel({ ids, host }: TransplantStationProps) {
  return <TransplantStation ids={ids} host={host} />;
}
