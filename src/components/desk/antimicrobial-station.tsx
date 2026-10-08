import { useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, ShieldAlert, Sparkles, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { HostContext } from "@/lib/drugs/types";
import {
  antimicrobialReportOnDesk,
  ANTIMICROBIAL_CITATIONS,
  ANTIMICROBIAL_REGULATORY_DISCLAIMER,
  evaluateCefepimeNeurotoxicity,
  evaluateDaptomycinMyopathy,
  evaluateFluoroquinoloneCollisions,
  evaluateOxazolidinoneToxicities,
  evaluatePolymyxinToxicities,
} from "@/lib/drugs/antimicrobial-stewardship";

export function AntimicrobialPanel({ ids, host }: { ids: string[]; host: HostContext }) {
  const report = useMemo(() => antimicrobialReportOnDesk(ids, host), [ids.join("|"), host.kidney, host.age]);

  // Cefepime calculator state
  const [crCl, setCrCl] = useState<string>(host.kidney === "ckd" ? "25" : "75");
  const [isDialysis, setIsDialysis] = useState<boolean>(false);
  const numCrCl = Math.max(0, Number(crCl) || 0);

  // Daptomycin state
  const [cpkLevel, setCpkLevel] = useState<string>("350");
  const [hasMusclePain, setHasMusclePain] = useState<boolean>(false);
  const numCpk = Math.max(0, Number(cpkLevel) || 0);

  // Linezolid duration
  const [therapyDays, setTherapyDays] = useState<number>(18);

  const simulatedHost = useMemo<HostContext>(
    () => ({
      ...host,
      kidney: isDialysis || numCrCl < 50 ? "ckd" : host.kidney,
    }),
    [host, isDialysis, numCrCl],
  );

  const cefepimeIds = useMemo(
    () => (ids.includes("cefepime") ? ids : [...ids, "cefepime"]),
    [ids.join("|")],
  );
  const cefepimeEval = useMemo(
    () => evaluateCefepimeNeurotoxicity(cefepimeIds, simulatedHost),
    [cefepimeIds, simulatedHost],
  );

  const daptomycinIds = useMemo(
    () => (ids.includes("daptomycin") ? ids : [...ids, "daptomycin"]),
    [ids.join("|")],
  );
  const daptomycinEval = useMemo(
    () => evaluateDaptomycinMyopathy(daptomycinIds, simulatedHost),
    [daptomycinIds, simulatedHost],
  );

  const oxazolidinoneIds = useMemo(
    () => (ids.some((x) => x === "linezolid" || x === "tedizolid") ? ids : [...ids, "linezolid"]),
    [ids.join("|")],
  );
  const oxazolidinoneEval = useMemo(
    () => evaluateOxazolidinoneToxicities(oxazolidinoneIds, simulatedHost),
    [oxazolidinoneIds, simulatedHost],
  );

  const polymyxinIds = useMemo(
    () => (ids.some((x) => x === "colistin" || x === "polymyxin-b") ? ids : [...ids, "colistin"]),
    [ids.join("|")],
  );
  const polymyxinEval = useMemo(
    () => evaluatePolymyxinToxicities(polymyxinIds, simulatedHost),
    [polymyxinIds, simulatedHost],
  );

  const fqIds = useMemo(
    () =>
      ids.some((x) => x === "ciprofloxacin" || x === "levofloxacin" || x === "moxifloxacin")
        ? ids
        : [...ids, "ciprofloxacin"],
    [ids.join("|")],
  );
  const fqEval = useMemo(
    () => evaluateFluoroquinoloneCollisions(fqIds, simulatedHost),
    [fqIds, simulatedHost],
  );

  const highestSeverity = useMemo(() => {
    if (report.collisions.some((c) => c.severity === "contraindicated")) return "contraindicated";
    if (report.collisions.some((c) => c.severity === "major")) return "major";
    if (report.collisions.some((c) => c.severity === "moderate")) return "moderate";
    if (report.collisions.some((c) => c.severity === "warning")) return "warning";
    return "standard";
  }, [report.collisions]);

  const isDaptoElevationSignificant = useMemo(() => {
    if (!daptomycinEval) return false;
    const thresholds = daptomycinEval.practiceStandard.discontinuationThresholds;
    return hasMusclePain ? numCpk >= thresholds.symptomaticCpkU_L : numCpk >= thresholds.asymptomaticCpkU_L;
  }, [daptomycinEval, hasMusclePain, numCpk]);

  const isCefepimeHighRisk = cefepimeEval?.riskLevel === "high" || cefepimeEval?.riskLevel === "critical";
  const hasOxazolidinoneSerotoninCollision = oxazolidinoneEval?.serotoninToxicity.riskLevel !== "none";
  const hasOxazolidinoneMyelosuppressionWarning =
    oxazolidinoneEval &&
    therapyDays >= oxazolidinoneEval.timeDependentToxicities.myelosuppression.onsetThresholdDays;
  const hasOxazolidinoneNeuropathyWarning =
    oxazolidinoneEval &&
    therapyDays >= oxazolidinoneEval.timeDependentToxicities.neuropathies.onsetThresholdDays;

  return (
    <div className="space-y-6 text-xs text-fg">
      {/* Header Banner */}
      <div className="rounded-lg bg-surface-sunken p-4 border border-border space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-accent" />
            <span className="font-serif font-bold text-sm tracking-tight text-fg">
              Antimicrobial Stewardship, Neuro/Nephrotoxicity & Organ Collisions
            </span>
          </div>
          <Badge
            tone={
              highestSeverity === "contraindicated"
                ? "danger"
                : highestSeverity === "major"
                  ? "warn"
                  : highestSeverity === "moderate"
                    ? "accent"
                    : highestSeverity === "warning"
                      ? "info"
                      : "ok"
            }
            className="font-mono uppercase text-[10px]"
          >
            Tier: {highestSeverity}
          </Badge>
        </div>
        <p className="text-muted leading-relaxed">
          Cefepime GABA-A competitive neurotoxicity, Daptomycin sarcolemmal myopathy & statin holds, Linezolid MAO
          inhibition, Polymyxin neuromuscular blockade, and Fluoroquinolone multi-system black box profiles.
        </p>
      </div>

      {/* Active Collisions Banner */}
      {report.collisions.length > 0 ? (
        <div className="rounded-md border border-danger/40 bg-danger-soft/20 p-4 space-y-3">
          <div className="flex items-center gap-2 text-danger font-semibold text-sm">
            <ShieldAlert className="h-4 w-4" />
            <span>Active Stewardship Collisions on Desk ({report.collisions.length})</span>
          </div>
          <div className="space-y-2">
            {report.collisions.map((c) => (
              <div key={c.id} className="rounded border border-danger/30 bg-surface p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-fg">{c.title}</span>
                  <Badge
                    tone={c.severity === "contraindicated" ? "danger" : "warn"}
                    className="text-[10px] uppercase font-mono"
                  >
                    {c.severity}
                  </Badge>
                </div>
                <p className="text-muted">{c.mechanism}</p>
                <p className="text-danger font-medium text-[11px]">{c.stewardshipAction}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* SECTION 1: CEFEPIME NEUROTOXICITY & GABA-A ANTAGONISM */}
      {cefepimeEval ? (
        <section className="rounded-lg border border-border bg-surface p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
            <div>
              <h3 className="font-serif font-bold text-sm text-fg">
                1. Cefepime Neurotoxicity & GABA-A Competitive Antagonism
              </h3>
              <p className="text-muted text-[11px]">
                Crosses blood-brain barrier; competitive inhibition at GABA-A receptor chloride channels triggering NCSE.
              </p>
            </div>
            <Badge
              tone={isCefepimeHighRisk ? "danger" : "ok"}
              className="text-[10px] uppercase font-mono"
            >
              {cefepimeEval.riskLevel} Risk
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Estimated CrCl (mL/min)</label>
              <Input
                type="number"
                step="5"
                value={crCl}
                onChange={(e) => setCrCl(e.target.value)}
                className="h-9 font-mono text-xs"
                placeholder="e.g. 25"
              />
              <span className="text-[10px] text-muted block mt-0.5">Threshold: &lt; 50 mL/min triggers neurotoxicity</span>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Renal Replacement Therapy</label>
              <button
                type="button"
                onClick={() => setIsDialysis(!isDialysis)}
                className={cn(
                  "h-9 w-full rounded border text-xs font-medium transition-colors",
                  isDialysis ? "border-accent bg-accent text-accent-fg font-semibold" : "border-border bg-surface-sunken text-muted hover:text-fg",
                )}
              >
                {isDialysis ? "Intermittent Hemodialysis (IHD)" : "Non-Dialysis Patient"}
              </button>
              <span className="text-[10px] text-muted block mt-0.5">~70% removed per 3h session</span>
            </div>

            <div className="rounded border border-border bg-surface-sunken p-2.5 space-y-1">
              <span className="font-semibold block text-fg">EEG Diagnostic Signature</span>
              <p className="text-[11px] text-muted leading-tight">
                {cefepimeEval.clinicalSpectrum.eegFindings.pattern}
              </p>
            </div>
          </div>

          <div className="rounded border border-border bg-surface-sunken p-3 space-y-1.5 text-[11px]">
            <span className="font-semibold block text-fg">Clinical Spectrum & Dialysis Clearance Pearls</span>
            <p className="text-muted leading-relaxed">{cefepimeEval.mechanism}</p>
            <p className="text-accent font-medium">{cefepimeEval.hemodialysisClearance.dosingScheduleStandard}</p>
          </div>
        </section>
      ) : null}

      {/* SECTION 2: DAPTOMYCIN SKELETAL MYOPATHY & STATIN HOLD */}
      {daptomycinEval ? (
        <section className="rounded-lg border border-border bg-surface p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
            <div>
              <h3 className="font-serif font-bold text-sm text-fg">
                2. Daptomycin Sarcolemmal Myopathy & Statin Collision
              </h3>
              <p className="text-muted text-[11px]">
                Direct disruption of human skeletal muscle sarcolemma; additive myopathy with HMG-CoA reductase inhibitors.
              </p>
            </div>
            <Badge
              tone={daptomycinEval.statinCollision.present ? "danger" : "ok"}
              className="text-[10px] uppercase font-mono"
            >
              {daptomycinEval.statinCollision.present ? "Mandatory Statin Hold" : "No Statin on Desk"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Serum Creatine Kinase (CPK, U/L)</label>
              <Input
                type="number"
                step="50"
                value={cpkLevel}
                onChange={(e) => setCpkLevel(e.target.value)}
                className="h-9 font-mono text-xs"
                placeholder="e.g. 350"
              />
              <span className="text-[10px] text-muted block mt-0.5">Normal adult: &lt; 200 U/L</span>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Symptomatic Myalgia / Weakness</label>
              <button
                type="button"
                onClick={() => setHasMusclePain(!hasMusclePain)}
                className={cn(
                  "h-9 w-full rounded border text-xs font-medium transition-colors",
                  hasMusclePain ? "border-danger bg-danger text-bg font-semibold" : "border-border bg-surface-sunken text-muted hover:text-fg",
                )}
              >
                {hasMusclePain ? "Myalgia / Weakness Present" : "Asymptomatic"}
              </button>
              <span className="text-[10px] text-muted block mt-0.5">Threshold: &gt;1000 if symptomatic, &gt;2000 if asymptomatic</span>
            </div>

            <div
              className={cn(
                "rounded border p-2.5 space-y-1",
                isDaptoElevationSignificant ? "border-danger bg-danger-soft/15" : "border-border bg-surface-sunken",
              )}
            >
              <span className="font-semibold block text-fg">Discontinuation Thresholds</span>
              <p className="text-[11px] text-muted leading-tight">
                Hold daptomycin if CPK &gt; {daptomycinEval.practiceStandard.discontinuationThresholds.symptomaticCpkU_L} U/L with symptoms, or &gt; {daptomycinEval.practiceStandard.discontinuationThresholds.asymptomaticCpkU_L} U/L asymptomatic.
              </p>
            </div>
          </div>

          <div className="rounded border border-border bg-surface-sunken p-3 text-[11px] space-y-1">
            <p className="text-muted leading-relaxed">{daptomycinEval.mechanism}</p>
            <p className="text-danger font-semibold">
              Surfactant Inactivation: Daptomycin is irreversibly bound and inactivated by pulmonary surfactant; strictly ineffective for pneumonia.
            </p>
          </div>
        </section>
      ) : null}

      {/* SECTION 3: OXAZOLIDINONES (LINEZOLID) MAO & CHRONOTOXICITY */}
      {oxazolidinoneEval ? (
        <section className="rounded-lg border border-border bg-surface p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
            <div>
              <h3 className="font-serif font-bold text-sm text-fg">
                3. Linezolid / Tedizolid Reversible MAOI & Chronotoxicity
              </h3>
              <p className="text-muted text-[11px]">
                Non-selective MAO-A/B inhibition triggering serotonin syndrome & tyramine hypertensive crisis; mitochondrial rRNA chronotoxicity.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-muted">Days on Therapy:</label>
              <Input
                type="number"
                value={therapyDays}
                onChange={(e) => setTherapyDays(Math.max(1, Number(e.target.value) || 1))}
                className="h-7 w-16 font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
            <div
              className={cn(
                "rounded border p-3 space-y-1",
                hasOxazolidinoneSerotoninCollision ? "border-danger bg-danger-soft/15" : "border-border bg-surface-sunken",
              )}
            >
              <span className="font-semibold block text-fg">Serotonin Toxicity Risk</span>
              <p className="text-muted">{oxazolidinoneEval.serotoninToxicity.mechanism}</p>
            </div>

            <div className="rounded border border-border bg-surface-sunken p-3 space-y-1">
              <span className="font-semibold block text-fg">Tyramine Pressor Reaction</span>
              <p className="text-muted">{oxazolidinoneEval.tyraminePressorCollision.mechanism}</p>
            </div>

            <div
              className={cn(
                "rounded border p-3 space-y-1",
                hasOxazolidinoneMyelosuppressionWarning ? "border-warning bg-warning-soft/15" : "border-border bg-surface-sunken",
              )}
            >
              <span className="font-semibold block text-fg">Chronotoxicity ({therapyDays} Days)</span>
              <p className="text-muted">
                {hasOxazolidinoneMyelosuppressionWarning ? "* Myelosuppression risk (≥14d): weekly CBC mandatory. " : ""}
                {hasOxazolidinoneNeuropathyWarning ? "* Peripheral/optic neuropathy risk (>28d)." : "Duration < 28d."}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* SECTION 4: POLYMYXINS & FLUOROQUINOLONES SUMMARY */}
      {polymyxinEval && fqEval ? (
        <section className="rounded-lg border border-border bg-surface p-4 space-y-3">
          <h3 className="font-serif font-bold text-sm text-fg">
            4. Polymyxin & Fluoroquinolone Organ Toxicity Rails
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
            <div className="rounded border border-border bg-surface-sunken p-3 space-y-1.5">
              <span className="font-semibold block text-fg">Colistin / Polymyxin B Neuromuscular & Renal Rails</span>
              <p className="text-muted leading-relaxed">{polymyxinEval.nephrotoxicity.pathophysiology}</p>
              <p className="text-accent font-medium leading-relaxed">
                {polymyxinEval.neuromuscularBlockade.mechanism} Antidote: {polymyxinEval.neuromuscularBlockade.reversalPearl}
              </p>
            </div>

            <div className="rounded border border-border bg-surface-sunken p-3 space-y-1.5">
              <span className="font-semibold block text-fg">Fluoroquinolone Boxed Warnings & Cation Chelation</span>
              <p className="text-muted leading-relaxed">{fqEval.blackBoxWarnings.tendinopathy.mechanism}</p>
              <p className="text-warning font-medium leading-relaxed">
                {fqEval.cationChelationCollision.mechanism} Rule: {fqEval.cationChelationCollision.mandatorySpacingRule}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* Clinical Pearls Shelf */}
      <section className="rounded-lg border border-accent/30 bg-accent-soft/15 p-4 space-y-2">
        <div className="flex items-center gap-2 text-accent font-semibold text-xs">
          <Sparkles className="h-4 w-4" />
          <span>Antimicrobial Stewardship Clinical Pearls</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-[11px] text-muted leading-relaxed">
          {report.stewardshipPearls.map((pearl, i) => (
            <li key={i}>{pearl}</li>
          ))}
        </ul>
      </section>

      {/* Regulatory Footer */}
      <div className="rounded bg-surface-sunken p-3 text-[10px] text-muted leading-relaxed border border-border">
        <p className="font-semibold text-fg mb-0.5">FD&amp;C Act &sect; 520(o)(1)(E) Non-Device Clinical Decision Support:</p>
        <p>{ANTIMICROBIAL_REGULATORY_DISCLAIMER}</p>
      </div>
    </div>
  );
}

