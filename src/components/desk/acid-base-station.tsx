import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Droplets,
  Flame,
  FlaskConical,
  HelpCircle,
  Info,
  Pill,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HostContext } from "@/lib/drugs/types";
import {
  ACID_BASE_CDS_DISCLAIMER,
  ACID_BASE_CITATIONS,
  calculateAnionGap,
  evaluateWintersFormula,
  calculateDeltaDelta,
  evaluateHyponatremia,
  calculateAdrogueMadias,
  INFUSATE_PROFILES,
  HYPERTONIC_SALINE_RESCUE_PROTOCOL,
  DDAVP_CLAMP_PROTOCOL,
  RELOWERING_PROTOCOL,
  WINTERS_INTERPRETATION_GUIDE,
  DELTA_DELTA_INTERPRETATION_GUIDE,
  acidBaseReportOnDesk,
  type InfusateType,
  type PatientSex,
  type VolumeStatus,
} from "@/lib/drugs/acid-base-kinetics";

type StationTab = "diagnostic" | "hyponatremia" | "protocols" | "desk";

export function AcidBaseStation({ ids, host }: { ids: string[]; host: HostContext }) {
  return <AcidBasePanel ids={ids} host={host} />;
}

export function AcidBasePanel({ ids, host }: { ids: string[]; host: HostContext }) {
  const [activeTab, setActiveTab] = useState<StationTab>("diagnostic");

  // 1. Chemistry & Blood Gas State
  const [sodium, setSodium] = useState<string>("140");
  const [potassium, setPotassium] = useState<string>("4.0");
  const [chloride, setChloride] = useState<string>("104");
  const [bicarbonate, setBicarbonate] = useState<string>("24");
  const [albumin, setAlbumin] = useState<string>("4.0");
  const [paco2, setPaco2] = useState<string>("40");
  const [ph, setPh] = useState<string>("7.40");

  // 2. Hyponatremia & ODS Patient State
  const [weightKg, setWeightKg] = useState<string>("70");
  const [sex, setSex] = useState<PatientSex>("male");
  const [isGeriatric, setIsGeriatric] = useState<boolean>(host.age === "geriatric");
  const [volumeStatus, setVolumeStatus] = useState<VolumeStatus>("euvolemic");
  const [urineSodium, setUrineSodium] = useState<string>("40");
  const [urineOsmolality, setUrineOsmolality] = useState<string>("350");
  const [isChronicDuration, setIsChronicDuration] = useState<boolean>(true);
  const [isMalnourished, setIsMalnourished] = useState<boolean>(false);
  const [hasLiverDisease, setHasLiverDisease] = useState<boolean>(false);
  const [hasAlcoholism, setHasAlcoholism] = useState<boolean>(host.alcohol === "chronic");
  const [targetDeltaNa, setTargetDeltaNa] = useState<string>("6");
  const [selectedInfusate, setSelectedInfusate] = useState<InfusateType>("3-percent-saline");
  const [testVolumeMl, setTestVolumeMl] = useState<string>("1000");

  // Numeric sanitizations
  const numNa = Math.max(90, Math.min(180, Number(sodium) || 140));
  const numK = Math.max(1.5, Math.min(9.0, Number(potassium) || 4.0));
  const numCl = Math.max(60, Math.min(140, Number(chloride) || 104));
  const numHco3 = Math.max(2, Math.min(60, Number(bicarbonate) || 24));
  const numAlb = Math.max(0.5, Math.min(6.0, Number(albumin) || 4.0));
  const numPaco2 = Math.max(10, Math.min(120, Number(paco2) || 40));
  const numPh = Math.max(6.8, Math.min(7.8, Number(ph) || 7.4));

  const numWeight = Math.max(30, Math.min(250, Number(weightKg) || 70));
  const numUrineNa = urineSodium ? Math.max(0, Math.min(300, Number(urineSodium))) : undefined;
  const numUrineOsm = urineOsmolality ? Math.max(50, Math.min(1500, Number(urineOsmolality))) : undefined;
  const numTargetDelta = Math.max(1, Math.min(20, Number(targetDeltaNa) || 6));
  const numTestVol = Math.max(50, Math.min(5000, Number(testVolumeMl) || 1000));

  // Presets
  const applyPreset = (presetKey: string) => {
    switch (presetKey) {
      case "normal":
        setSodium("140");
        setPotassium("4.0");
        setChloride("104");
        setBicarbonate("24");
        setAlbumin("4.0");
        setPaco2("40");
        setPh("7.40");
        setVolumeStatus("euvolemic");
        break;
      case "occult-sepsis":
        setSodium("138");
        setPotassium("4.2");
        setChloride("106");
        setBicarbonate("20");
        setAlbumin("1.8");
        setPaco2("33");
        setPh("7.34");
        break;
      case "pure-dka":
        setSodium("136");
        setPotassium("5.2");
        setChloride("98");
        setBicarbonate("10");
        setAlbumin("4.0");
        setPaco2("23");
        setPh("7.18");
        break;
      case "dka-saline-mixed":
        setSodium("138");
        setPotassium("4.1");
        setChloride("112");
        setBicarbonate("12");
        setAlbumin("3.8");
        setPaco2("26");
        setPh("7.22");
        break;
      case "dka-vomiting-alk":
        setSodium("140");
        setPotassium("3.2");
        setChloride("88");
        setBicarbonate("22");
        setAlbumin("4.0");
        setPaco2("39");
        setPh("7.42");
        break;
      case "severe-hyponatremia":
        setSodium("112");
        setPotassium("3.4");
        setChloride("82");
        setBicarbonate("24");
        setAlbumin("4.0");
        setPaco2("40");
        setPh("7.40");
        setVolumeStatus("euvolemic");
        setUrineSodium("48");
        setUrineOsmolality("420");
        setIsChronicDuration(true);
        setActiveTab("hyponatremia");
        break;
    }
  };

  // Generate Report
  const report = useMemo(
    () =>
      acidBaseReportOnDesk(ids, host, {
        chemistry: {
          sodiumMeqL: numNa,
          potassiumMeqL: numK,
          chlorideMeqL: numCl,
          bicarbonateMeqL: numHco3,
          albuminGdl: numAlb,
        },
        abg: {
          measuredPh: numPh,
          measuredPaco2MmHg: numPaco2,
        },
        hyponatremiaTriage: {
          volumeStatus,
          urineSodiumMeqL: numUrineNa,
          urineOsmolalityMosmKg: numUrineOsm,
          durationHours: isChronicDuration ? 72 : 12,
          isMalnourished,
          hasAdvancedLiverDisease: hasLiverDisease,
          hasChronicAlcoholism: hasAlcoholism,
        },
        patientBiometrics: {
          weightKg: numWeight,
          sex,
          isGeriatric,
          targetDeltaNa24h: numTargetDelta,
          selectedInfusate,
          infusionVolumeMl: numTestVol,
        },
      }),
    [
      ids.join("|"),
      host,
      numNa,
      numK,
      numCl,
      numHco3,
      numAlb,
      numPh,
      numPaco2,
      volumeStatus,
      numUrineNa,
      numUrineOsm,
      isChronicDuration,
      isMalnourished,
      hasLiverDisease,
      hasAlcoholism,
      numWeight,
      sex,
      isGeriatric,
      numTargetDelta,
      selectedInfusate,
      numTestVol,
    ],
  );

  const ag = report.anionGapEvaluation;
  const winters = report.wintersEvaluation;
  const delta = report.deltaDeltaEvaluation;
  const hypo = report.hyponatremiaEvaluation;
  const infusates = report.adrogueMadiasPredictions;

  // Selected infusate prediction
  const currentInfusatePred = infusates.find((i) => i.infusate.type === selectedInfusate);

  // Ceilings and ODS safety calculations
  const safeCeiling = hypo.safeCorrectionCeiling24h;
  const targetExceedsCeiling = numTargetDelta > safeCeiling;

  return (
    <div className="space-y-6 text-xs text-fg">
      {/* Header Banner */}
      <div className="rounded-lg bg-surface-sunken p-4 border border-border space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-accent" />
            <span className="font-serif font-bold text-sm tracking-tight text-fg">
              Acid-Base Disorders, Respiratory Compensation, Delta-Delta &amp; Hyponatremia / ODS Station
            </span>
          </div>
          <div className="flex items-center gap-2">
            {ag.occultHagmaUnmasked && (
              <Badge tone="danger" className="font-mono uppercase text-[10px] animate-pulse">
                Occult HAGMA Unmasked
              </Badge>
            )}
            {hypo.isHighRiskForOds && hypo.hyponatremiaSeverity !== "normonatremic" && (
              <Badge tone="danger" className="font-mono uppercase text-[10px]">
                ODS High-Risk (Ceiling 6 mEq/24h)
              </Badge>
            )}
            <Badge tone="accent" className="font-mono uppercase text-[10px]">
              FD&amp;C Act § 520(o)(1)(E) Non-Device CDS
            </Badge>
          </div>
        </div>
        <p className="text-muted leading-relaxed">
          Comprehensive physical-chemical and physiological decision support modeling Figge albumin-corrected anion gap, Winter's secondary respiratory compensation, Delta-Delta ratios for occult mixed disorders, Adrogué-Madias infusate kinetics, and Osmotic Demyelination Syndrome (ODS) prevention.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("diagnostic")}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5",
            activeTab === "diagnostic"
              ? "bg-accent text-accent-fg"
              : "bg-surface text-muted hover:text-fg hover:bg-surface-sunken",
          )}
        >
          <Activity className="h-3.5 w-3.5" />
          ABG &amp; Chemistry Diagnostics
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("hyponatremia")}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5",
            activeTab === "hyponatremia"
              ? "bg-accent text-accent-fg"
              : "bg-surface text-muted hover:text-fg hover:bg-surface-sunken",
          )}
        >
          <Droplets className="h-3.5 w-3.5" />
          Hyponatremia &amp; ODS Safeguards
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("protocols")}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5",
            activeTab === "protocols"
              ? "bg-accent text-accent-fg"
              : "bg-surface text-muted hover:text-fg hover:bg-surface-sunken",
          )}
        >
          <Zap className="h-3.5 w-3.5" />
          Emergency Protocols (3% NaCl &amp; DDAVP)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("desk")}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5",
            activeTab === "desk"
              ? "bg-accent text-accent-fg"
              : "bg-surface text-muted hover:text-fg hover:bg-surface-sunken",
          )}
        >
          <Pill className="h-3.5 w-3.5" />
          Tray Drug Collisions ({report.onDesk.matchedDrugIds.length})
        </button>
      </div>

      {/* Clinical Simulation Presets */}
      <div className="rounded-lg border border-border bg-surface p-3 space-y-2">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
          Clinical Teaching &amp; Simulation Presets:
        </span>
        <div className="flex flex-wrap gap-1.5">
          <Button variant="secondary" size="sm" onClick={() => applyPreset("normal")}>
            Normal Baseline (AG 12)
          </Button>
          <Button variant="secondary" size="sm" onClick={() => applyPreset("occult-sepsis")}>
            Occult Sepsis (Hypoalbuminemia)
          </Button>
          <Button variant="secondary" size="sm" onClick={() => applyPreset("pure-dka")}>
            Pure DKA (HAGMA)
          </Button>
          <Button variant="secondary" size="sm" onClick={() => applyPreset("dka-saline-mixed")}>
            DKA + 0.9% NS (Mixed NAGMA)
          </Button>
          <Button variant="secondary" size="sm" onClick={() => applyPreset("dka-vomiting-alk")}>
            DKA + Vomiting (Met Alkalosis)
          </Button>
          <Button variant="secondary" size="sm" onClick={() => applyPreset("severe-hyponatremia")}>
            Severe Hyponatremia (Na 112)
          </Button>
        </div>
      </div>

      {/* TAB 1: DIAGNOSTIC STATION */}
      {activeTab === "diagnostic" && (
        <div className="space-y-6">
          {/* Active Alerts Banner */}
          {report.alerts.length > 0 && (
            <div className="space-y-2">
              {report.alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "p-3 rounded-lg border text-xs flex items-start gap-2.5",
                    alert.tier === "critical"
                      ? "bg-danger-soft border-danger text-danger"
                      : alert.tier === "warning"
                      ? "bg-warn-soft border-warn text-warn"
                      : "bg-info-soft border-info text-info",
                  )}
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold">{alert.title}</span>
                    <p className="text-[11px] opacity-90">{alert.rationale}</p>
                    <p className="text-[11px] font-semibold opacity-95">Action Guidance: {alert.actionGuidance}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Input Laboratory Panel */}
          <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-fg text-sm">Bedside Chemistry &amp; Blood Gas Panel</span>
                <p className="text-muted text-[11px]">Enter serum electrolytes, albumin, and arterial blood gas values.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
              <div>
                <label className="text-[10px] text-muted block mb-1">Serum Na+ (mEq/L)</label>
                <Input
                  type="number"
                  value={sodium}
                  onChange={(e) => setSodium(e.target.value)}
                  className="font-mono text-center font-bold text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-1">Serum K+ (mEq/L)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={potassium}
                  onChange={(e) => setPotassium(e.target.value)}
                  className="font-mono text-center font-bold text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-1">Serum Cl- (mEq/L)</label>
                <Input
                  type="number"
                  value={chloride}
                  onChange={(e) => setChloride(e.target.value)}
                  className="font-mono text-center font-bold text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-1">Serum HCO3- (mEq/L)</label>
                <Input
                  type="number"
                  value={bicarbonate}
                  onChange={(e) => setBicarbonate(e.target.value)}
                  className="font-mono text-center font-bold text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-1">Albumin (g/dL)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={albumin}
                  onChange={(e) => setAlbumin(e.target.value)}
                  className={cn(
                    "font-mono text-center font-bold text-xs",
                    numAlb < 3.5 ? "text-warn border-warn" : "text-fg",
                  )}
                />
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-1">Arterial pH</label>
                <Input
                  type="number"
                  step="0.01"
                  value={ph}
                  onChange={(e) => setPh(e.target.value)}
                  className={cn(
                    "font-mono text-center font-bold text-xs",
                    numPh < 7.35 || numPh > 7.45 ? "text-danger border-danger" : "text-fg",
                  )}
                />
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-1">PaCO2 (mmHg)</label>
                <Input
                  type="number"
                  value={paco2}
                  onChange={(e) => setPaco2(e.target.value)}
                  className="font-mono text-center font-bold text-xs"
                />
              </div>
            </div>
          </div>

          {/* Three Core Diagnostic Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Anion Gap Card */}
            <div className="rounded-lg border border-border bg-surface p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-fg">Serum Anion Gap</span>
                  <Badge
                    tone={ag.category === "elevated" ? "danger" : ag.category === "low" ? "info" : "ok"}
                  >
                    {ag.category.toUpperCase()}
                  </Badge>
                </div>

                <div className="flex items-baseline gap-3 my-2">
                  <div>
                    <span className="text-[10px] text-muted block uppercase">Observed AG</span>
                    <span className="font-mono text-xl font-bold text-fg">{ag.observedAnionGap}</span>
                    <span className="text-[10px] text-muted ml-1">mEq/L</span>
                  </div>
                  <div className="text-muted text-lg font-light">&rarr;</div>
                  <div>
                    <span className="text-[10px] text-muted block uppercase">Figge-Corrected AG</span>
                    <span
                      className={cn(
                        "font-mono text-xl font-bold",
                        ag.category === "elevated" ? "text-danger" : "text-ok",
                      )}
                    >
                      {ag.correctedAnionGap}
                    </span>
                    <span className="text-[10px] text-muted ml-1">mEq/L</span>
                  </div>
                </div>

                {ag.occultHagmaUnmasked && (
                  <div className="p-2 rounded bg-danger-soft border border-danger text-[11px] text-danger font-semibold">
                    OCCULT HAGMA: Observed AG was deceptively normal ({ag.observedAnionGap}), but severe hypoalbuminemia ({ag.albuminGdl} g/dL) concealed +{ag.albuminAdjustmentMeqL} mEq/L of unmeasured organic anions!
                  </div>
                )}

                <div className="text-[11px] space-y-1 text-muted">
                  <p className="font-mono text-[10px] bg-surface-sunken p-1.5 rounded border border-border">
                    {ag.formulaUsed}
                  </p>
                  <p className="text-fg">{ag.interpretation}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <span className="text-[10px] text-muted uppercase font-semibold block mb-1">Common Etiologies:</span>
                <ul className="text-[11px] list-disc list-inside space-y-0.5 text-muted">
                  {ag.etiologies.slice(0, 3).map((et, i) => (
                    <li key={i}>{et}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 2. Winter's Formula Card */}
            <div className="rounded-lg border border-border bg-surface p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-fg">Winter's Compensation</span>
                  <Badge
                    tone={
                      winters.status === "adequate-compensation"
                        ? "ok"
                        : winters.status === "concomitant-respiratory-acidosis"
                        ? "danger"
                        : winters.status === "concomitant-respiratory-alkalosis"
                        ? "warn"
                        : "default"
                    }
                  >
                    {winters.status === "adequate-compensation"
                      ? "PURE COMP"
                      : winters.status === "concomitant-respiratory-acidosis"
                      ? "RESP ACIDOSIS"
                      : winters.status === "concomitant-respiratory-alkalosis"
                      ? "RESP ALKALOSIS"
                      : "HCO3 >= 24"}
                  </Badge>
                </div>

                <div className="flex items-baseline gap-3 my-2">
                  <div>
                    <span className="text-[10px] text-muted block uppercase">Measured PaCO2</span>
                    <span className="font-mono text-xl font-bold text-fg">{winters.measuredPaco2MmHg}</span>
                    <span className="text-[10px] text-muted ml-1">mmHg</span>
                  </div>
                  <div className="text-muted text-lg font-light">vs</div>
                  <div>
                    <span className="text-[10px] text-muted block uppercase">Expected Window</span>
                    <span className="font-mono text-xl font-bold text-accent">
                      {winters.expectedPaco2Min}–{winters.expectedPaco2Max}
                    </span>
                    <span className="text-[10px] text-muted ml-1">mmHg</span>
                  </div>
                </div>

                <p className="font-mono text-[10px] bg-surface-sunken p-1.5 rounded border border-border text-muted">
                  {winters.formulaUsed}
                </p>

                <p className="text-[11px] text-fg leading-relaxed">{winters.clinicalRationale}</p>
              </div>

              <div className="pt-2 border-t border-border">
                <span className="text-[10px] text-muted uppercase font-semibold block mb-1">
                  Differential Considerations:
                </span>
                <ul className="text-[11px] list-disc list-inside space-y-0.5 text-muted">
                  {winters.differentialDiagnosis.slice(0, 3).map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 3. Delta-Delta Ratio Card */}
            <div className="rounded-lg border border-border bg-surface p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-fg">Delta-Delta (&Delta;&Delta;) Analysis</span>
                  <Badge
                    tone={
                      delta.category === "pure-hagma"
                        ? "accent"
                        : delta.category === "mixed-hagma-nagma"
                        ? "warn"
                        : delta.category === "mixed-hagma-metabolic-alkalosis"
                        ? "danger"
                        : "default"
                    }
                  >
                    {delta.category === "pure-hagma"
                      ? "PURE HAGMA"
                      : delta.category === "mixed-hagma-nagma"
                      ? "MIXED + NAGMA"
                      : delta.category === "mixed-hagma-metabolic-alkalosis"
                      ? "MIXED + MET ALK"
                      : "NAGMA"}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 my-2 text-center bg-surface-sunken p-2 rounded border border-border">
                  <div>
                    <span className="text-[9px] text-muted uppercase block">&Delta; AG</span>
                    <span className="font-mono text-sm font-bold text-fg">+{delta.deltaAnionGap}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted uppercase block">&Delta; HCO3</span>
                    <span className="font-mono text-sm font-bold text-fg">-{delta.deltaBicarbonate}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted uppercase block">Ratio</span>
                    <span className="font-mono text-sm font-bold text-accent">
                      {delta.deltaRatio !== null ? delta.deltaRatio : "N/A"}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] space-y-1">
                  <div className="flex justify-between items-center text-muted">
                    <span>Predicted Baseline HCO3:</span>
                    <span className="font-mono font-bold text-fg">{delta.predictedBaselineBicarbonate} mEq/L</span>
                  </div>
                  <p className="text-fg font-medium">{delta.categoryLabel}</p>
                  <p className="text-muted leading-relaxed text-[11px]">{delta.clinicalSignificance}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <span className="text-[10px] text-muted uppercase font-semibold block mb-1">Pathophysiology:</span>
                <p className="text-[11px] text-muted">{delta.pathophysiology}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HYPONATREMIA & ODS SAFEGUARDS */}
      {activeTab === "hyponatremia" && (
        <div className="space-y-6">
          {/* Critical ODS Warning Bar */}
          <div
            className={cn(
              "p-4 rounded-lg border space-y-3",
              targetExceedsCeiling
                ? "bg-danger-soft border-danger text-danger"
                : hypo.isHighRiskForOds
                ? "bg-warn-soft border-warn text-warn"
                : "bg-surface-sunken border-border text-fg",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 shrink-0" />
                <div>
                  <span className="font-bold text-sm block">
                    CRITICAL ODS SAFETY CEILING: Max &le; {safeCeiling} mEq/L in 24 Hours
                  </span>
                  <span className="text-[11px] opacity-90">
                    {hypo.isHighRiskForOds
                      ? `HIGH-RISK ODS FACTORS: ${hypo.highRiskFactors.join("; ")}`
                      : "Standard hyponatremia ceiling applies (&le; 8 mEq/L in 24h)."}
                  </span>
                </div>
              </div>
              <Badge tone={targetExceedsCeiling ? "danger" : "ok"} className="font-mono uppercase text-xs">
                {targetExceedsCeiling ? "CEILING EXCEEDED!" : "SAFE CEILING COMPLIANT"}
              </Badge>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono">
                <span>Current 24h Target: +{numTargetDelta} mEq/L</span>
                <span>Max Safe: {safeCeiling} mEq/L (Absolute Danger Zone: &gt; 8 mEq/L)</span>
              </div>
              <div className="h-4 w-full bg-surface-2 rounded-full overflow-hidden flex border border-border">
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    numTargetDelta <= safeCeiling ? "bg-ok" : "bg-danger",
                  )}
                  style={{ width: `${Math.min(100, (numTargetDelta / 12) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted">
                <span>0 mEq/L</span>
                <span>4 mEq/L</span>
                <span className="font-bold text-warn">6 mEq/L (High-Risk Ceiling)</span>
                <span className="font-bold text-danger">8 mEq/L (Standard Ceiling)</span>
                <span>12 mEq/L (Locked-In Syndrome Risk)</span>
              </div>
            </div>

            {targetExceedsCeiling && (
              <div className="p-2 rounded bg-danger text-bg text-[11px] font-bold">
                DANGER: Correcting serum sodium faster than 8 mEq/L in 24 hours (or 6 mEq/L in high risk) risks irreversible central pontine myelinolysis, pseudobulbar palsy, quadriplegia, and locked-in syndrome. Immediately lower target or prepare DDAVP clamp!
              </div>
            )}
          </div>

          {/* Patient Biometrics & Volume Triage Panel */}
          <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
            <span className="font-semibold text-fg text-sm block">Patient Parameters &amp; Diagnostic Triage</span>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              <div>
                <label className="text-[10px] text-muted block mb-1">Weight (kg)</label>
                <Input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="font-mono text-center font-bold text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-1">Biological Sex</label>
                <div className="flex rounded-md border border-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSex("male")}
                    className={cn(
                      "flex-1 py-1 text-center font-semibold transition-colors",
                      sex === "male" ? "bg-accent text-accent-fg" : "bg-surface-sunken text-muted",
                    )}
                  >
                    Male
                  </button>
                  <button
                    type="button"
                    onClick={() => setSex("female")}
                    className={cn(
                      "flex-1 py-1 text-center font-semibold transition-colors",
                      sex === "female" ? "bg-accent text-accent-fg" : "bg-surface-sunken text-muted",
                    )}
                  >
                    Female
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-1">Volume Status</label>
                <select
                  value={volumeStatus}
                  onChange={(e) => setVolumeStatus(e.target.value as VolumeStatus)}
                  className="w-full h-8 px-2 text-xs rounded border border-border bg-surface text-fg"
                >
                  <option value="euvolemic">Euvolemic (SIADH / Polydipsia)</option>
                  <option value="hypovolemic">Hypovolemic (Dehydration / Diuretic / CSW)</option>
                  <option value="hypervolemic">Hypervolemic (CHF / Cirrhosis / ESRD)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-1">Urine Na+ (mEq/L)</label>
                <Input
                  type="number"
                  placeholder="e.g. 40"
                  value={urineSodium}
                  onChange={(e) => setUrineSodium(e.target.value)}
                  className="font-mono text-center text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-1">Urine Osm (mOsm/kg)</label>
                <Input
                  type="number"
                  placeholder="e.g. 350"
                  value={urineOsmolality}
                  onChange={(e) => setUrineOsmolality(e.target.value)}
                  className="font-mono text-center text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-1">Target &Delta; Na (mEq/24h)</label>
                <Input
                  type="number"
                  min="1"
                  max="14"
                  value={targetDeltaNa}
                  onChange={(e) => setTargetDeltaNa(e.target.value)}
                  className={cn(
                    "font-mono text-center font-bold text-xs",
                    targetExceedsCeiling ? "text-danger border-danger" : "text-ok",
                  )}
                />
              </div>
            </div>

            {/* High-Risk ODS Modifiers Toggle */}
            <div className="pt-2 border-t border-border flex flex-wrap gap-2">
              <Button
                variant={isGeriatric ? "default" : "secondary"}
                size="sm"
                onClick={() => setIsGeriatric(!isGeriatric)}
              >
                Geriatric (&ge; 65 yr)
              </Button>
              <Button
                variant={isChronicDuration ? "danger" : "secondary"}
                size="sm"
                onClick={() => setIsChronicDuration(!isChronicDuration)}
              >
                Chronic (&gt; 48h / Unknown)
              </Button>
              <Button
                variant={isMalnourished ? "danger" : "secondary"}
                size="sm"
                onClick={() => setIsMalnourished(!isMalnourished)}
              >
                Malnutrition / Cachexia
              </Button>
              <Button
                variant={hasLiverDisease ? "danger" : "secondary"}
                size="sm"
                onClick={() => setHasLiverDisease(!hasLiverDisease)}
              >
                Advanced Cirrhosis
              </Button>
              <Button
                variant={hasAlcoholism ? "danger" : "secondary"}
                size="sm"
                onClick={() => setHasAlcoholism(!hasAlcoholism)}
              >
                Chronic Alcoholism
              </Button>
            </div>

            {/* Diagnostic Differentiation Output */}
            <div className="p-3 rounded bg-surface-sunken border border-border text-xs space-y-1">
              <span className="font-bold text-fg block">{hypo.etiologyCategory}</span>
              <p className="text-muted leading-relaxed">{hypo.etiologyDetails}</p>
              <p className="text-[11px] text-muted font-mono">{hypo.urineFindingsSummary}</p>
            </div>
          </div>

          {/* Adrogue-Madias Infusate Comparison Table */}
          <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-fg text-sm">Adrogué-Madias Infusate Comparison Matrix</span>
                <p className="text-muted text-[11px]">
                  Projected change in serum sodium per 1 liter of infusate based on calculated TBW ({currentInfusatePred?.totalBodyWaterLiters} L).
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border border-border rounded">
                <thead className="bg-surface-sunken text-muted">
                  <tr className="border-b border-border">
                    <th className="p-2 text-left">Infusate Solution</th>
                    <th className="p-2 text-center">Tonicity / Na+</th>
                    <th className="p-2 text-center">&Delta; Na / 1 Liter</th>
                    <th className="p-2 text-center">Vol for Target (+{numTargetDelta})</th>
                    <th className="p-2 text-center">24h Hourly Rate</th>
                    <th className="p-2 text-left">Clinical Strategy Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {infusates.map((pred) => {
                    const isSelected = pred.infusate.type === selectedInfusate;
                    return (
                      <tr
                        key={pred.infusate.type}
                        onClick={() => setSelectedInfusate(pred.infusate.type)}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-surface-sunken",
                          isSelected ? "bg-accent-soft/20 font-medium" : "",
                        )}
                      >
                        <td className="p-2 font-semibold flex items-center gap-1.5">
                          {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                          {pred.infusate.name}
                        </td>
                        <td className="p-2 text-center font-mono">{pred.infusate.sodiumMeqL} mEq/L</td>
                        <td
                          className={cn(
                            "p-2 text-center font-mono font-bold",
                            pred.deltaNaPerLiter > 0 ? "text-ok" : "text-info",
                          )}
                        >
                          {pred.deltaNaPerLiter > 0 ? `+${pred.deltaNaPerLiter}` : pred.deltaNaPerLiter} mEq/L
                        </td>
                        <td className="p-2 text-center font-mono">
                          {pred.volumeNeededForTargetMl ? `${pred.volumeNeededForTargetMl} mL` : "N/A"}
                        </td>
                        <td className="p-2 text-center font-mono font-bold text-accent">
                          {pred.hourlyRateFor24hTargetMlH ? `${pred.hourlyRateFor24hTargetMlH} mL/h` : "N/A"}
                        </td>
                        <td className="p-2 text-muted text-[10px]">{pred.infusate.clinicalNotes}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Custom Infusion Volume Simulator */}
            <div className="p-3 rounded-lg bg-surface-sunken border border-border space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-xs text-fg">
                  Selected Infusate Simulator ({INFUSATE_PROFILES[selectedInfusate].name})
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-muted text-[11px]">Infuse:</span>
                  <Input
                    type="number"
                    step="100"
                    value={testVolumeMl}
                    onChange={(e) => setTestVolumeMl(e.target.value)}
                    className="w-24 h-7 text-xs font-mono text-center font-bold"
                  />
                  <span className="text-muted text-[11px]">mL</span>
                </div>
              </div>

              {currentInfusatePred && (
                <div className="flex flex-wrap items-center justify-between gap-4 text-xs pt-2 border-t border-border">
                  <div className="font-mono text-[11px]">
                    Formula: <span className="text-muted">{currentInfusatePred.formulaUsed}</span>
                  </div>
                  <div>
                    Predicted &Delta; Na:{" "}
                    <span
                      className={cn(
                        "font-mono font-bold text-sm",
                        currentInfusatePred.exceedsSafe24hCeiling ? "text-danger" : "text-ok",
                      )}
                    >
                      {currentInfusatePred.predictedDeltaNaForVolume !== undefined &&
                      currentInfusatePred.predictedDeltaNaForVolume > 0
                        ? `+${currentInfusatePred.predictedDeltaNaForVolume}`
                        : currentInfusatePred.predictedDeltaNaForVolume}{" "}
                      mEq/L
                    </span>
                  </div>
                </div>
              )}

              {currentInfusatePred?.odsWarning && (
                <div className="p-2 rounded bg-danger-soft border border-danger text-danger text-[11px] font-semibold">
                  {currentInfusatePred.odsWarning}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EMERGENCY PROTOCOLS */}
      {activeTab === "protocols" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 3% Hypertonic Saline Bolus Rescue Protocol */}
            <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-danger" />
                  <span className="font-semibold text-fg text-sm">{HYPERTONIC_SALINE_RESCUE_PROTOCOL.title}</span>
                </div>
                <Badge tone="danger">EMERGENCY RESCUE</Badge>
              </div>

              <div className="p-2.5 rounded bg-surface-sunken border border-border text-[11px] space-y-1">
                <span className="font-bold text-fg block">Indications:</span>
                <p className="text-muted">{HYPERTONIC_SALINE_RESCUE_PROTOCOL.indication}</p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-border py-1">
                  <span className="text-muted">Bolus Volume:</span>
                  <span className="font-mono font-bold text-fg">{HYPERTONIC_SALINE_RESCUE_PROTOCOL.bolusDoseMl} mL of 3% NaCl</span>
                </div>
                <div className="flex justify-between border-b border-border py-1">
                  <span className="text-muted">Infusion Duration:</span>
                  <span className="font-mono font-bold text-fg">Over {HYPERTONIC_SALINE_RESCUE_PROTOCOL.infusionDurationMinutes} minutes IV</span>
                </div>
                <div className="flex justify-between border-b border-border py-1">
                  <span className="text-muted">Repeat Administration:</span>
                  <span className="font-mono font-bold text-fg">q{HYPERTONIC_SALINE_RESCUE_PROTOCOL.repeatIntervalMinutes} (Max {HYPERTONIC_SALINE_RESCUE_PROTOCOL.maxConsecutiveBoluses} boluses total)</span>
                </div>
                <div className="flex justify-between border-b border-border py-1">
                  <span className="text-muted">Acute Target Rise:</span>
                  <span className="font-mono font-bold text-accent">{HYPERTONIC_SALINE_RESCUE_PROTOCOL.targetAcuteSodiumRiseMeqL}</span>
                </div>
              </div>

              <p className="text-[11px] text-muted leading-relaxed">
                {HYPERTONIC_SALINE_RESCUE_PROTOCOL.physiologicGoal}
              </p>

              <div className="p-2 rounded bg-surface-sunken text-[10px] text-muted border border-border">
                <span className="font-semibold text-fg block mb-0.5">Post-Rescue Rule:</span>
                {HYPERTONIC_SALINE_RESCUE_PROTOCOL.postRescueGuidance}
              </div>
            </div>

            {/* Desmopressin (DDAVP) Clamp & Re-lowering Protocol */}
            <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-accent" />
                  <span className="font-semibold text-fg text-sm">{DDAVP_CLAMP_PROTOCOL.title}</span>
                </div>
                <Badge tone="accent">ODS PREVENTION</Badge>
              </div>

              <div className="p-2.5 rounded bg-surface-sunken border border-border text-[11px] space-y-1">
                <span className="font-bold text-fg block">Proactive Clamp Strategy:</span>
                <p className="text-muted">{DDAVP_CLAMP_PROTOCOL.mechanism}</p>
                <p className="font-mono font-bold text-accent pt-1">{DDAVP_CLAMP_PROTOCOL.dosing}</p>
              </div>

              <div className="p-2.5 rounded bg-danger-soft border border-danger text-[11px] space-y-1.5 text-danger">
                <div className="flex items-center justify-between">
                  <span className="font-bold">{RELOWERING_PROTOCOL.title}</span>
                  <span className="font-mono text-[10px]">TRIGGER: &gt; 8 mEq/24h</span>
                </div>
                <p className="text-[10px] opacity-90">{RELOWERING_PROTOCOL.neuroprotectiveRationale}</p>
                <ul className="list-disc list-inside space-y-0.5 text-[10px] font-medium pt-1">
                  {RELOWERING_PROTOCOL.immediateSteps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Quick Reference Rules Guide */}
          <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
            <span className="font-semibold text-fg text-sm block">Secondary Compensation &amp; Delta-Delta Rules of Thumb</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div className="p-3 rounded bg-surface-sunken border border-border space-y-1.5">
                <span className="font-bold text-fg block">Respiratory Compensation Formulas:</span>
                <p><span className="font-medium text-fg">Metabolic Acidosis:</span> {WINTERS_INTERPRETATION_GUIDE.metabolicAcidosis}</p>
                <p><span className="font-medium text-fg">Metabolic Alkalosis:</span> {WINTERS_INTERPRETATION_GUIDE.metabolicAlkalosis}</p>
                <p><span className="font-medium text-fg">Acute Resp Acidosis:</span> {WINTERS_INTERPRETATION_GUIDE.acuteRespiratoryAcidosis}</p>
                <p><span className="font-medium text-fg">Chronic Resp Acidosis:</span> {WINTERS_INTERPRETATION_GUIDE.chronicRespiratoryAcidosis}</p>
              </div>
              <div className="p-3 rounded bg-surface-sunken border border-border space-y-1.5">
                <span className="font-bold text-fg block">Delta-Delta Ratio Reference Guide:</span>
                <p><span className="font-mono text-accent">&lt; 0.8:</span> Mixed HAGMA + NAGMA (Hyperchloremic)</p>
                <p><span className="font-mono text-accent">1.0 to 2.0:</span> Pure High Anion Gap Metabolic Acidosis</p>
                <p><span className="font-mono text-accent">&gt; 2.0:</span> Mixed HAGMA + Concurrent Metabolic Alkalosis</p>
                <p className="text-[10px] text-muted pt-1">
                  Predicted Baseline HCO3 = Measured HCO3 + (Corrected AG - 12). If &lt; 22, unmasks NAGMA; if &gt; 26, unmasks alkalosis.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TRAY DRUG COLLISIONS */}
      {activeTab === "desk" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-fg text-sm">Active Acid-Base &amp; Electrolyte Diuretics on Desk</span>
              <Badge tone={report.onDesk.matchedDrugIds.length > 0 ? "accent" : "default"}>
                {report.onDesk.matchedDrugIds.length} Agents Identified
              </Badge>
            </div>

            {report.onDesk.matchedDrugIds.length === 0 ? (
              <div className="p-6 text-center text-muted">
                <p>No carbonic anhydrase inhibitors, diuretics, SGLT2 inhibitors, vaptans, or alkalinizers currently on tray.</p>
                <p className="text-[11px] mt-1">Try adding acetazolamide, furosemide, hctz, empagliflozin, or tolvaptan to inspect pharmacodynamic tubular collisions.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {report.onDesk.riskSummaries.map((risk, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-border bg-surface-sunken text-xs flex items-start gap-2">
                    <Pill className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <p className="text-fg leading-relaxed">{risk}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statutory Regulatory Disclosures Footer */}
      <div className="p-4 rounded-lg bg-surface-sunken border border-border space-y-2 text-[10px] text-muted leading-relaxed">
        <span className="font-semibold text-fg block">
          FD&amp;C Act § 520(o)(1)(E) Non-Device Clinical Decision Support Regulatory Notice:
        </span>
        <p>{report.disclaimer}</p>
        <div className="pt-2 border-t border-border">
          <span className="font-semibold text-fg block mb-1">Authoritative References &amp; Scientific Basis:</span>
          <ul className="list-disc list-inside space-y-0.5">
            {ACID_BASE_CITATIONS.slice(0, 6).map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
