import { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  Cigarette,
  Clock,
  Droplets,
  Eye,
  Flame,
  Info,
  Pill,
  Scale,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Thermometer,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { HostContext } from "@/lib/drugs/types";
import {
  ANTIDEPRESSANT_KINETICS_REGISTRY,
  calculateAntidepressantCrossTaper,
  detectClozapine1a2Collisions,
  evaluateAnticholinergicToxidrome,
  evaluateCighRisk,
  evaluateClozapineAnc,
  evaluateFinishSyndromeRisk,
  evaluateHunterSerotoninCriteria,
  evaluateMalignantHyperthermia,
  evaluateNmsCriteria,
  isMaoi,
  modelClozapineTobaccoKinetics,
  NEURO_EMERGENCY_COMPARISON_MATRIX,
  NEUROPSYCH_CITATIONS,
  NEUROPSYCH_KINETICS_REGULATORY_DISCLAIMER,
  neuropsychReportOnDesk,
} from "@/lib/drugs/neuropsych-kinetics";

export function NeuropsychPanel({ ids, host }: { ids: string[]; host: HostContext }) {
  const report = useMemo(() => neuropsychReportOnDesk(ids, host), [ids.join("|"), host.smoking, host.age]);

  // Main station tabs
  const [activeTab, setActiveTab] = useState<"emergencies" | "clozapine" | "crosstaper">("emergencies");

  /* ======================================================================== */
  /* STATE: TOXIDROME DIFFERENTIAL SIMULATOR                                  */
  /* ======================================================================== */
  const [serotonergicExposed, setSerotonergicExposed] = useState<boolean>(true);
  const [spontaneousClonus, setSpontaneousClonus] = useState<boolean>(false);
  const [inducibleClonus, setInducibleClonus] = useState<boolean>(true);
  const [ocularClonus, setOcularClonus] = useState<boolean>(false);
  const [agitation, setAgitation] = useState<boolean>(true);
  const [diaphoresis, setDiaphoresis] = useState<boolean>(true);
  const [tremor, setTremor] = useState<boolean>(true);
  const [hyperreflexia, setHyperreflexia] = useState<boolean>(true);
  const [hypertonia, setHypertonia] = useState<boolean>(false);
  const [temperatureC, setTemperatureC] = useState<string>("38.4");

  // NMS signs
  const [dopamineAntagonistExposed, setDopamineAntagonistExposed] = useState<boolean>(false);
  const [leadPipeRigidity, setLeadPipeRigidity] = useState<boolean>(false);
  const [cpkLevel, setCpkLevel] = useState<string>("350");
  const [leukocytosis, setLeukocytosis] = useState<boolean>(false);
  const [hyporeflexia, setHyporeflexia] = useState<boolean>(false);

  // Anticholinergic signs
  const [anticholinergicExposed, setAnticholinergicExposed] = useState<boolean>(false);
  const [mydriasis, setMydriasis] = useState<boolean>(false);
  const [anhidrosis, setAnhidrosis] = useState<boolean>(false);
  const [urinaryRetention, setUrinaryRetention] = useState<boolean>(false);
  const [delirium, setDelirium] = useState<boolean>(false);
  const [flushing, setFlushing] = useState<boolean>(false);
  const [tcaOrWideQrs, setTcaOrWideQrs] = useState<boolean>(false);

  const numTemp = Math.max(34.0, Math.min(44.0, Number(temperatureC) || 37.0));
  const numCpk = Math.max(50, Number(cpkLevel) || 150);

  // Computed Evaluations
  const hunterEval = useMemo(
    () =>
      evaluateHunterSerotoninCriteria({
        serotonergicExposure: serotonergicExposed,
        spontaneousClonus,
        inducibleClonus,
        ocularClonus,
        agitation,
        diaphoresis,
        tremor,
        hyperreflexia,
        hypertonia,
        temperatureCelsius: numTemp,
      }),
    [
      serotonergicExposed,
      spontaneousClonus,
      inducibleClonus,
      ocularClonus,
      agitation,
      diaphoresis,
      tremor,
      hyperreflexia,
      hypertonia,
      numTemp,
    ],
  );

  const nmsEval = useMemo(
    () =>
      evaluateNmsCriteria({
        dopamineAntagonistExposure: dopamineAntagonistExposed,
        leadPipeRigidity,
        temperatureCelsius: numTemp,
        autonomicInstability: diaphoresis || agitation,
        alteredMentalStatus: delirium || agitation,
        cpkLevelUPerL: numCpk,
        elevatedCpk: numCpk > 1000,
        leukocytosis,
        hyporeflexiaOrNormalReflexes: hyporeflexia,
      }),
    [
      dopamineAntagonistExposed,
      leadPipeRigidity,
      numTemp,
      diaphoresis,
      agitation,
      delirium,
      numCpk,
      leukocytosis,
      hyporeflexia,
    ],
  );

  const anticholEval = useMemo(
    () =>
      evaluateAnticholinergicToxidrome({
        anticholinergicExposure: anticholinergicExposed,
        mydriasis,
        deliriumOrAgitation: delirium || agitation,
        flushing,
        hyperthermia: numTemp >= 37.8,
        anhidrosis,
        urinaryRetentionOrHypoactiveBowel: urinaryRetention,
        tachycardia: true,
        tcaIngestionOrWideQrsOrAvBlock: tcaOrWideQrs,
      }),
    [
      anticholinergicExposed,
      mydriasis,
      delirium,
      agitation,
      flushing,
      numTemp,
      anhidrosis,
      urinaryRetention,
      tcaOrWideQrs,
    ],
  );

  /* ======================================================================== */
  /* STATE: CLOZAPINE TDM & TOBACCO SIMULATOR                                 */
  /* ======================================================================== */
  const [ancInput, setAncInput] = useState<string>("1650");
  const [isBen, setIsBen] = useState<boolean>(false);
  const [clozapineDoseMg, setClozapineDoseMg] = useState<string>("400");
  const [baselineSerumLevel, setBaselineSerumLevel] = useState<string>("450");
  const [tobaccoScenario, setTobaccoScenario] = useState<
    "smoker-steady" | "cessation-acute" | "resumption-acute" | "nonsmoker-steady"
  >(host.smoking ? "cessation-acute" : "smoker-steady");
  const [daysPostChange, setDaysPostChange] = useState<number>(5);
  const [cigsPerDay, setCigsPerDay] = useState<string>("15");

  const numAnc = Math.max(0, Number(ancInput) || 0);
  const numClozapineDose = Math.max(25, Number(clozapineDoseMg) || 300);
  const numBaselineLevel = Math.max(50, Number(baselineSerumLevel) || 400);
  const numCigs = Math.max(0, Number(cigsPerDay) || 0);

  const ancEval = useMemo(() => evaluateClozapineAnc(numAnc, isBen), [numAnc, isBen]);

  const tobaccoModel = useMemo(
    () =>
      modelClozapineTobaccoKinetics({
        currentDailyDoseMg: numClozapineDose,
        isSmokingTobacco: host.smoking || tobaccoScenario === "smoker-steady" || tobaccoScenario === "cessation-acute",
        cigarettesPerDay: numCigs,
        scenario: tobaccoScenario,
        daysPostChange,
        knownSmokerSerumLevelNgMl: numBaselineLevel,
      }),
    [numClozapineDose, host.smoking, tobaccoScenario, numCigs, daysPostChange, numBaselineLevel],
  );

  const cighEval = useMemo(
    () =>
      evaluateCighRisk({
        hasClozapine: true,
        concurrentAnticholinergicAgents: ids.filter((id) =>
          ["benztropine", "diphenhydramine", "amitriptyline", "doxepin", "oxybutynin"].includes(id),
        ),
        concurrentOpioid: ids.some((id) =>
          ["morphine", "oxycodone", "fentanyl", "methadone", "hydromorphone", "buprenorphine"].includes(id),
        ),
        ageYears: host.age === "geriatric" ? 72 : 45,
        constipationReported: true,
        bowelMovementAbsenceDays: 2,
      }),
    [ids.join("|"), host.age],
  );

  /* ======================================================================== */
  /* STATE: ANTIDEPRESSANT CROSS-TAPER & WASHOUT CALCULATOR                   */
  /* ======================================================================== */
  const [fromDrug, setFromDrug] = useState<string>("fluoxetine");
  const [toDrug, setToDrug] = useState<string>("phenelzine");
  const [outgoingDose, setOutgoingDose] = useState<string>("40");

  const numOutgoingDose = Math.max(5, Number(outgoingDose) || 20);

  const crossTaperEval = useMemo(
    () => calculateAntidepressantCrossTaper(fromDrug, toDrug, numOutgoingDose),
    [fromDrug, toDrug, numOutgoingDose],
  );

  const fromFinishEval = useMemo(() => evaluateFinishSyndromeRisk(fromDrug, true), [fromDrug]);

  return (
    <div className="space-y-6 text-xs text-fg">
      {/* Header Banner */}
      <div className="rounded-lg bg-surface-sunken p-4 border border-border space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-accent" />
            <span className="font-serif font-bold text-sm tracking-tight text-fg">
              Neuropsychiatric Polypharmacy, TDM &amp; Neuro-Emergency Station
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
          Comprehensive Hunter Serotonin Toxicity Criteria decision tree, Levenson/Gurrera NMS criteria, Anticholinergic
          anhidrosis discrimination, Clozapine REMS ANC protocols, tobacco PAH CYP1A2 induction vs cessation surge
          kinetics, CIGH bowel hypomotility hazards, and antidepressant FINISH discontinuation / MAOI 5-week washout calculations.
        </p>
      </div>

      {/* Critical Active Desk Alerts */}
      {report.activeAlerts.length > 0 && (
        <div className="rounded-md border border-danger/40 bg-danger-soft/20 p-4 space-y-3">
          <div className="flex items-center gap-2 text-danger font-semibold text-sm">
            <ShieldAlert className="h-4 w-4" />
            <span>Active Neuropsychiatric Alerts ({report.activeAlerts.length})</span>
          </div>
          <div className="space-y-2">
            {report.activeAlerts.map((alert, idx) => (
              <div key={idx} className="rounded border border-danger/20 bg-surface p-2.5 space-y-1">
                <p className="font-mono text-xs font-bold text-danger">{alert}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Station Tab Controls */}
      <div className="flex flex-wrap border-b border-border gap-2 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("emergencies")}
          className={cn(
            "px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5",
            activeTab === "emergencies"
              ? "bg-ink text-bg font-bold"
              : "bg-surface text-muted hover:text-fg border border-border",
          )}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Neuro-Emergency Differential Matrix</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("clozapine")}
          className={cn(
            "px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5",
            activeTab === "clozapine"
              ? "bg-ink text-bg font-bold"
              : "bg-surface text-muted hover:text-fg border border-border",
          )}
        >
          <Pill className="h-3.5 w-3.5" />
          <span>Clozapine TDM, REMS &amp; Tobacco Kinetics</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("crosstaper")}
          className={cn(
            "px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5",
            activeTab === "crosstaper"
              ? "bg-ink text-bg font-bold"
              : "bg-surface text-muted hover:text-fg border border-border",
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Antidepressant Discontinuation &amp; Washout</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: NEURO-EMERGENCY & TOXIDROME DIFFERENTIAL MATRIX               */}
      {/* ==================================================================== */}
      {activeTab === "emergencies" && (
        <div className="space-y-6">
          {/* Bedside Physical Exam & Sign Simulator */}
          <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-fg text-sm">Bedside Physical Exam &amp; Sign Check</span>
                <p className="text-muted text-[11px]">
                  Toggle observed clinical features to evaluate Hunter Serotonin Toxicity Criteria, NMS, and Anticholinergic toxidrome.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-warn" />
                <label className="text-[11px] font-mono font-bold">Temp (°C):</label>
                <Input
                  type="number"
                  step="0.1"
                  min="34.0"
                  max="44.0"
                  value={temperatureC}
                  onChange={(e) => setTemperatureC(e.target.value)}
                  className={cn(
                    "w-20 font-mono text-center font-bold text-xs",
                    numTemp > 38.0 ? "text-danger border-danger" : "text-fg",
                  )}
                />
              </div>
            </div>

            {/* Checkboxes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border">
              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-surface-sunken">
                <input
                  type="checkbox"
                  checked={serotonergicExposed}
                  onChange={(e) => setSerotonergicExposed(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-0"
                />
                <span className="text-[11px]">Serotonergic Drug Exposed</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-surface-sunken">
                <input
                  type="checkbox"
                  checked={spontaneousClonus}
                  onChange={(e) => setSpontaneousClonus(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-0"
                />
                <span className="text-[11px] font-semibold text-accent">Spontaneous Clonus</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-surface-sunken">
                <input
                  type="checkbox"
                  checked={inducibleClonus}
                  onChange={(e) => setInducibleClonus(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-0"
                />
                <span className="text-[11px]">Inducible Clonus</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-surface-sunken">
                <input
                  type="checkbox"
                  checked={ocularClonus}
                  onChange={(e) => setOcularClonus(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-0"
                />
                <span className="text-[11px]">Ocular Clonus</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-surface-sunken">
                <input
                  type="checkbox"
                  checked={agitation}
                  onChange={(e) => setAgitation(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-0"
                />
                <span className="text-[11px]">Agitation / Restlessness</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-surface-sunken">
                <input
                  type="checkbox"
                  checked={diaphoresis}
                  onChange={(e) => setDiaphoresis(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-0"
                />
                <span className="text-[11px] font-bold text-warn">Diaphoresis (Profuse Sweat)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-surface-sunken">
                <input
                  type="checkbox"
                  checked={tremor}
                  onChange={(e) => setTremor(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-0"
                />
                <span className="text-[11px]">Tremor</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-surface-sunken">
                <input
                  type="checkbox"
                  checked={hyperreflexia}
                  onChange={(e) => setHyperreflexia(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-0"
                />
                <span className="text-[11px] font-semibold text-accent">Hyperreflexia (Lower &gt; Upper)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-surface-sunken">
                <input
                  type="checkbox"
                  checked={hypertonia}
                  onChange={(e) => setHypertonia(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-0"
                />
                <span className="text-[11px]">Hypertonia</span>
              </label>

              {/* NMS Inputs */}
              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-surface-sunken">
                <input
                  type="checkbox"
                  checked={dopamineAntagonistExposed}
                  onChange={(e) => setDopamineAntagonistExposed(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-0"
                />
                <span className="text-[11px]">Dopamine Antagonist Exposed</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-surface-sunken">
                <input
                  type="checkbox"
                  checked={leadPipeRigidity}
                  onChange={(e) => setLeadPipeRigidity(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-0"
                />
                <span className="text-[11px] font-bold text-danger">Lead-Pipe Rigidity</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-surface-sunken">
                <input
                  type="checkbox"
                  checked={hyporeflexia}
                  onChange={(e) => setHyporeflexia(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-0"
                />
                <span className="text-[11px]">Hyporeflexia / Normal Reflex</span>
              </label>

              {/* Anticholinergic Inputs */}
              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-surface-sunken">
                <input
                  type="checkbox"
                  checked={anticholinergicExposed}
                  onChange={(e) => setAnticholinergicExposed(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-0"
                />
                <span className="text-[11px]">Anticholinergic Exposed</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-surface-sunken">
                <input
                  type="checkbox"
                  checked={anhidrosis}
                  onChange={(e) => setAnhidrosis(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-0"
                />
                <span className="text-[11px] font-bold text-info">Anhidrosis (Bone Dry Skin/Axillae)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-surface-sunken">
                <input
                  type="checkbox"
                  checked={mydriasis}
                  onChange={(e) => setMydriasis(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-0"
                />
                <span className="text-[11px]">Mydriasis (Dilated Pupils)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-surface-sunken">
                <input
                  type="checkbox"
                  checked={urinaryRetention}
                  onChange={(e) => setUrinaryRetention(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-0"
                />
                <span className="text-[11px]">Urinary Retention / No Bowel</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-surface-sunken">
                <input
                  type="checkbox"
                  checked={delirium}
                  onChange={(e) => setDelirium(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-0"
                />
                <span className="text-[11px]">Delirium / Mumbling / Plucking</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-surface-sunken">
                <input
                  type="checkbox"
                  checked={flushing}
                  onChange={(e) => setFlushing(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-0"
                />
                <span className="text-[11px]">Flushing ("Red as a Beet")</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-surface-sunken">
                <input
                  type="checkbox"
                  checked={tcaOrWideQrs}
                  onChange={(e) => setTcaOrWideQrs(e.target.checked)}
                  className="rounded border-border text-danger focus:ring-0"
                />
                <span className="text-[11px] font-bold text-danger">TCA Overdose / Wide QRS / AV Block</span>
              </label>
            </div>
          </div>

          {/* Tri-Differential Diagnostic Verdict Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Serotonin Syndrome */}
            <div
              className={cn(
                "rounded-lg border p-4 space-y-3",
                hunterEval.meetsHunterCriteria
                  ? "border-danger bg-danger-soft/20"
                  : "border-border bg-surface",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-fg">Serotonin Syndrome</span>
                <Badge tone={hunterEval.meetsHunterCriteria ? "danger" : "default"}>
                  {hunterEval.meetsHunterCriteria ? `MET (${hunterEval.severityGrade.toUpperCase()})` : "NOT MET"}
                </Badge>
              </div>

              {hunterEval.satisfiedRuleName && (
                <div className="rounded bg-surface p-2 border border-border">
                  <span className="text-[10px] text-muted block uppercase font-mono">Hunter Decision Rule:</span>
                  <span className="font-mono text-xs font-bold text-danger">{hunterEval.satisfiedRuleName}</span>
                </div>
              )}

              <p className="text-muted leading-relaxed text-[11px]">{hunterEval.clinicalPresentationSummary}</p>

              <div className="space-y-1.5 border-t border-border pt-2 text-[11px]">
                <div className="font-semibold text-fg">Specific Management:</div>
                <p className="text-muted">{hunterEval.managementProtocol.antidoteRecommendation}</p>
                <div className="rounded bg-warn-soft/30 p-2 text-warn border border-warn/30 font-semibold">
                  {hunterEval.managementProtocol.antipyreticWarning}
                </div>
              </div>
            </div>

            {/* Card 2: Neuroleptic Malignant Syndrome */}
            <div
              className={cn(
                "rounded-lg border p-4 space-y-3",
                nmsEval.meetsNmsCriteria ? "border-danger bg-danger-soft/20" : "border-border bg-surface",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-fg">Neuroleptic Malignant Syndrome</span>
                <Badge tone={nmsEval.meetsNmsCriteria ? "danger" : "default"}>
                  {nmsEval.diagnosticConfidence.toUpperCase()}
                </Badge>
              </div>

              <div className="space-y-1 text-[11px]">
                <span className="text-muted block">Levenson Major Met: {nmsEval.levensonMajorCriteriaMet.length}</span>
                <span className="text-muted block">Levenson Minor Met: {nmsEval.levensonMinorCriteriaMet.length}</span>
              </div>

              <div className="rounded bg-surface p-2 border border-border space-y-1 text-[11px]">
                <span className="font-semibold text-fg">Pharmacotherapy Targets:</span>
                <p className="text-muted">{nmsEval.pharmacotherapyProtocol.dopamineAgonistBromocriptine}</p>
                <p className="text-muted">{nmsEval.pharmacotherapyProtocol.ryanodineBlockerDantrolene}</p>
              </div>

              <div className="border-t border-border pt-2 text-[11px] text-muted">
                <span className="font-semibold text-fg block">Key SS Differentiator:</span>
                {nmsEval.differentiatorVsSerotoninSyndrome.neuromuscularComparison}
              </div>
            </div>

            {/* Card 3: Anticholinergic Toxidrome */}
            <div
              className={cn(
                "rounded-lg border p-4 space-y-3",
                anticholEval.meetsAnticholinergicToxidrome
                  ? "border-warn bg-warn-soft/20"
                  : "border-border bg-surface",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-fg">Anticholinergic Toxidrome</span>
                <Badge tone={anticholEval.meetsAnticholinergicToxidrome ? "warn" : "default"}>
                  {anticholEval.meetsAnticholinergicToxidrome ? "CRITERIA MET" : "NOT MET"}
                </Badge>
              </div>

              <div className="rounded bg-info-soft/30 p-2 border border-info/30 text-info text-[11px] font-semibold">
                {anticholEval.criticalDiscriminatorVsSsAndNms}
              </div>

              <div className="space-y-1.5 border-t border-border pt-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-fg">Physostigmine Trial:</span>
                  <Badge tone={anticholEval.physostigmineSuitability.isCandidate ? "ok" : "danger"}>
                    {anticholEval.physostigmineSuitability.isCandidate ? "Candidate" : "Contraindicated"}
                  </Badge>
                </div>
                <p className="text-muted">{anticholEval.physostigmineSuitability.protocolSummary}</p>
                {tcaOrWideQrs && (
                  <div className="rounded bg-danger-soft/40 p-2 text-danger border border-danger/40 font-bold">
                    {anticholEval.physostigmineSuitability.contraindicationWarning}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Exhaustive 4-Way Side-by-Side Comparison Matrix */}
          <div className="rounded-lg border border-border bg-surface p-4 space-y-3 overflow-x-auto">
            <span className="font-semibold text-fg text-sm">
              Comprehensive Neuro-Emergency Differential Matrix (Hunter SS vs NMS vs Anticholinergic vs MH)
            </span>
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="py-2 pr-2 font-mono">Entity</th>
                  <th className="py-2 pr-2">Causative Agents</th>
                  <th className="py-2 pr-2">Onset</th>
                  <th className="py-2 pr-2">Tone &amp; Rigidity</th>
                  <th className="py-2 pr-2">Reflexes &amp; Clonus</th>
                  <th className="py-2 pr-2 font-bold text-accent">Skin Moisture</th>
                  <th className="py-2 pr-2">Pupils</th>
                  <th className="py-2 pr-2">Bowel</th>
                  <th className="py-2 pr-2">Primary Antidote</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {NEURO_EMERGENCY_COMPARISON_MATRIX.map((row, idx) => (
                  <tr key={idx} className="hover:bg-surface-sunken">
                    <td className="py-2 pr-2 font-bold font-mono text-fg">{row.entity}</td>
                    <td className="py-2 pr-2 text-muted">{row.causativeAgents}</td>
                    <td className="py-2 pr-2 font-mono">{row.onsetSpeed}</td>
                    <td className="py-2 pr-2 text-muted">{row.neuromuscularTone}</td>
                    <td className="py-2 pr-2 font-mono">{row.reflexesAndClonus}</td>
                    <td className="py-2 pr-2 font-bold font-mono text-accent">{row.skinMoisture}</td>
                    <td className="py-2 pr-2 text-muted">{row.pupils}</td>
                    <td className="py-2 pr-2 text-muted">{row.bowelSounds}</td>
                    <td className="py-2 pr-2 text-fg font-semibold">{row.primaryAntidote}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: CLOZAPINE TDM & TOBACCO INDUCTION / CESSATION SIMULATOR       */}
      {/* ==================================================================== */}
      {activeTab === "clozapine" && (
        <div className="space-y-6">
          {/* Section A: Clozapine REMS Absolute Neutrophil Count (ANC) */}
          <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="font-semibold text-fg text-sm">FDA Clozapine REMS Absolute Neutrophil Count (ANC)</span>
                <p className="text-muted text-[11px]">
                  Evaluates clinical initiation, continuation, and agranulocytosis cessation protocols per official REMS requirements.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBen(!isBen)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold border transition-colors",
                  isBen ? "bg-accent text-bg border-accent" : "bg-surface-sunken text-muted border-border hover:text-fg",
                )}
              >
                {isBen ? "Benign Ethnic Neutropenia (BEN) ON" : "General Population (BEN Off)"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div>
                <label className="text-[11px] text-muted block mb-1">Current ANC (/µL):</label>
                <Input
                  type="number"
                  step="50"
                  min="0"
                  max="10000"
                  value={ancInput}
                  onChange={(e) => setAncInput(e.target.value)}
                  className="font-mono text-center font-bold text-xs text-fg"
                />
              </div>

              <div className="sm:col-span-2 rounded bg-surface-sunken p-3 border border-border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-fg">
                    REMS Status: {ancEval.remsThresholdDescription}
                  </span>
                  <Badge
                    tone={
                      ancEval.status === "normal"
                        ? "ok"
                        : ancEval.status === "mild-neutropenia"
                          ? "warn"
                          : "danger"
                    }
                  >
                    {ancEval.status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted">{ancEval.clinicalActionDirective}</p>
                <div className="text-[10px] font-mono text-muted">
                  Monitoring: {ancEval.monitoringFrequency}
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Tobacco Smoke CYP1A2 Induction vs Cessation Paradox Simulator */}
          <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-fg text-sm">
                  Tobacco Smoke CYP1A2 Induction vs Cessation Paradox Simulator
                </span>
                <p className="text-muted text-[11px]">
                  Simulates the 50%–100% clozapine serum concentration surge when an inpatient smoker stops cigarettes.
                </p>
              </div>
              <Badge tone="accent" className="font-mono text-[10px]">
                AhR-CYP1A2 Induction Model
              </Badge>
            </div>

            {/* Simulator Inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] text-muted block mb-1">Daily Clozapine (mg):</label>
                <Input
                  type="number"
                  step="25"
                  min="25"
                  max="900"
                  value={clozapineDoseMg}
                  onChange={(e) => setClozapineDoseMg(e.target.value)}
                  className="font-mono text-center font-bold text-xs text-fg"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted block mb-1">Baseline Level (ng/mL):</label>
                <Input
                  type="number"
                  step="25"
                  min="50"
                  max="1500"
                  value={baselineSerumLevel}
                  onChange={(e) => setBaselineSerumLevel(e.target.value)}
                  className="font-mono text-center font-bold text-xs text-fg"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted block mb-1">Cigarettes / Day:</label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="60"
                  value={cigsPerDay}
                  onChange={(e) => setCigsPerDay(e.target.value)}
                  className="font-mono text-center font-bold text-xs text-fg"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted block mb-1">Days Post Change:</label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="14"
                  value={daysPostChange}
                  onChange={(e) => setDaysPostChange(Math.max(0, Number(e.target.value) || 0))}
                  className="font-mono text-center font-bold text-xs text-fg"
                />
              </div>
            </div>

            {/* Scenario Buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTobaccoScenario("smoker-steady")}
                className={cn(
                  "px-3 py-1 rounded text-xs font-semibold border transition-colors",
                  tobaccoScenario === "smoker-steady" ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
                )}
              >
                1. Steady Smoker
              </button>
              <button
                type="button"
                onClick={() => setTobaccoScenario("cessation-acute")}
                className={cn(
                  "px-3 py-1 rounded text-xs font-semibold border transition-colors",
                  tobaccoScenario === "cessation-acute" ? "bg-danger text-bg border-danger" : "bg-surface text-muted hover:text-fg",
                )}
              >
                2. Abrupt Cessation (Unit Admission / Patch)
              </button>
              <button
                type="button"
                onClick={() => setTobaccoScenario("resumption-acute")}
                className={cn(
                  "px-3 py-1 rounded text-xs font-semibold border transition-colors",
                  tobaccoScenario === "resumption-acute" ? "bg-warn text-bg border-warn" : "bg-surface text-muted hover:text-fg",
                )}
              >
                3. Smoking Resumption (Discharge)
              </button>
              <button
                type="button"
                onClick={() => setTobaccoScenario("nonsmoker-steady")}
                className={cn(
                  "px-3 py-1 rounded text-xs font-semibold border transition-colors",
                  tobaccoScenario === "nonsmoker-steady" ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
                )}
              >
                4. Steady Non-Smoker
              </button>
            </div>

            {/* Kinetic Outputs Display */}
            <div className="rounded-lg bg-surface-sunken p-4 border border-border space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-fg text-sm">Projected Concentration &amp; Clearance</span>
                <Badge
                  tone={
                    tobaccoModel.toxicityRiskTier === "critical-toxicity"
                      ? "danger"
                      : tobaccoModel.toxicityRiskTier === "elevated-seizure-risk"
                        ? "warn"
                        : "ok"
                  }
                  className="font-mono text-xs uppercase"
                >
                  {tobaccoModel.toxicityRiskTier}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="rounded bg-surface p-2 border border-border">
                  <span className="text-[10px] text-muted uppercase block">CYP1A2 Induction</span>
                  <span className="font-mono text-base font-bold text-fg">{tobaccoModel.cyp1a2InductionRatio}x</span>
                </div>
                <div className="rounded bg-surface p-2 border border-border">
                  <span className="text-[10px] text-muted uppercase block">Relative Clearance</span>
                  <span className="font-mono text-base font-bold text-fg">{tobaccoModel.relativeClearance}x</span>
                </div>
                <div className="rounded bg-surface p-2 border border-border">
                  <span className="text-[10px] text-muted uppercase block">Projected Serum Clozapine</span>
                  <span
                    className={cn(
                      "font-mono text-base font-bold",
                      tobaccoModel.projectedSerumConcentrationNgMl > 1000
                        ? "text-danger"
                        : tobaccoModel.projectedSerumConcentrationNgMl > 650
                          ? "text-warn"
                          : "text-fg",
                    )}
                  >
                    {tobaccoModel.projectedSerumConcentrationNgMl} ng/mL
                  </span>
                </div>
                <div className="rounded bg-surface p-2 border border-border">
                  <span className="text-[10px] text-muted uppercase block">Concentration Surge</span>
                  <span className="font-mono text-base font-bold text-accent">
                    {tobaccoModel.projectedConcentrationChangePercent > 0 ? "+" : ""}
                    {tobaccoModel.projectedConcentrationChangePercent}%
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-muted leading-relaxed">{tobaccoModel.proactiveManagementPlan}</p>

              {/* Crucial Teaching Banner */}
              <div className="rounded bg-accent-soft/30 p-2.5 border border-accent/30 text-accent font-semibold text-[11px]">
                {tobaccoModel.nicotineReplacementEducation}
              </div>
            </div>
          </div>

          {/* Section C: Clozapine-Induced Gastrointestinal Hypomotility (CIGH) */}
          <div className="rounded-lg border border-border bg-surface p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-fg text-sm">Clozapine-Induced Gastrointestinal Hypomotility (CIGH)</span>
              <Badge tone="danger" className="font-mono uppercase text-[10px]">
                Mortality Exceeds Agranulocytosis
              </Badge>
            </div>
            <p className="text-muted text-[11px] leading-relaxed">{cighEval.mortalityWarning}</p>
            <div className="border-t border-border pt-2 text-[11px] space-y-1">
              <span className="font-semibold text-fg">Mandated Proactive Interventions:</span>
              <ul className="list-disc list-inside text-muted space-y-0.5">
                {cighEval.mandatedProactiveInterventions.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: ANTIDEPRESSANT CROSS-TAPER & WASHOUT CALCULATOR               */}
      {/* ==================================================================== */}
      {activeTab === "crosstaper" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
            <div>
              <span className="font-semibold text-fg text-sm">
                Antidepressant Cross-Tapering, FINISH Risk &amp; MAOI Washout Calculator
              </span>
              <p className="text-muted text-[11px]">
                Analyzes elimination half-life disparities, calculates step-by-step cross-taper schedules, and enforces mandatory MAOI washouts.
              </p>
            </div>

            {/* Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-muted block mb-1">Outgoing Antidepressant (From):</label>
                <select
                  value={fromDrug}
                  onChange={(e) => setFromDrug(e.target.value)}
                  className="w-full rounded border border-border bg-surface p-2 text-xs font-mono text-fg"
                >
                  <option value="fluoxetine">Fluoxetine (Prozac) - Norfluoxetine t1/2 7-15d</option>
                  <option value="paroxetine">Paroxetine (Paxil) - t1/2 21h (Extreme FINISH)</option>
                  <option value="venlafaxine">Venlafaxine (Effexor) - t1/2 5-11h (Extreme FINISH)</option>
                  <option value="desvenlafaxine">Desvenlafaxine (Pristiq) - t1/2 11h</option>
                  <option value="duloxetine">Duloxetine (Cymbalta) - t1/2 12h</option>
                  <option value="sertraline">Sertraline (Zoloft) - t1/2 26h</option>
                  <option value="escitalopram">Escitalopram (Lexapro) - t1/2 30h</option>
                  <option value="citalopram">Citalopram (Celexa) - t1/2 35h</option>
                  <option value="fluvoxamine">Fluvoxamine (Luvox) - t1/2 15h</option>
                  <option value="phenelzine">Phenelzine (Nardil) - MAOI</option>
                  <option value="tranylcypromine">Tranylcypromine (Parnate) - MAOI</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-muted block mb-1">Target Antidepressant (To):</label>
                <select
                  value={toDrug}
                  onChange={(e) => setToDrug(e.target.value)}
                  className="w-full rounded border border-border bg-surface p-2 text-xs font-mono text-fg"
                >
                  <option value="phenelzine">Phenelzine (Nardil) - MAOI</option>
                  <option value="tranylcypromine">Tranylcypromine (Parnate) - MAOI</option>
                  <option value="sertraline">Sertraline (Zoloft) - SSRI</option>
                  <option value="escitalopram">Escitalopram (Lexapro) - SSRI</option>
                  <option value="fluoxetine">Fluoxetine (Prozac) - SSRI</option>
                  <option value="venlafaxine">Venlafaxine (Effexor) - SNRI</option>
                  <option value="duloxetine">Duloxetine (Cymbalta) - SNRI</option>
                  <option value="bupropion">Bupropion (Wellbutrin) - NDRI</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-muted block mb-1">Current Outgoing Dose (mg):</label>
                <Input
                  type="number"
                  step="5"
                  min="5"
                  max="300"
                  value={outgoingDose}
                  onChange={(e) => setOutgoingDose(e.target.value)}
                  className="font-mono text-center font-bold text-xs text-fg"
                />
              </div>
            </div>

            {/* Transition Strategy Verdict Card */}
            <div
              className={cn(
                "rounded-lg p-4 border space-y-3",
                crossTaperEval.washoutDaysRequired >= 35
                  ? "border-danger bg-danger-soft/20"
                  : crossTaperEval.washoutDaysRequired > 0
                    ? "border-warn bg-warn-soft/20"
                    : "border-border bg-surface-sunken",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-fg">
                    {crossTaperEval.fromDrugName} <ArrowRight className="h-3.5 w-3.5 inline text-accent" />{" "}
                    {crossTaperEval.toDrugName}
                  </span>
                </div>
                <Badge
                  tone={
                    crossTaperEval.serotoninSyndromeRiskDuringTransition === "critical"
                      ? "danger"
                      : crossTaperEval.serotoninSyndromeRiskDuringTransition === "high"
                        ? "warn"
                        : "ok"
                  }
                  className="font-mono uppercase text-[10px]"
                >
                  SS Risk: {crossTaperEval.serotoninSyndromeRiskDuringTransition}
                </Badge>
              </div>

              <p className="font-semibold text-xs leading-relaxed text-fg">{crossTaperEval.scheduleSummary}</p>

              {crossTaperEval.contraindicationNotice && (
                <div className="rounded bg-danger-soft/40 p-2.5 text-danger border border-danger/40 font-bold text-[11px]">
                  {crossTaperEval.contraindicationNotice}
                </div>
              )}

              {/* Step-by-Step Protocol List */}
              <div className="border-t border-border pt-2 space-y-1">
                <span className="text-[11px] font-semibold text-fg">Step-by-Step Transition Protocol:</span>
                <ol className="list-decimal list-inside text-[11px] text-muted space-y-1">
                  {crossTaperEval.stepByStepProtocol.map((step, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* FINISH Syndrome Mnemonic Breakdown for Outgoing Drug */}
            {fromFinishEval && (
              <div className="rounded-lg bg-surface-sunken p-4 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-fg text-sm">
                    FINISH Syndrome Profile: {fromFinishEval.drugName} (Risk: {fromFinishEval.riskTier.toUpperCase()})
                  </span>
                  <Badge
                    tone={
                      fromFinishEval.riskTier === "extreme"
                        ? "danger"
                        : fromFinishEval.riskTier === "high"
                          ? "warn"
                          : "default"
                    }
                  >
                    Half-Life: {fromFinishEval.halfLifeHours}h
                  </Badge>
                </div>
                <p className="text-muted text-[11px]">{fromFinishEval.clinicalTaperingRecommendation}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] border-t border-border pt-2 text-muted">
                  <div>
                    <span className="font-bold text-fg">F:</span> {fromFinishEval.finishMnemonicDetails.f}
                  </div>
                  <div>
                    <span className="font-bold text-fg">I:</span> {fromFinishEval.finishMnemonicDetails.i1}
                  </div>
                  <div>
                    <span className="font-bold text-fg">N:</span> {fromFinishEval.finishMnemonicDetails.n}
                  </div>
                  <div>
                    <span className="font-bold text-fg">I:</span> {fromFinishEval.finishMnemonicDetails.i2}
                  </div>
                  <div className="sm:col-span-2">
                    <span className="font-bold text-fg">S:</span> {fromFinishEval.finishMnemonicDetails.s}
                  </div>
                  <div className="sm:col-span-2">
                    <span className="font-bold text-fg">H:</span> {fromFinishEval.finishMnemonicDetails.h}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Citations & Non-Device CDS Footnote */}
      <div className="rounded-lg border border-border bg-surface-sunken p-4 space-y-2 text-[10px] text-muted">
        <div className="flex items-center gap-1 font-bold text-fg uppercase">
          <Info className="h-3.5 w-3.5 text-accent" />
          <span>Statutory Non-Device Clinical Decision Support Reference (FD&amp;C Act § 520(o)(1)(E))</span>
        </div>
        <p className="leading-relaxed">{NEUROPSYCH_KINETICS_REGULATORY_DISCLAIMER}</p>
        <details className="cursor-pointer pt-1">
          <summary className="font-semibold text-fg hover:underline">
            View Landmark Neuropsychiatry &amp; TDM Literature Citations ({NEUROPSYCH_CITATIONS.length})
          </summary>
          <ul className="list-disc list-inside space-y-1 pt-2 font-mono text-[9px]">
            {NEUROPSYCH_CITATIONS.map((cit, idx) => (
              <li key={idx}>{cit}</li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}
