import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckSquare, Square } from "lucide-react";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { alertsOnDesk } from "@/lib/drugs/alerts";
import {
  anionGapOf,
  bodyMetricsOf,
  calvertCarboplatinOf,
  childPughOf,
  correctedSodiumOf,
  crclOf,
  crclWeightComparisonOf,
  osmolarGapOf,
  phenytoinCorrected,
  qtcOf,
  vancoAucOf,
  type AlbuminBand,
  type AscitesGrade,
  type BilirubinBand,
  type EncephalopathyGrade,
  type InrBand,
  type Sex,
} from "@/lib/drugs/bedside";
import {
  apapOnDesk,
  evaluateKingsCollege,
  evaluateRumackMatthew,
  NAC_REGIMENS,
} from "@/lib/drugs/apap";
import { acbOnDesk, acbWanted, type AcbReport } from "@/lib/drugs/acb";
import { dialysisOnDesk, dialysisWanted, type DialysisReport } from "@/lib/drugs/dialysis";
import {
  convertSteroid,
  hpaSuppressionRisk,
  steroidReportOnDesk,
  steroidsOnDesk,
  STEROID_AGENTS,
  STEROID_BY_ID,
  type DosingTiming,
  type SteroidAgent,
  type SteroidReport,
} from "@/lib/drugs/steroids";
import {
  IRON_FORMULATIONS,
  calculateGanzoni,
  ironOnDesk,
  ironReportOnDesk,
  type IronFormulation,
  type GanzoniResult,
} from "@/lib/drugs/iron";
import {
  evaluateDigoxinLevel,
  calculateDigifab,
  digoxinOnDesk,
  digoxinReportOnDesk,
  DIGOXIN_PGP_INTERACTORS,
  type DigifabCalcResult,
  type DigoxinLevelEvaluation,
} from "@/lib/drugs/digoxin";
import {
  calculateVancoSawchukZaske,
  type VancoSawchukZaskeResult,
} from "@/lib/drugs/vancomycin";
import {
  calculatePhenobarbitalLoading,
  calculatePhenobarbitalElimination,
  phenobarbitalOnDesk,
  phenobarbitalReportOnDesk,
  type PhenobarbitalIndication,
} from "@/lib/drugs/phenobarbital";
import {
  calculateAminoglycosideWeight,
  evaluateHartfordNomogram,
  aminoglycosidesOnDesk,
  aminoglycosideReportOnDesk,
  TRADITIONAL_AG_TARGETS,
  type AminoglycosideAgentId,
  type HartfordInterval,
} from "@/lib/drugs/aminoglycosides";
import {
  classifyLithiumLevel,
  evaluateExtripLithiumCriteria,
  calculateLithiumClearance,
  lithiumReportOnDesk,
  LITHIUM_TARGET_RANGES,
  type LithiumTargetBand,
  type LithiumToxicitySeverity,
} from "@/lib/drugs/lithium";
import { LIVERTOX_CAT_TONE, livertoxOnDesk, livertoxUrl } from "@/lib/drugs/livertox";
import { fentanylPatchMme, methadoneFactor, mmeOnDesk } from "@/lib/drugs/mme";
import { hasPhenoConvert, phenoConvertOnDesk } from "@/lib/drugs/pheno-convert";
import { PhenoContrastBoard } from "./pheno-contrast";
import { QtStation } from "./qt-station";
import { qtReport } from "@/lib/drugs/qt";
import { reversalOnDesk } from "@/lib/drugs/reversal";
import { ancBand, ancWanted } from "@/lib/drugs/anc";
import { inrOnDesk } from "@/lib/drugs/inr";
import {
  doacOnDesk,
  doacReportOnDesk,
  evaluateApixabanAbc,
  calculateAndexxaDose,
  type DoacIndication,
  type ProcedureBleedRisk,
  type BleedSeverity,
} from "@/lib/drugs/doac";
import {
  valproateOnDesk,
  valproateReportOnDesk,
  evaluateValproateLevel,
  evaluateVhe,
  calculateCarnitineDosing,
  findValproateCollisions,
  CARBAPENEM_IDS,
  type ValproateCollision,
} from "@/lib/drugs/valproate";
import {
  potassiumOnDesk,
  potassiumReportOnDesk,
  evaluatePotassium,
  type EcgFinding,
  type UrineOutputStatus,
  type PotassiumSeverityTier,
  type PotassiumEvaluation,
} from "@/lib/drugs/potassium";
import {
  sglt2OnDesk,
  sglt2ReportOnDesk,
  evaluateEuDka,
  calculatePreopHold,
  evaluateSglt2RenalRails,
  findSglt2Collisions,
  SGLT2_PROFILES,
  type Sglt2Report,
} from "@/lib/drugs/sglt2";
import { wardWanted, wardsOnDesk } from "@/lib/drugs/wards";
import { safetyOnDesk, safetyWanted } from "@/lib/drugs/safety";
import {
  HR_FOOTER,
  HR_PRINCIPLES,
  harmOnDesk,
  harmWanted,
  hrResourcesFor,
  kitFor,
  responseSteps,
  stripsFor,
} from "@/lib/drugs/harm";
import { comboOnDesk, comboTone, wikiOnDesk, type LiveCombo, type WikiPage } from "@/lib/drugs/psychonaut";
import { lookupPsychonaut } from "@/lib/drugs/psychonaut-rpc";
import {
  dosingOnDesk,
  dosingWanted,
  parseDoses,
  type DoseCheck,
} from "@/lib/drugs/dosing";
import {
  cypWanted,
  FDA_DDI_TABLE,
  FDA_GRADES,
  indexFor,
  protocolsOnDesk,
  SAFETY_CHECKS,
} from "@/lib/drugs/cyp-protocol";
import { glossWithTerm, plainClockKind, plainLine } from "@/lib/drugs/plain-huddle";
import { ENZYMES, type Enzyme, type HostContext } from "@/lib/drugs/types";
import { useDesk } from "@/lib/drugs/store";
import {
  guessLastAgonist,
  ID_SCREENS,
  LAST_AGONISTS,
  methadoneMonitor,
  naloxoneCounsel,
  naltrexoneWashout,
  otpWanted,
  precipRisk,
  TAKEHOME_DOMAINS,
  TAKEHOME_RULE,
  type LastAgonist,
  type NtxProduct,
} from "@/lib/drugs/otp";
import {
  HUNTER_FLAGS,
  hunterPositive,
  hunterPreset,
  hunterWhy,
  nmsRiskOnDesk,
  serotonergicOnDesk,
  type HunterKey,
} from "@/lib/drugs/syndrome";
import { tdmHostNote, tdmOnDesk } from "@/lib/drugs/tdm";
import { ASSAY_BY_ID, sortHits, udsHeadline, udsOnDesk, type UdsKind } from "@/lib/drugs/uds";
import {
  bandOf,
  CIWA_BANDS,
  CIWA_ITEMS,
  ciwaMax,
  ciwaWanted,
  COWS_BANDS,
  COWS_ITEMS,
  cowsMax,
  cowsWanted,
  scoreOf,
  type ScaleBand,
  type ScaleItem,
} from "@/lib/drugs/withdrawal";
import {
  BEDSIDE_SCALES_FOOTER,
  COWS_CONTEXT_WATCH,
  COWS_PRECIP_WATCH,
  HUNTER_NMS_WATCH,
  SCALES_COACH,
  scaleIntro,
  scaleTitleBlurb,
  softScaleCopy,
  type PublishedScaleId,
} from "@/lib/drugs/scales-plain";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type Tab = "otp" | "hr" | "wards" | "dose" | "cyp" | "qt" | "levels" | "liver" | "pheno" | "reversal" | "mme" | "hunter" | "uds" | "bedside" | "alerts" | "anc" | "inr" | "acb" | "dialysis" | "steroids" | "apap" | "iron" | "digoxin" | "phenobarbital" | "aminoglycosides" | "lithium" | "doac" | "valproate" | "potassium" | "sglt2";

export function ClinicalBoard({ ids, host }: { ids: string[]; host: HostContext }) {
  const qt = useMemo(() => qtReport(ids, host), [ids.join("|"), host.age, host.kidney]);
  const levels = useMemo(() => tdmOnDesk(ids), [ids.join("|")]);
  const liver = useMemo(() => livertoxOnDesk(ids), [ids.join("|")]);
  const pheno = useMemo(() => phenoConvertOnDesk(ids, host), [ids.join("|"), host]);
  const reversal = useMemo(() => reversalOnDesk(ids), [ids.join("|")]);
  const mme = useMemo(() => mmeOnDesk(ids), [ids.join("|")]);
  const hunterOn = useMemo(() => serotonergicOnDesk(ids).length + nmsRiskOnDesk(ids).length > 0, [ids.join("|")]);
  const uds = useMemo(() => udsOnDesk(ids), [ids.join("|")]);
  const alerts = useMemo(() => alertsOnDesk(ids), [ids.join("|")]);
  const otp = otpWanted(ids);
  const hrOn = harmWanted(ids);
  const cypOn = cypWanted(ids);
  const ancOn = ancWanted(ids);
  const wardsOn = wardWanted(ids) || safetyWanted(ids);
  const doseOn = dosingWanted(ids);
  const inr = useMemo(() => inrOnDesk(ids), [ids.join("|")]);
  const doacOn = useMemo(() => doacOnDesk(ids), [ids.join("|")]);
  const valproateOn = useMemo(() => valproateOnDesk(ids), [ids.join("|")]);
  const potassiumOn = useMemo(() => potassiumOnDesk(ids), [ids.join("|")]);
  const sglt2On = useMemo(() => sglt2OnDesk(ids), [ids.join("|")]);
  const acb = useMemo(() => acbOnDesk(ids), [ids.join("|")]);
  const dialysis = useMemo(() => dialysisOnDesk(ids), [ids.join("|")]);
  const steroids = useMemo(() => steroidReportOnDesk(ids), [ids.join("|")]);
  const apapOn = useMemo(() => apapOnDesk(ids), [ids.join("|")]);
  const ironOn = useMemo(() => ironOnDesk(ids).hasIron, [ids.join("|")]);
  const digOn = useMemo(() => digoxinOnDesk(ids).hasDigoxin, [ids.join("|")]);
  const phenoBarbiturateOn = useMemo(() => phenobarbitalOnDesk(ids), [ids.join("|")]);
  const agOn = useMemo(() => aminoglycosidesOnDesk(ids), [ids.join("|")]);
  const lithiumOn = useMemo(() => lithiumReportOnDesk(ids).hasLithium, [ids.join("|")]);
  const tabs = useMemo(() => {
    const t: { id: Tab; label: string; on: boolean }[] = [
      { id: "otp", label: "OTP", on: otp },
      { id: "hr", label: "HR", on: hrOn },
      { id: "wards", label: "Wards", on: wardsOn },
      { id: "dose", label: "Dose", on: doseOn },
      { id: "cyp", label: "CYP", on: cypOn },
      { id: "qt", label: "QT", on: Boolean(qt) },
      { id: "levels", label: "Levels", on: levels.length > 0 },
      { id: "liver", label: "LiverTox", on: liver.length > 0 },
      { id: "pheno", label: "Pheno", on: hasPhenoConvert(ids, host) || pheno.some((r) => r.shifted) },
      { id: "reversal", label: "Reversal", on: reversal.length > 0 },
      { id: "mme", label: "MME", on: mme.length > 0 },
      { id: "hunter", label: "Hunter", on: hunterOn },
      { id: "uds", label: "UDS", on: uds.length > 0 },
      { id: "anc", label: "ANC", on: ancOn },
      { id: "inr", label: "INR", on: Boolean(inr) },
      { id: "doac", label: "DOAC", on: doacOn.hasAnticoagulant || doacOn.hasReversal },
      { id: "valproate", label: "Valproate", on: valproateOn.hasValproate },
      { id: "potassium", label: "Potassium", on: potassiumOn.hasPerpetrator || potassiumOn.hasBinder || potassiumOn.hasSupplement || potassiumOn.hasShiftAgent },
      { id: "sglt2", label: "SGLT2", on: sglt2On.hasSglt2 },
      { id: "acb", label: "ACB", on: Boolean(acb) },
      { id: "dialysis", label: "Dialysis", on: Boolean(dialysis) },
      { id: "steroids", label: "Steroids", on: Boolean(steroids.hasSteroid) },
      { id: "apap", label: "APAP", on: apapOn },
      { id: "iron", label: "Iron", on: ironOn },
      { id: "digoxin", label: "Digoxin", on: digOn },
      { id: "phenobarbital", label: "Phenobarb", on: phenoBarbiturateOn },
      { id: "aminoglycosides", label: "Aminoglycosides", on: agOn },
      { id: "lithium", label: "Lithium", on: lithiumOn },
      { id: "bedside", label: "Bedside", on: true },
      { id: "alerts", label: "Alerts", on: alerts.length > 0 },
    ];
    return t;
  }, [qt, levels.length, liver.length, pheno, reversal.length, mme.length, hunterOn, uds.length, alerts.length, ids, host, otp, hrOn, cypOn, ancOn, inr, doacOn.hasAnticoagulant, doacOn.hasReversal, valproateOn.hasValproate, potassiumOn.hasPerpetrator, potassiumOn.hasBinder, potassiumOn.hasSupplement, potassiumOn.hasShiftAgent, sglt2On.hasSglt2, acb, dialysis, steroids.hasSteroid, apapOn, ironOn, digOn, phenoBarbiturateOn, agOn, lithiumOn, wardsOn, doseOn]);
  const [tab, setTab] = useState<Tab>("otp");
  const live = tabs.some((t) => t.id === tab && t.on) ? tab : (tabs.find((t) => t.on)?.id ?? "bedside");

  if (!tabs.some((t) => t.on && t.id !== "bedside") && ids.length === 0) return null;

  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg tracking-tight text-fg">Clinical board</h2>
          <p className="mt-1 text-xs text-muted">
            QT, TDM, LiverTox, phenoconversion, CYP start/stop clocks, reversal, MME, Hunter, UDS,
            OTP tools, harm reduction, live PsychonautWiki, Wards collisions, labeled dose rails, ANC, INR, ACB anticholinergic burden, hemodialysis drug clearance, corticosteroids & HPA suppression, APAP overdose & Rumack-Matthew nomogram, parenteral iron & Ganzoni kinetics, digoxin toxicity & DigiFab sizing, phenobarbital kinetics & ion trapping, aminoglycosides & Hartford nomogram, lithium kinetics & EXTRIP hemodialysis, COWS / CIWA, bedside math (QTc, CrCl, Child-Pugh, Vancomycin AUC & Sawchuk-Zaske, Osmolar Gap, Anion Gap, Corrected Sodium, BSA, Calvert, Ganzoni, Digoxin, Hartford, Lithium). Teaching — not a
            protocol, not a QTc. The PI governs the milligram.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={live === t.id}
              disabled={!t.on}
              onClick={() => setTab(t.id)}
              className={cn(
                "h-10 rounded-full px-3 text-xs font-medium",
                live === t.id ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
                !t.on && "opacity-40",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {live === "otp" && otp ? <OtpPanel ids={ids} qtPartner={Boolean(qt?.rows.some((r) => r.id !== "methadone"))} /> : null}
        {live === "hr" && hrOn ? <HarmPanel ids={ids} /> : null}
        {live === "wards" && wardsOn ? <WardsPanel ids={ids} /> : null}
        {live === "dose" && doseOn ? <DosePanel ids={ids} host={host} /> : null}
        {live === "cyp" && cypOn ? <CypPanel ids={ids} /> : null}
        {live === "qt" && qt ? <QtPanel ids={ids} host={host} report={qt} /> : null}
        {live === "levels" && levels.length ? <LevelsPanel rows={levels} host={host} /> : null}
        {live === "liver" && liver.length ? <LiverPanel rows={liver} /> : null}
        {live === "pheno" ? <PhenoContrastBoard ids={ids} host={host} /> : null}
        {live === "reversal" && reversal.length ? <ReversalPanel rows={reversal} /> : null}
        {live === "mme" && mme.length ? <MmePanel rows={mme} /> : null}
        {live === "hunter" ? <HunterPanel ids={ids} /> : null}
        {live === "uds" && uds.length ? <UdsPanel ids={ids} /> : null}
        {live === "anc" && ancOn ? <AncPanel /> : null}
        {live === "inr" && inr ? <InrPanel report={inr} /> : null}
        {live === "doac" && (doacOn.hasAnticoagulant || doacOn.hasReversal) ? <DoacPanel ids={ids} host={host} /> : null}
        {live === "valproate" && valproateOn.hasValproate ? <ValproatePanel ids={ids} host={host} /> : null}
        {live === "potassium" ? <PotassiumPanel ids={ids} host={host} /> : null}
        {live === "sglt2" && sglt2On.hasSglt2 ? <Sglt2Panel ids={ids} host={host} /> : null}
        {live === "acb" && acb ? <AcbPanel report={acb} /> : null}
        {live === "dialysis" && dialysis ? <DialysisPanel report={dialysis} /> : null}
        {live === "steroids" && steroids.hasSteroid ? <SteroidsPanel report={steroids} /> : null}
        {live === "apap" && apapOn ? <ApapPanel ids={ids} /> : null}
        {live === "iron" && ironOn ? <IronPanel ids={ids} /> : null}
        {live === "digoxin" && digOn ? <DigoxinPanel ids={ids} /> : null}
        {live === "phenobarbital" && phenoBarbiturateOn ? <PhenobarbitalPanel ids={ids} /> : null}
        {live === "aminoglycosides" && agOn ? <AminoglycosidesPanel ids={ids} /> : null}
        {live === "lithium" && lithiumOn ? <LithiumPanel ids={ids} host={host} /> : null}
        {live === "bedside" ? <BedsidePanel ids={ids} host={host} steroids={steroids} /> : null}
        {live === "alerts" && alerts.length ? <AlertsPanel rows={alerts} /> : null}
      </div>
    </section>
  );
}

function CypPanel({ ids }: { ids: string[] }) {
  const cards = useMemo(() => protocolsOnDesk(ids), [ids.join("|")]);
  const add = useDesk((s) => s.add);
  const selected = useDesk((s) => s.selected);
  const [phase, setPhase] = useState<"start" | "stop">("start");
  const [enzyme, setEnzyme] = useState<Enzyme>("CYP3A4");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const index = useMemo(() => indexFor(enzyme), [enzyme]);
  useEffect(() => {
    const next = protocolsOnDesk(ids)[0]?.enzymes[0];
    if (next) setEnzyme(next);
  }, [ids]);

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-muted">
        FDA DDI grades, start vs stop clocks. TDI linger means {glossWithTerm("tdi")}; induction lag
        means {glossWithTerm("induction")}. Huang 2007 / FDA 2020 teaching — not a milligram and not a
        hold. A study aid for how timing changes the picture, not a real-time alert. The Prescribing
        Information is the authority.
      </p>

      <div className="flex flex-wrap gap-1">
        {(["start", "stop"] as const).map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={phase === p}
            onClick={() => setPhase(p)}
            className={cn(
              "h-10 rounded-full px-3 text-xs font-medium",
              phase === p ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
            )}
          >
            {p === "start" ? "Start clock" : "Stop clock"}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {(
          [
            ["inhibitor", "strong"],
            ["inhibitor", "moderate"],
            ["inducer", "strong"],
          ] as const
        ).map(([kind, strength]) => {
          const g = FDA_GRADES[kind][strength];
          return (
            <div key={`${kind}-${strength}`} className="rounded-md bg-bg-sunken px-3 py-2.5">
              <p className="text-xs font-medium text-fg">{g.label}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">{g.fold}</p>
            </div>
          );
        })}
      </div>

      {cards.length ? (
        cards.map((card) => {
          const clock = phase === "start" ? card.start : card.stop;
          return (
            <article key={card.perpId} className={cn("rounded-md px-3 py-3", toneClass(card.tone))}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-serif text-lg tracking-tight text-fg">{card.name}</h3>
                <Badge tone={card.tone === "danger" ? "danger" : card.tone === "warn" ? "warn" : "info"}>
                  {card.grade}
                </Badge>
                <Badge tone="default" title={plainClockKind(card.clock).title}>
                  {plainClockKind(card.clock).label}
                </Badge>
                {card.dualHit ? <Badge tone="warn">3A4 + P-gp</Badge> : null}
              </div>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-muted">
                {card.enzymes.join(" · ")} · {card.fold}
              </p>
              <p className="mt-2 text-sm font-medium text-fg">
                {clock.title}
                <span className="ml-2 font-mono text-[11px] font-normal text-muted"> · {clock.days}</span>
              </p>
              <p className="mt-1 text-sm leading-relaxed text-fg">{plainLine(clock.body)}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{plainLine(clock.watch)}</p>
              {card.linger && phase === "stop" ? (
                <p className="mt-2 text-sm leading-relaxed text-fg">{plainLine(card.linger)}</p>
              ) : null}
              {card.victims.length ? (
                <ul className="mt-3 flex flex-wrap gap-1">
                  {card.victims.slice(0, 8).map((v) => (
                    <li key={`${v.id}-${v.enzyme}`}>
                      <Badge tone={v.nti ? "danger" : v.sensitivity === "sensitive" ? "warn" : "default"}>
                        {v.name}
                        {v.nti ? " NTI" : ""}
                        {v.pathway === "activation" ? " prodrug" : ""}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-muted">
                  No mapped victim on the desk. Add a sensitive substrate from the index table below.
                </p>
              )}
            </article>
          );
        })
      ) : (
        <p className="text-sm leading-relaxed text-muted">
          Add a strong or moderate perpetrator — clarithromycin, paroxetine, fluvoxamine, rifampin,
          ketoconazole — then a victim. The start/stop clock is the teaching point, not a second
          clearance row. An empty clock is not clearance.
        </p>
      )}

      {cards[0] ? (
        <article className="rounded-md bg-bg-sunken px-3 py-3">
          <h3 className="font-serif text-lg tracking-tight text-fg">Study steps</h3>
          <p className="mt-1 text-xs text-muted">Teaching checklist for the biggest blocker or booster on this desk. A study aid, not a real-time alert. Nothing is stored.</p>
          <ul className="mt-3 space-y-1">
            {cards[0].steps.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  aria-pressed={Boolean(checks[s.id])}
                  onClick={() => setChecks((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
                  className={cn(
                    "flex h-auto min-h-10 w-full items-start gap-2 rounded-md px-3 py-2 text-left",
                    checks[s.id] ? "bg-accent-soft text-fg" : "bg-surface text-muted hover:text-fg",
                  )}
                >
                  <span className="mt-0.5">
                    {checks[s.id] ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-fg">{s.title}</span>
                    <span className="block text-xs leading-relaxed text-muted">{s.body}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </article>
      ) : (
        <article className="rounded-md bg-bg-sunken px-3 py-3">
          <h3 className="font-serif text-lg tracking-tight text-fg">Study steps</h3>
          <ul className="mt-3 space-y-2">
            {SAFETY_CHECKS.map((s) => (
              <li key={s.id}>
                <p className="text-sm font-medium text-fg">{s.title}</p>
                <p className="text-xs leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </ul>
        </article>
      )}

      <article className="rounded-md bg-bg-sunken px-3 py-3">
        <h3 className="font-serif text-lg tracking-tight text-fg">FDA index table</h3>
        <p className="mt-1 text-xs text-muted">
          Example substrates, inhibitors, and inducers on this desk. Tap to add.{" "}
          <a className="text-accent underline" href={FDA_DDI_TABLE} target="_blank" rel="noreferrer">
            Open the FDA table
          </a>
          .
        </p>
        <div className="mt-3 flex flex-wrap gap-1">
          {ENZYMES.map((e) => (
            <button
              key={e}
              type="button"
              aria-pressed={enzyme === e}
              onClick={() => setEnzyme(e)}
              className={cn(
                "h-10 rounded-full px-3 font-mono text-xs font-medium",
                enzyme === e ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
              )}
            >
              {e.replace("CYP", "")}
            </button>
          ))}
        </div>
        {(
          [
            ["Substrates", index.substrates],
            ["Inhibitors", index.inhibitors],
            ["Inducers", index.inducers],
          ] as const
        ).map(([label, rows]) =>
          rows.length ? (
            <div key={label} className="mt-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {rows.map((r) => {
                  const on = selected.includes(r.id);
                  return (
                    <button
                      key={`${r.role}-${r.id}-${r.grade}`}
                      type="button"
                      aria-pressed={on}
                      disabled={on}
                      onClick={() => add(r.id)}
                      className={cn(
                        "h-10 rounded-full px-3 text-xs",
                        on ? "bg-ink/20 text-muted" : "bg-surface text-fg hover:text-accent",
                      )}
                    >
                      {r.name}
                      <span className="ml-1 text-[10px] text-muted">{r.grade}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null,
        )}
      </article>

      <p className="text-[11px] leading-relaxed text-subtle">
        Not FDA-cleared. Independently review the{" "}
        <a className="text-accent underline" href={FDA_DDI_TABLE} target="_blank" rel="noreferrer">
          FDA index table
        </a>{" "}
        and each victim’s Prescribing Information. FirstPass does not pick a milligram, a hold, or a
        restart.
      </p>
    </div>
  );
}

function QtPanel({
  ids,
  host,
  report,
}: {
  ids: string[];
  host: HostContext;
  report?: NonNullable<ReturnType<typeof qtReport>>;
}) {
  return <QtStation ids={ids} host={host} />;
}

function LevelsPanel({
  rows,
  host,
}: {
  rows: ReturnType<typeof tdmOnDesk>;
  host: HostContext;
}) {
  return (
    <div className="space-y-4">
      {rows.map(({ id, card }) => {
        const drug = DRUG_BY_ID[id];
        const hostNote = tdmHostNote(id, host);
        return (
          <article key={id} className="rounded-md bg-bg-sunken px-3 py-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <h3 className="font-serif text-lg tracking-tight text-fg">{drug?.name ?? id}</h3>
              <span className="font-mono text-[11px] uppercase tracking-wide text-muted">{card.analyte}</span>
            </div>
            <dl className="mt-2 grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wide text-muted">Window</dt>
                <dd className="text-sm text-fg">
                  {card.trough}
                  {card.unit ? ` ${card.unit}` : ""}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wide text-muted">Toxic</dt>
                <dd className="text-sm text-fg">{card.toxic}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-mono text-[10px] uppercase tracking-wide text-muted">Draw</dt>
                <dd className="text-sm text-fg">{card.draw}</dd>
              </div>
            </dl>
            <p className="mt-2 text-sm leading-relaxed text-fg">{card.pearl}</p>
            {hostNote ? (
              <p className="mt-2 text-sm leading-relaxed text-accent">
                <span className="font-mono text-[10px] uppercase tracking-wide">this host · </span>
                {hostNote}
              </p>
            ) : null}
          </article>
        );
      })}
      <p className="text-[11px] leading-relaxed text-subtle">
        Windows are teaching ranges from labeled / consensus TDM. Lab methods differ. Not a draw-time
        order and not a dose.
      </p>
    </div>
  );
}

function LiverPanel({ rows }: { rows: ReturnType<typeof livertoxOnDesk> }) {
  return (
    <div className="space-y-3">
      {rows.map(({ id, card }) => {
        const drug = DRUG_BY_ID[id];
        const name = drug?.name ?? id;
        return (
          <article key={id} className="rounded-md bg-bg-sunken px-3 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-medium text-fg">{name}</h3>
              <Badge tone={LIVERTOX_CAT_TONE[card.cat]}>
                {card.cat} · {card.label}
              </Badge>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-fg">{card.pearl}</p>
            <a
              href={livertoxUrl(id, name)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex h-10 items-center text-sm text-accent underline underline-offset-2"
            >
              Open LiverTox
            </a>
          </article>
        );
      })}
      <p className="text-[11px] leading-relaxed text-subtle">
        Categories paraphrase NIDDK LiverTox (A = well-known cause). Open the chapter for the case
        series. Not a fibrosis score.
      </p>
    </div>
  );
}

function ReversalPanel({ rows }: { rows: ReturnType<typeof reversalOnDesk> }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent-soft p-3 text-xs text-ink">
        <span>Need naloxone (Narcan) or addiction support? Locate free mail-order naloxone, overdose peer monitoring, and local treatment.</span>
        <button
          type="button"
          aria-pressed={false}
          onClick={() => {
            useDesk.getState().setView("help");
            window.scrollTo({ top: 0 });
          }}
          className="font-medium text-accent underline underline-offset-2 hover:opacity-80"
        >
          Find naloxone &amp; help near you &rarr;
        </button>
      </div>
      {rows.map((row) => (
        <article key={`${row.id}-${row.card.agent}`} className="rounded-md bg-bg-sunken px-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium text-fg">{row.name}</h3>
            <Badge tone={row.card.kind === "will-not" ? "danger" : row.card.kind === "antidote" ? "ok" : "warn"}>
              {row.card.kind === "will-not" ? "will not reverse" : row.card.kind}
            </Badge>
          </div>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-muted">{row.card.for}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-fg">
            <span className="font-medium">{row.card.agent}. </span>
            {row.card.pearl}
          </p>
          {row.card.caution ? <p className="mt-1.5 text-sm leading-relaxed text-danger">{row.card.caution}</p> : null}
        </article>
      ))}
      <p className="text-[11px] leading-relaxed text-subtle">
        Teaching reversal map. Not a tox protocol, not a dose, and not permission to skip airway.
      </p>
    </div>
  );
}

function MmePanel({ rows }: { rows: ReturnType<typeof mmeOnDesk> }) {
  const [doses, setDoses] = useState<Record<string, string>>({});
  let total = 0;
  let countable = 0;
  const parts: string[] = [];
  for (const row of rows) {
    const raw = Number(doses[row.id]);
    if (!Number.isFinite(raw) || raw <= 0) continue;
    let factor = row.factor;
    if (row.id === "methadone") factor = methadoneFactor(raw);
    if (row.id === "fentanyl") {
      const mme = fentanylPatchMme(raw);
      if (mme == null) continue;
      total += mme;
      countable += 1;
      parts.push(`${raw} mcg/hr patch ≈ ${Math.round(mme)} MME`);
      continue;
    }
    if (factor == null) continue;
    const mme = raw * factor;
    total += mme;
    countable += 1;
    parts.push(`${raw} × ${factor} = ${Math.round(mme * 10) / 10}`);
  }
  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {rows.map((row) => {
          const name = DRUG_BY_ID[row.id]?.name ?? row.id;
          return (
            <li key={row.id} className="rounded-md bg-bg-sunken px-3 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h3 className="text-sm font-medium text-fg">{name}</h3>
                  <p className="font-mono text-[11px] text-muted">
                    {row.factor == null ? "not converted" : `× ${row.factor}`} · {row.unit}
                  </p>
                </div>
                {row.factor != null || row.id === "methadone" || row.id === "fentanyl" ? (
                  <label className="flex items-center gap-2">
                    <span className="sr-only">Daily amount for {name}</span>
                    <Input
                      inputMode="decimal"
                      className="h-10 w-24"
                      placeholder={row.id === "fentanyl" ? "mcg/hr" : "mg/d"}
                      value={doses[row.id] ?? ""}
                      onChange={(e) => setDoses((d) => ({ ...d, [row.id]: e.target.value }))}
                    />
                  </label>
                ) : null}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-fg">{row.hint}</p>
              {row.note ? <p className="mt-1 text-sm leading-relaxed text-muted">{row.note}</p> : null}
            </li>
          );
        })}
      </ul>
      {countable ? (
        <p className="text-sm text-fg">
          Teaching sum ≈ <span className="font-mono">{Math.round(total)}</span> oral morphine milligram-equivalents
          {parts.length ? ` (${parts.join("; ")})` : ""}. CDC 2022 factors. Not a conversion order.
        </p>
      ) : (
        <p className="text-sm text-muted">Enter a daily oral milligram (patch mcg/hr for fentanyl) to sketch MME. Street mass stays blank on purpose.</p>
      )}
      <p className="text-[11px] leading-relaxed text-subtle">
        Incomplete for methadone OTP, buprenorphine MOUD, and anything stamped. 50 / 90 MME cuts are
        policy history — this desk does not apply them as a dose.
      </p>
    </div>
  );
}

function HunterPanel({ ids }: { ids: string[] }) {
  const sero = serotonergicOnDesk(ids);
  const nms = nmsRiskOnDesk(ids);
  const [on, setOn] = useState<Record<HunterKey, boolean>>(() => {
    const preset = hunterPreset(ids);
    const base = Object.fromEntries(HUNTER_FLAGS.map((f) => [f.key, false])) as Record<HunterKey, boolean>;
    return { ...base, ...preset };
  });
  useEffect(() => {
    const sero = serotonergicOnDesk(ids).length > 0;
    setOn((prev) => (prev.serotonergic === sero ? prev : { ...prev, serotonergic: sero }));
  }, [ids.join("|")]);
  const positive = hunterPositive(on);
  function toggle(key: HunterKey) {
    setOn((prev) => ({ ...prev, [key]: !prev[key] }));
  }
  const intro = scaleIntro("hunter");
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-accent/15 bg-accent-soft/30 p-3 sm:p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">{SCALES_COACH.kicker}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-fg">{intro.measures}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">{intro.published}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">{SCALES_COACH.empty}</p>
      </div>
      <div>
        <h3 className="font-serif text-lg tracking-tight text-fg">{intro.plainTitle}</h3>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">{intro.scientific}</p>
      </div>
      {sero.length ? (
        <p className="text-sm leading-relaxed text-fg">
          Serotonergic on this desk: {sero.map((s) => `${s.name} (${s.why})`).join("; ")}.
        </p>
      ) : (
        <p className="text-sm leading-relaxed text-muted">
          No serotonergic mapped. Tick the first box if one is in the history (fluoxetine lingers weeks).
        </p>
      )}
      <ul className="grid gap-1 sm:grid-cols-2">
        {HUNTER_FLAGS.map((f) => (
          <li key={f.key}>
            <button
              type="button"
              aria-pressed={Boolean(on[f.key])}
              onClick={() => toggle(f.key)}
              className={cn(
                "flex h-auto min-h-10 w-full items-start gap-2 rounded-md px-3 py-2 text-left",
                on[f.key] ? "bg-accent-soft text-fg" : "bg-bg-sunken text-muted hover:text-fg",
              )}
            >
              <span className="mt-0.5 text-fg">
                {on[f.key] ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
              </span>
              <span>
                <span className="block text-sm font-medium text-fg">{f.label}</span>
                <span className="block text-xs text-muted">{f.hint}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className={cn("text-sm leading-relaxed", positive ? "text-danger" : "text-fg")}>{hunterWhy(on)}</p>
      {nms.length ? (
        <div className="rounded-md bg-warn-soft px-3 py-3">
          <p className="font-mono text-[10px] uppercase tracking-wide text-warn">NMS contrast</p>
          <p className="mt-1 text-sm leading-relaxed text-fg">
            Dopamine blocker on this desk ({nms.map((n) => n.name).join(", ")}). {HUNTER_NMS_WATCH}
          </p>
        </div>
      ) : null}
      <p className="text-[11px] leading-relaxed text-subtle">
        Cyproheptadine is adjunct on the Reversal tab. Not a charted diagnosis — PI / clinician govern.
      </p>
    </div>
  );
}

function UdsPanel({ ids }: { ids: string[] }) {
  const cards = udsOnDesk(ids);
  const headline = udsHeadline(ids);
  const toneFor = (kind: UdsKind): "ok" | "warn" | "danger" =>
    kind === "expected" ? "ok" : kind === "miss" ? "warn" : "danger";
  const labelFor = (kind: UdsKind) =>
    kind === "expected" ? "lights" : kind === "miss" ? "misses" : "false +";
  return (
    <div className="space-y-4">
      {headline ? <p className="text-sm leading-relaxed text-fg">{headline}</p> : null}
      {cards.map((card) => {
        const drug = DRUG_BY_ID[card.id];
        return (
          <article key={card.id} className="rounded-md bg-bg-sunken px-3 py-3">
            <h3 className="font-serif text-lg tracking-tight text-fg">{drug?.name ?? card.id}</h3>
            <p className="mt-1 text-sm leading-relaxed text-fg">{card.pearl}</p>
            {card.hits.length ? (
              <ul className="mt-3 space-y-2">
                {sortHits(card.hits).map((h) => {
                  const assay = ASSAY_BY_ID[h.assay];
                  return (
                    <li key={`${card.id}-${h.assay}-${h.kind}`} className="rounded-md bg-surface px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-fg">{assay.label}</span>
                        <Badge tone={toneFor(h.kind)}>{labelFor(h.kind)}</Badge>
                        <span className="font-mono text-[10px] uppercase tracking-wide text-muted">{assay.target}</span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{h.note}</p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">No cheap drugs-of-abuse cup is built for this one.</p>
            )}
          </article>
        );
      })}
      <p className="text-[11px] leading-relaxed text-subtle">
        Presumptive immunoassay, not LC-MS/MS. Kit antibodies differ. Saitman 2014 is on the Cites shelf.
        A cup is not a diagnosis and not a take-home decision.
      </p>
    </div>
  );
}

function BedsidePanel({ ids, host, steroids }: { ids: string[]; host: HostContext; steroids?: SteroidReport }) {
  const [qt, setQt] = useState("400");
  const [hr, setHr] = useState("60");
  const [age, setAge] = useState(host.age === "geriatric" ? "78" : "42");
  const [wt, setWt] = useState("70");
  const [scr, setScr] = useState("1.0");
  const [sex, setSex] = useState<Sex>("male");
  const qtc = qtcOf({ qtMs: Number(qt), hr: Number(hr) });
  const crcl = crclOf({ age: Number(age), weightKg: Number(wt), scr: Number(scr), sex });
  const showCows = cowsWanted(ids) || ids.length === 0;
  const showCiwa = ciwaWanted(ids, host.alcohol) || ids.includes("ethanol");
  const precip = ids.includes("buprenorphine") && ids.some((id) =>
    ["fentanyl", "dirty-30", "heroin", "methadone", "oxycodone", "hydrocodone"].includes(id),
  );
  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
      <article>
        <h3 className="font-serif text-lg tracking-tight text-fg">QTc</h3>
        <p className="mt-1 text-xs text-muted">QT ms and heart rate. Bazett and Fridericia both print.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs text-muted">
            QT (ms)
            <Input className="mt-1" inputMode="decimal" value={qt} onChange={(e) => setQt(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            HR
            <Input className="mt-1" inputMode="decimal" value={hr} onChange={(e) => setHr(e.target.value)} />
          </label>
        </div>
        {qtc ? (
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Bazett</dt>
              <dd className="font-mono text-fg">{qtc.bazett} ms</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Fridericia</dt>
              <dd className="font-mono text-fg">{qtc.fridericia} ms</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">RR</dt>
              <dd className="font-mono text-fg">{qtc.rr} s</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted">Need QT 200–800 ms and HR 30–220.</p>
        )}
        {qtc ? <p className="mt-2 text-sm leading-relaxed text-fg">{qtc.note}</p> : null}
      </article>
      <article>
        <h3 className="font-serif text-lg tracking-tight text-fg">CrCl</h3>
        <p className="mt-1 text-xs text-muted">Cockcroft–Gault. Flip CKD on the host to score the clinic cards.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs text-muted">
            Age
            <Input className="mt-1" inputMode="decimal" value={age} onChange={(e) => setAge(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            Weight (kg)
            <Input className="mt-1" inputMode="decimal" value={wt} onChange={(e) => setWt(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            SCr (mg/dL)
            <Input className="mt-1" inputMode="decimal" value={scr} onChange={(e) => setScr(e.target.value)} />
          </label>
          <div className="text-xs text-muted">
            Sex
            <div className="mt-1 flex gap-1">
              {(["male", "female"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={sex === s}
                  onClick={() => setSex(s)}
                  className={cn(
                    "h-10 flex-1 rounded-full text-xs font-medium",
                    sex === s ? "bg-ink text-bg" : "bg-bg-sunken text-muted",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
        {crcl ? (
          <p className="mt-3 text-sm text-fg">
            CrCl ≈ <span className="font-mono">{crcl.crcl}</span> mL/min
            {crcl.band !== "usual" ? (
              <Badge className="ml-2" tone={crcl.band === "severe" ? "danger" : "warn"}>
                {crcl.band}
              </Badge>
            ) : null}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted">Age 18–110, weight 30–250 kg, SCr {'>'} 0.</p>
        )}
        {crcl ? <p className="mt-2 text-sm leading-relaxed text-fg">{crcl.note}</p> : null}
        {host.kidney === "ckd" ? (
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-accent">CKD is already on this host</p>
        ) : null}
      </article>
      </div>

      {ids.includes("phenytoin") ? <PhenytoinBlock /> : null}

      <BodyMetricsBlock age={Number(age)} sex={sex} scr={Number(scr)} defaultWeight={Number(wt)} />

      <CalvertBlock defaultGfr={crcl?.crcl} isHot={ids.some((id) => ["carboplatin", "cisplatin"].includes(id))} />

      <AnionGapBlock isHot={ids.some((id) => ["metformin", "aspirin", "acetaminophen", "ethanol"].includes(id))} />

      <CorrectedSodiumBlock isHot={ids.some((id) => ["insulin-glargine", "metformin", "glipizide"].includes(id))} />

      <SteroidEquivBlock isHot={Boolean(steroids?.hasSteroid)} defaultDrugId={steroids?.present[0]?.id} />

      <GanzoniBlock isHot={ironOnDesk(ids).hasIron} defaultWeight={Number(wt)} defaultSex={sex} />

      <DigoxinBlock isHot={digoxinOnDesk(ids).hasDigoxin} defaultWeight={Number(wt)} />

      <ChildPughBlock />

      <VancoAucBlock defaultCrcl={crcl?.crcl} isHot={ids.includes("vancomycin")} />

      <PhenobarbitalBlock isHot={phenobarbitalOnDesk(ids)} defaultWeight={Number(wt)} />

      <AminoglycosideBlock isHot={aminoglycosidesOnDesk(ids)} defaultWeight={Number(wt)} defaultSex={sex} />

      <LithiumBlock isHot={lithiumReportOnDesk(ids).hasLithium} defaultWeight={Number(wt)} defaultCrcl={crcl?.crcl} />

      <OsmolarGapBlock isHot={ids.includes("ethanol")} />

      <div className="rounded-xl border border-accent/15 bg-accent-soft/30 p-3 sm:p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">{SCALES_COACH.kicker}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-fg">{SCALES_COACH.body}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">{SCALES_COACH.empty}</p>
      </div>

      <ScaleBlock
        scaleId="cows"
        detail={`Eleven items, max ${cowsMax()}.`}
        items={COWS_ITEMS}
        bands={COWS_BANDS}
        hot={showCows}
        extra={
          precip ? (
            <p className="rounded-md bg-danger-soft px-3 py-2 text-sm leading-relaxed text-fg">
              {COWS_PRECIP_WATCH}
            </p>
          ) : showCows ? (
            <p className="text-sm leading-relaxed text-muted">{COWS_CONTEXT_WATCH}</p>
          ) : null
        }
      />

      <ScaleBlock
        scaleId="ciwa"
        detail={`Ten items, max ${ciwaMax()}. Symptom-triggered maps often consider action around 8–10.`}
        items={CIWA_ITEMS}
        bands={CIWA_BANDS}
        hot={showCiwa}
      />

      <p className="text-[11px] leading-relaxed text-subtle">{BEDSIDE_SCALES_FOOTER}</p>
    </div>
  );
}

function ScaleBlock({
  scaleId,
  detail,
  items,
  bands,
  hot,
  extra,
}: {
  scaleId: PublishedScaleId;
  detail: string;
  items: ScaleItem[];
  bands: ScaleBand[];
  hot?: boolean;
  extra?: ReactNode;
}) {
  const intro = scaleIntro(scaleId);
  const blurb = scaleTitleBlurb(scaleId, detail);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const total = scoreOf(items, picked);
  const band = bandOf(bands, total);
  return (
    <article className={cn("rounded-md px-3 py-3", hot ? "bg-accent-soft" : "bg-bg-sunken")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-serif text-lg tracking-tight text-fg">{intro.plainTitle}</h3>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">{intro.scientific}</p>
          <p className="mt-1 text-xs text-muted">{blurb}</p>
          <p className="mt-1 text-xs leading-relaxed text-subtle">{intro.measures}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-lg text-fg">{total}</p>
          <p className="font-mono text-[10px] uppercase tracking-wide text-muted">{band.label}</p>
        </div>
      </div>
      {extra ? <div className="mt-3">{extra}</div> : null}
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={item.id}>
            <p className="text-sm font-medium text-fg">{item.label}</p>
            <p className="text-[11px] text-muted">{item.hint}</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {item.options.map((opt) => {
                const on = picked[item.id] === opt.score;
                return (
                  <button
                    key={`${item.id}-${opt.score}-${opt.label}`}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPicked((prev) => ({ ...prev, [item.id]: opt.score }))}
                    className={cn(
                      "h-10 min-w-10 rounded-full px-3 text-xs font-medium",
                      on ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
                    )}
                  >
                    <span className="font-mono">{opt.score}</span>
                    <span className="ml-1">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm leading-relaxed text-fg">{softScaleCopy(band.note)}</p>
      {scaleId === "cows" && total >= 5 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-accent/20 bg-accent-soft/30 px-3 py-2 text-xs">
          <span className="text-fg">
            Elevated withdrawal score ({total} pts · {band.label}). Locate 24/7 medical detox beds, buprenorphine/methadone clinic access, and free mail-order naloxone in your state.
          </span>
          <button
            type="button"
            aria-pressed={false}
            onClick={() => useDesk.getState().setView("help")}
            className="font-mono text-[11px] uppercase tracking-wider text-accent underline underline-offset-2 hover:text-fg"
          >
            Find Addiction Care & Detox
          </button>
        </div>
      ) : null}
      {scaleId === "ciwa" && total >= 8 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-warn/25 bg-warn-soft/30 px-3 py-2 text-xs">
          <span className="text-fg">
            Moderate/severe alcohol withdrawal score ({total} pts · {band.label}). Review symptom-triggered medical detoxification and seizure precautions.
          </span>
          <button
            type="button"
            aria-pressed={false}
            onClick={() => useDesk.getState().setView("help")}
            className="font-mono text-[11px] uppercase tracking-wider text-accent underline underline-offset-2 hover:text-fg"
          >
            Find Local Medical Detox & Support
          </button>
        </div>
      ) : null}
    </article>
  );
}

function HarmPanel({ ids }: { ids: string[] }) {
  const cards = useMemo(() => harmOnDesk(ids), [ids.join("|")]);
  const strips = useMemo(() => stripsFor(ids), [ids.join("|")]);
  const kit = useMemo(() => kitFor(ids), [ids.join("|")]);
  const steps = useMemo(() => responseSteps(ids), [ids.join("|")]);
  const wiki = useMemo(() => wikiOnDesk(ids), [ids.join("|")]);
  const combos = useMemo(() => comboOnDesk(ids), [ids.join("|")]);
  const resources = useMemo(() => hrResourcesFor(ids), [ids.join("|")]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [liveCombo, setLiveCombo] = useState<LiveCombo | null>(null);
  const [busy, setBusy] = useState(false);
  const [wikiErr, setWikiErr] = useState("");

  useEffect(() => {
    if (!ids.length) {
      setPages([]);
      setLiveCombo(null);
      return;
    }
    let live = true;
    setBusy(true);
    setWikiErr("");
    void lookupPsychonaut({ data: { ids } })
      .then((pack) => {
        if (!live) return;
        setPages(pack.pages);
        setLiveCombo(pack.combo);
      })
      .catch(() => {
        if (live) setWikiErr("PsychonautWiki did not answer. Local teaching still stands.");
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [ids.join("|")]);

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-muted">
        Harm reduction for the molecules on this desk. Live PsychonautWiki intros (dosage
        stripped), TripSit combination ratings, SAMHSA and CDC paraphrases — teaching, not a
        protocol, not a milligram, not a cooking guide.
      </p>

      {combos.map((row) => (
        <article key={row.id} className={cn("rounded-md px-3 py-3", toneClass(comboTone(row.rating)))}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium text-fg">{row.title}</h3>
            <Badge tone={comboTone(row.rating) === "ok" ? "ok" : comboTone(row.rating) === "warn" ? "warn" : "danger"}>
              {row.rating}
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-fg">{row.body}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{row.watch}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-subtle">{row.source}</p>
          {liveCombo?.ok && (liveCombo.status || liveCombo.note) ? (
            <p className="mt-2 text-sm leading-relaxed text-fg">
              <span className="font-medium">TripSit live. </span>
              {liveCombo.status ? `${liveCombo.status}. ` : ""}
              {liveCombo.note}
            </p>
          ) : null}
        </article>
      ))}

      {cards.map((row) => (
        <article key={row.id} className={cn("rounded-md px-3 py-3", toneClass(row.tone))}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium text-fg">{row.title}</h3>
            <Badge tone={row.tone === "danger" ? "danger" : row.tone === "warn" ? "warn" : "ok"}>
              {row.kicker}
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-fg">{row.body}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{row.watch}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-subtle">{row.source}</p>
        </article>
      ))}

      {wiki.length ? (
        <article className="rounded-md bg-bg-sunken px-3 py-3">
          <h3 className="font-serif text-lg tracking-tight text-fg">Wiki monograph</h3>
          <p className="mt-1 text-xs text-muted">
            PsychonautWiki paraphrases for what is on this desk. Wiki, not a label. No milligram
            from this card.
          </p>
          <ul className="mt-3 space-y-4">
            {wiki.map((w) => (
              <li key={w.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-fg">{w.name}</p>
                  <a
                    href={w.href}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[11px] text-accent underline underline-offset-2"
                  >
                    Open {w.wikiTitle}
                  </a>
                </div>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">{w.cls}</p>
                <p className="mt-2 text-sm leading-relaxed text-fg">{w.teach}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{w.watch}</p>
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      <article className="rounded-md bg-bg-sunken px-3 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-serif text-lg tracking-tight text-fg">From PsychonautWiki tonight</h3>
            <p className="mt-1 text-xs text-muted">
              Live intro extract. Dosage, volumetric, and route how-to are stripped before they
              land. Open the page.
            </p>
          </div>
          <Badge tone="warn">Wiki ≠ PI</Badge>
        </div>
        {busy && pages.length === 0 ? <p className="mt-3 text-sm text-muted">Pulling the wiki…</p> : null}
        {wikiErr ? <p className="mt-3 text-sm text-muted">{wikiErr}</p> : null}
        <ul className="mt-3 space-y-3">
          {pages.map((p) => (
            <li key={p.id} className="rounded-md bg-surface px-3 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-fg">{p.name}</p>
                {p.url ? (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[11px] text-accent underline underline-offset-2"
                  >
                    Open wiki
                  </a>
                ) : null}
              </div>
              {p.extract ? (
                <p className="mt-2 text-sm leading-relaxed text-fg">{p.extract}</p>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {p.reason ?? "No intro after sanitizing. Open the wiki."}
                </p>
              )}
              {p.stripped && p.extract ? (
                <p className="mt-2 text-[11px] leading-relaxed text-subtle">
                  Dosage and route-how-to sentences were removed from this extract.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        {liveCombo && !combos.length && (liveCombo.ok || liveCombo.reason) ? (
          <p className="mt-3 text-sm leading-relaxed text-muted">
            TripSit live: {liveCombo.ok ? `${liveCombo.status}. ${liveCombo.note}` : liveCombo.reason}
          </p>
        ) : null}
      </article>

      <article className="rounded-md bg-bg-sunken px-3 py-3">
        <h3 className="font-serif text-lg tracking-tight text-fg">Overdose response</h3>
        <p className="mt-1 text-xs text-muted">Airway first. This is first-aid teaching, not a field protocol.</p>
        <ol className="mt-3 space-y-3">
          {steps.map((s) => (
            <li key={s.n} className="flex gap-3">
              <span className="font-mono text-xs text-muted">{s.n}</span>
              <div>
                <p className="text-sm font-medium text-fg">{s.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </article>

      <article className="rounded-md bg-bg-sunken px-3 py-3">
        <h3 className="font-serif text-lg tracking-tight text-fg">Test the supply</h3>
        <p className="mt-1 text-xs text-muted">
          A negative strip is not proof of safety. Reagents name a class, not a milligram. PsychonautWiki:
          chemically test; do not eyeball.
        </p>
        <ul className="mt-3 space-y-3">
          {strips.map((s) => (
            <li key={s.id}>
              <p className="text-sm font-medium text-fg">{s.name}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-fg">{s.catches}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted">Misses: {s.misses}</p>
            </li>
          ))}
        </ul>
      </article>

      <article className="rounded-md bg-bg-sunken px-3 py-3">
        <h3 className="font-serif text-lg tracking-tight text-fg">Kit on the table</h3>
        <p className="mt-1 text-xs text-muted">Tick what is actually there. Not a shopping list and not a dose.</p>
        <ul className="mt-3 space-y-2">
          {kit.map((item) => {
            const on = Boolean(checked[item.id]);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setChecked((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                  className="flex w-full items-start gap-2 text-left"
                >
                  {on ? (
                    <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-fg" />
                  ) : (
                    <Square className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                  )}
                  <span>
                    <span className="text-sm font-medium text-fg">{item.label}</span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-muted">{item.hint}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </article>

      <article className="rounded-md bg-bg-sunken px-3 py-3">
        <h3 className="font-serif text-lg tracking-tight text-fg">Principles</h3>
        <p className="mt-1 text-xs text-muted">PsychonautWiki Responsible drug use — paraphrased. Wiki, not a label.</p>
        <ul className="mt-3 space-y-3">
          {HR_PRINCIPLES.map((p) => (
            <li key={p.title}>
              <p className="text-sm font-medium text-fg">{p.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted">{p.body}</p>
            </li>
          ))}
        </ul>
      </article>

      <article className="rounded-md bg-bg-sunken px-3 py-3">
        <h3 className="font-serif text-lg tracking-tight text-fg">Open the source</h3>
        <ul className="mt-3 space-y-2">
          {resources.map((r) => (
            <li key={r.href}>
              <a
                href={r.href}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-fg underline decoration-subtle underline-offset-2 hover:decoration-fg"
              >
                {r.name}
              </a>
              <p className="text-sm leading-relaxed text-muted">{r.why}</p>
            </li>
          ))}
        </ul>
      </article>

      <p className="text-[11px] leading-relaxed text-subtle">{HR_FOOTER}</p>
    </div>
  );
}

function DosePanel({ ids, host }: { ids: string[]; host: HostContext }) {
  const doses = useDesk((s) => s.doses);
  const setDose = useDesk((s) => s.setDose);
  const rows = useMemo(
    () => dosingOnDesk(ids, parseDoses(doses), host),
    [ids.join("|"), JSON.stringify(doses), host.age, host.kidney],
  );
  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-muted">
        Labeled usual ranges and interaction caps. Type a milligram to check it against the PI. This
        desk does not pick one.
      </p>
      {rows.map((row) => (
        <DoseCard key={row.id} row={row} value={doses[row.id] ?? ""} onChange={(v) => setDose(row.id, v)} />
      ))}
      <p className="text-[11px] leading-relaxed text-subtle">
        Street mass, weight-based AUC, and titrated NTIs stay blank on purpose. Over-cap is the
        label, not a replacement milligram.
      </p>
    </div>
  );
}

function DoseCard({
  row,
  value,
  onChange,
}: {
  row: DoseCheck;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <article className={cn("rounded-md px-3 py-3", toneClass(row.tone === "info" ? "ok" : row.tone))}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-fg">{row.name}</h3>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
            {row.label.usualAdult} {row.label.unit}
          </p>
        </div>
        {row.label.neverPrescribe || row.label.weightBased ? null : (
          <label className="flex items-center gap-2">
            <span className="sr-only">Entered milligram for {row.name}</span>
            <Input
              inputMode="decimal"
              className="h-10 w-24"
              placeholder={row.label.unit}
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
          </label>
        )}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-fg">{row.headline}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{row.detail}</p>
      {row.cap ? (
        <p className="mt-2 text-[11px] leading-relaxed text-subtle">
          Cap: {row.cap.mg === 0 ? "labeled hold" : `${row.cap.mg} ${row.label.unit}`} · {row.cap.source}
        </p>
      ) : null}
    </article>
  );
}

function WardsPanel({ ids }: { ids: string[] }) {
  const rows = useMemo(
    () => [...wardsOnDesk(ids), ...safetyOnDesk(ids)],
    [ids.join("|")],
  );
  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-muted">
        Named labeled collisions the generic PD map misses or mis-names. Teaching — not a
        protocol, not a milligram. The Prescribing Information governs.
      </p>
      {rows.map((row) => (
        <article key={row.id} className={cn("rounded-md px-3 py-3", toneClass(row.tone))}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium text-fg">{row.title}</h3>
            <Badge tone={row.tone === "danger" ? "danger" : "warn"}>{row.severity}</Badge>
          </div>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-muted">{row.mechanism}</p>
          <p className="mt-2 text-sm leading-relaxed text-fg">{row.clinical}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{row.watch}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-subtle">{row.source}</p>
        </article>
      ))}
      <p className="text-[11px] leading-relaxed text-subtle">
        Carbapenem–valproate is UGT. Clozapine–benzo is boxed respiratory collapse, not generic
        CNS. Epclusa–amiodarone is boxed bradycardia, not stacked nodal PD. Dual ACEI+ARB is not
        the Entresto 36-hour washout. Open the PI.
      </p>
    </div>
  );
}

function AlertsPanel({ rows }: { rows: ReturnType<typeof alertsOnDesk> }) {
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const name = DRUG_BY_ID[row.id]?.name ?? row.id;
        return (
          <article key={row.id} className="rounded-md bg-bg-sunken px-3 py-3">
            <h3 className="text-sm font-medium text-fg">{name}</h3>
            <ul className="mt-2 space-y-2">
              {row.flags.map((f) => (
                <li key={f.kind}>
                  <Badge tone={f.kind === "rems" ? "danger" : f.kind === "niosh" ? "warn" : "info"}>{f.label}</Badge>
                  <p className="mt-1 text-sm leading-relaxed text-fg">{f.note}</p>
                </li>
              ))}
            </ul>
          </article>
        );
      })}
      <p className="text-[11px] leading-relaxed text-subtle">
        ISMP high-alert, NIOSH hazardous-drug, and REMS paraphrases of public lists. Incomplete on
        purpose. Open the source before you handle a crush.
      </p>
    </div>
  );
}

function toneClass(tone: "ok" | "warn" | "danger") {
  return tone === "danger" ? "bg-danger-soft" : tone === "warn" ? "bg-warn-soft" : "bg-ok-soft";
}

function OtpPanel({ ids, qtPartner }: { ids: string[]; qtPartner: boolean }) {
  const guessed = guessLastAgonist(ids);
  const [last, setLast] = useState<LastAgonist>(guessed);
  const [hours, setHours] = useState("24");
  const [cows, setCows] = useState("12");
  const [days, setDays] = useState("7");
  const [product, setProduct] = useState<NtxProduct>("xr");
  const [domains, setDomains] = useState<Record<string, boolean>>({});
  const [screens, setScreens] = useState<Record<string, boolean>>({});
  const precip = precipRisk(last, Number(hours), Number(cows));
  const wash = naltrexoneWashout(last, Number(days), product);
  const naloxone = naloxoneCounsel(ids);
  const ecg = methadoneMonitor(ids, qtPartner);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent-soft p-3 text-xs text-ink">
        <span>Need local treatment services? Find licensed Opioid Treatment Programs (OTPs), medical detox, and state addiction helplines.</span>
        <button
          type="button"
          aria-pressed={false}
          onClick={() => {
            useDesk.getState().setView("help");
            window.scrollTo({ top: 0 });
          }}
          className="font-medium text-accent underline underline-offset-2 hover:opacity-80"
        >
          Find treatment near you &rarr;
        </button>
      </div>
      <p className="text-sm leading-relaxed text-muted">
        Occupancy, washout, take-homes, naloxone, ECG, and ID screens. ASAM 2020 / TIP 63 / 42 CFR 8
        2024 teaching — not a protocol and not a milligram.
      </p>

      <article className="rounded-md bg-bg-sunken px-3 py-3">
          <h3 className="font-serif text-lg tracking-tight text-fg">Precipitated withdrawal</h3>
          <p className="mt-1 text-xs text-muted">Last agonist, hours since, COWS (published opioid withdrawal score). Occupancy is not the integer — teaching only.</p>
          <div className="mt-3 flex flex-wrap gap-1">
            {LAST_AGONISTS.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-pressed={last === a.id}
                onClick={() => setLast(a.id)}
                className={cn(
                  "h-10 rounded-full px-3 text-xs font-medium",
                  last === a.id ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-xs text-muted">
              Hours since last use
              <Input className="mt-1" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} />
            </label>
            <label className="text-xs text-muted">
              COWS <span className="text-subtle">(opioid withdrawal score)</span>
              <Input className="mt-1" inputMode="decimal" value={cows} onChange={(e) => setCows(e.target.value)} />
            </label>
          </div>
          <div className={cn("mt-3 rounded-md px-3 py-2.5", toneClass(precip.tone))}>
            <p className="text-sm font-medium text-fg">{precip.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-fg">{precip.body}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{precip.consider}</p>
          </div>
        </article>

      <article className="rounded-md bg-bg-sunken px-3 py-3">
          <h3 className="font-serif text-lg tracking-tight text-fg">Naltrexone washout</h3>
          <p className="mt-1 text-xs text-muted">Days off agonist vs oral vs Vivitrol. The PI times the shot, not this card.</p>
          <div className="mt-3 flex flex-wrap gap-1">
            {(["oral", "xr"] as const).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={product === p}
                onClick={() => setProduct(p)}
                className={cn(
                  "h-10 rounded-full px-3 text-xs font-medium",
                  product === p ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
                )}
              >
                {p === "xr" ? "XR / Vivitrol" : "Oral naltrexone"}
              </button>
            ))}
          </div>
          <label className="mt-3 block text-xs text-muted">
            Days since last full agonist
            <Input className="mt-1 max-w-40" inputMode="decimal" value={days} onChange={(e) => setDays(e.target.value)} />
          </label>
          <div className={cn("mt-3 rounded-md px-3 py-2.5", toneClass(wash.tone))}>
            <p className="text-sm font-medium text-fg">{wash.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-fg">{wash.body}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{wash.consider}</p>
          </div>
        </article>

      <article className="rounded-md bg-bg-sunken px-3 py-3">
        <h3 className="font-serif text-lg tracking-tight text-fg">Take-homes</h3>
        <p className="mt-1 text-xs text-muted">{TAKEHOME_RULE}</p>
        <ul className="mt-3 grid gap-1 sm:grid-cols-2">
          {TAKEHOME_DOMAINS.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                aria-pressed={Boolean(domains[d.id])}
                onClick={() => setDomains((prev) => ({ ...prev, [d.id]: !prev[d.id] }))}
                className={cn(
                  "flex h-auto min-h-10 w-full items-start gap-2 rounded-md px-3 py-2 text-left",
                  domains[d.id] ? "bg-accent-soft text-fg" : "bg-surface text-muted hover:text-fg",
                )}
              >
                <span className="mt-0.5">
                  {domains[d.id] ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
                </span>
                <span>
                  <span className="block text-sm font-medium text-fg">{d.label}</span>
                  <span className="block text-xs text-muted">{d.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Ticked {Object.values(domains).filter(Boolean).length} of {TAKEHOME_DOMAINS.length}. A full
          row is still not an approval.
        </p>
      </article>

      {naloxone ? (
        <article className="rounded-md bg-bg-sunken px-3 py-3">
          <h3 className="font-serif text-lg tracking-tight text-fg">Naloxone coprescribe</h3>
          <ul className="mt-2 space-y-2">
            {naloxone.map((line) => (
              <li key={line} className="text-sm leading-relaxed text-fg">
                {line}
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      {ecg ? (
        <article className={cn("rounded-md px-3 py-3", toneClass(ecg.tone))}>
          <h3 className="font-serif text-lg tracking-tight text-fg">{ecg.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-fg">{ecg.body}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{ecg.consider}</p>
        </article>
      ) : null}

      <article className="rounded-md bg-bg-sunken px-3 py-3">
        <h3 className="font-serif text-lg tracking-tight text-fg">ID / vaccine screens</h3>
        <p className="mt-1 text-xs text-muted">ASAM / CDC entry screens. Offers, not orders. Nothing here is stored.</p>
        <ul className="mt-3 grid gap-1 sm:grid-cols-2">
          {ID_SCREENS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                aria-pressed={Boolean(screens[s.id])}
                onClick={() => setScreens((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
                className={cn(
                  "flex h-auto min-h-10 w-full items-start gap-2 rounded-md px-3 py-2 text-left",
                  screens[s.id] ? "bg-accent-soft text-fg" : "bg-surface text-muted hover:text-fg",
                )}
              >
                <span className="mt-0.5">
                  {screens[s.id] ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
                </span>
                <span>
                  <span className="block text-sm font-medium text-fg">{s.label}</span>
                  <span className="block text-xs text-muted">{s.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </article>

      <p className="text-[11px] leading-relaxed text-subtle">
        Not FDA-cleared. Independently review ASAM 2020, SAMHSA TIP 63, 42 CFR 8, and the
        Prescribing Information. FirstPass does not time a film, a shot, or a take-home.
      </p>
    </div>
  );
}

function AncPanel() {
  const [anc, setAnc] = useState("1800");
  const [ben, setBen] = useState(false);
  const band = ancBand(Number(anc), ben);
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted">
        Clozapine REMS ANC table, paraphrased. Not the REMS portal, not a WBC, not a dispense.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">
          ANC (cells/µL)
          <Input className="mt-1" inputMode="decimal" value={anc} onChange={(e) => setAnc(e.target.value)} />
        </label>
        <div className="text-xs text-muted">
          BEN
          <button
            type="button"
            aria-pressed={ben}
            onClick={() => setBen((v) => !v)}
            className={cn(
              "mt-1 flex h-10 w-full items-center justify-center rounded-full text-xs font-medium",
              ben ? "bg-ink text-bg" : "bg-bg-sunken text-muted",
            )}
          >
            {ben ? "BEN documented" : "General population"}
          </button>
        </div>
      </div>
      <div className={cn("rounded-md px-3 py-3", toneClass(band.tone))}>
        <p className="font-mono text-[10px] uppercase tracking-wide text-muted">{band.label}</p>
        <p className="mt-1 text-sm leading-relaxed text-fg">{band.note}</p>
      </div>
      <p className="text-[11px] leading-relaxed text-subtle">
        Alvir 1993 agranulocytosis. Smoke and fluvoxamine move the level on the TDM tab. Open{" "}
        <a className="text-accent underline" href="https://www.clozapinerems.com/" target="_blank" rel="noreferrer">
          clozapinerems.com
        </a>
        .
      </p>
    </div>
  );
}

function InrPanel({ report }: { report: NonNullable<ReturnType<typeof inrOnDesk>> }) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-fg">{report.pearl}</p>
      {report.raisers.length ? (
        <div>
          <h3 className="font-mono text-[11px] uppercase tracking-wide text-danger">May raise INR / bleed</h3>
          <ul className="mt-2 space-y-2">
            {report.raisers.map((r) => (
              <li key={r.id} className="rounded-md bg-danger-soft px-3 py-2">
                <p className="text-sm font-medium text-fg">{r.name}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{r.how}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {report.lowers.length ? (
        <div>
          <h3 className="font-mono text-[11px] uppercase tracking-wide text-warn">May lower INR</h3>
          <ul className="mt-2 space-y-2">
            {report.lowers.map((r) => (
              <li key={r.id} className="rounded-md bg-warn-soft px-3 py-2">
                <p className="text-sm font-medium text-fg">{r.name}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{r.how}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {!report.raisers.length && !report.lowers.length ? (
        <p className="text-sm text-muted">No mapped INR mover on this desk besides warfarin. Absence is not a stable INR.</p>
      ) : null}
      <p className="text-[11px] leading-relaxed text-subtle">
        S-warfarin is 2C9. Kale is vitamin K. This is not a warfarin clinic and not a milligram.
      </p>
    </div>
  );
}

function PhenytoinBlock() {
  const [total, setTotal] = useState("12");
  const [albumin, setAlbumin] = useState("2.4");
  const [crclLow, setCrclLow] = useState(false);
  const result = phenytoinCorrected({ total: Number(total), albumin: Number(albumin), crclLow });
  return (
    <article className="rounded-md bg-bg-sunken px-3 py-3">
      <h3 className="font-serif text-lg tracking-tight text-fg">Corrected phenytoin</h3>
      <p className="mt-1 text-xs text-muted">Sheiner–Tozer. A free level is better. Tube feeds bind Dilantin on the food board.</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <label className="text-xs text-muted">
          Total (µg/mL)
          <Input className="mt-1" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} />
        </label>
        <label className="text-xs text-muted">
          Albumin (g/dL)
          <Input className="mt-1" inputMode="decimal" value={albumin} onChange={(e) => setAlbumin(e.target.value)} />
        </label>
        <div className="text-xs text-muted">
          CrCl
          <button
            type="button"
            aria-pressed={crclLow}
            onClick={() => setCrclLow((v) => !v)}
            className={cn(
              "mt-1 flex h-10 w-full items-center justify-center rounded-full text-xs font-medium",
              crclLow ? "bg-ink text-bg" : "bg-surface text-muted",
            )}
          >
            {crclLow ? "<10" : "≥10"}
          </button>
        </div>
      </div>
      {result ? (
        <p className="mt-3 text-sm text-fg">
          Corrected ≈ <span className="font-mono">{result.corrected}</span> µg/mL
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">Need total 0–80 and albumin 0.8–6.</p>
      )}
      {result ? <p className="mt-2 text-sm leading-relaxed text-muted">{result.note}</p> : null}
    </article>
  );
}

function ChildPughBlock() {
  const [bili, setBili] = useState<BilirubinBand>("under2");
  const [alb, setAlb] = useState<AlbuminBand>("over35");
  const [inrBand, setInrBand] = useState<InrBand>("under17");
  const [ascites, setAscites] = useState<AscitesGrade>("none");
  const [enceph, setEnceph] = useState<EncephalopathyGrade>("none");

  const res = childPughOf({
    bilirubin: bili,
    albumin: alb,
    inr: inrBand,
    ascites,
    encephalopathy: enceph,
  });

  return (
    <article className="rounded-md bg-bg-sunken px-3 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-serif text-lg tracking-tight text-fg">Child-Pugh hepatic score</h3>
          <p className="mt-1 text-xs text-muted">
            Hepatic functional reserve for drug clearance and FDA labeling guidance. Teaching math — not MELD.
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-lg text-fg">{res.score} / 15</p>
          <Badge tone={res.classBand === "A" ? "ok" : res.classBand === "B" ? "warn" : "danger"}>
            Class {res.classBand}
          </Badge>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-xs font-medium text-muted">Total Bilirubin</p>
          <div className="mt-1 flex gap-1">
            {([
              { val: "under2", label: "<2 mg/dL" },
              { val: "twoToThree", label: "2–3 mg/dL" },
              { val: "over3", label: ">3 mg/dL" },
            ] as const).map((opt) => (
              <button
                key={opt.val}
                type="button"
                aria-pressed={bili === opt.val}
                onClick={() => setBili(opt.val)}
                className={cn(
                  "h-9 flex-1 rounded-full text-[11px] font-medium",
                  bili === opt.val ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted">Serum Albumin</p>
          <div className="mt-1 flex gap-1">
            {([
              { val: "over35", label: ">3.5 g/dL" },
              { val: "twoEightToThreeFive", label: "2.8–3.5" },
              { val: "under28", label: "<2.8 g/dL" },
            ] as const).map((opt) => (
              <button
                key={opt.val}
                type="button"
                aria-pressed={alb === opt.val}
                onClick={() => setAlb(opt.val)}
                className={cn(
                  "h-9 flex-1 rounded-full text-[11px] font-medium",
                  alb === opt.val ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted">INR</p>
          <div className="mt-1 flex gap-1">
            {([
              { val: "under17", label: "<1.7" },
              { val: "oneSevenToTwoThree", label: "1.7–2.3" },
              { val: "over23", label: ">2.3" },
            ] as const).map((opt) => (
              <button
                key={opt.val}
                type="button"
                aria-pressed={inrBand === opt.val}
                onClick={() => setInrBand(opt.val)}
                className={cn(
                  "h-9 flex-1 rounded-full text-[11px] font-medium",
                  inrBand === opt.val ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted">Ascites</p>
          <div className="mt-1 flex gap-1">
            {([
              { val: "none", label: "None" },
              { val: "slight", label: "Slight/Ctrl" },
              { val: "moderate", label: "Mod/Severe" },
            ] as const).map((opt) => (
              <button
                key={opt.val}
                type="button"
                aria-pressed={ascites === opt.val}
                onClick={() => setAscites(opt.val)}
                className={cn(
                  "h-9 flex-1 rounded-full text-[11px] font-medium",
                  ascites === opt.val ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2 lg:col-span-2">
          <p className="text-xs font-medium text-muted">Hepatic Encephalopathy</p>
          <div className="mt-1 flex gap-1">
            {([
              { val: "none", label: "None" },
              { val: "grade1_2", label: "Grade 1–2 (mild confusion / asterixis)" },
              { val: "grade3_4", label: "Grade 3–4 (stupor / coma)" },
            ] as const).map((opt) => (
              <button
                key={opt.val}
                type="button"
                aria-pressed={enceph === opt.val}
                onClick={() => setEnceph(opt.val)}
                className={cn(
                  "h-9 flex-1 rounded-full px-2 text-[11px] font-medium",
                  enceph === opt.val ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={cn("mt-3 rounded-md px-3 py-2.5", toneClass(res.classBand === "A" ? "ok" : res.classBand === "B" ? "warn" : "danger"))}>
        <p className="text-sm font-medium text-fg">{res.label}</p>
        <p className="mt-1 text-sm leading-relaxed text-fg">{res.note}</p>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-subtle">
        Child & Turcotte 1964, Pugh 1973. Referenced across FDA drug labeling to define mild (A), moderate (B), and severe (C) hepatic impairment PK studies. Does not replace MELD for transplant urgency.
      </p>
    </article>
  );
}

function AcbPanel({ report }: { report: AcbReport }) {
  const isHigh = report.riskLevel === "high";
  const tone = isHigh ? "danger" : report.riskLevel === "low" ? "warn" : "ok";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-serif text-lg tracking-tight text-fg">Anticholinergic Cognitive Burden</h3>
          <p className="mt-1 text-xs text-muted">
            Cumulative anticholinergic exposure scoring (Boustani 2008 / Campbell 2013 / AGS Beers Criteria).
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-lg text-fg">Score: {report.totalScore}</p>
          <Badge tone={tone}>
            {isHigh ? "High Burden (≥3)" : "Low Burden"}
          </Badge>
        </div>
      </div>

      <div className={cn("rounded-md px-3 py-3", toneClass(tone))}>
        <p className="text-sm font-medium text-fg">{report.summary}</p>
        <p className="mt-1 text-sm leading-relaxed text-fg">{report.pearl}</p>
      </div>

      <div>
        <h4 className="font-mono text-[11px] uppercase tracking-wide text-muted">Scored tray contributors</h4>
        <ul className="mt-2 space-y-2">
          {report.contributors.map((c) => (
            <li key={c.drugId} className="rounded-md bg-bg-sunken px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-fg">{c.name}</span>
                <Badge tone={c.score === 3 ? "danger" : c.score === 2 ? "warn" : "info"}>
                  +{c.score} pt{c.score > 1 ? "s" : ""}
                </Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">{c.mechanism}</p>
              {c.alternative ? (
                <p className="mt-1.5 text-xs leading-relaxed text-accent">
                  <span className="font-medium text-fg">Alternative consideration:</span> {c.alternative}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <article className="rounded-md bg-bg-sunken px-3 py-2.5">
          <h4 className="text-xs font-semibold text-fg">Central manifestations</h4>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Memory impairment, confusion, acute delirium, hallucinations, slowed psychomotor processing, sedation, and increased fall risk.
          </p>
        </article>
        <article className="rounded-md bg-bg-sunken px-3 py-2.5">
          <h4 className="text-xs font-semibold text-fg">Peripheral manifestations</h4>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Dry mouth (xerostomia), blurred vision / cycloplegia, constipation / impaction, urinary retention, tachycardia, and anhidrosis / hyperthermia.
          </p>
        </article>
      </div>

      <p className="text-[11px] leading-relaxed text-subtle">
        Educational reference only. A score ≥3 signals heightened vulnerability in older or cognitively fragile adults. Not a deprescribing order. Individual patient indications and specialist plans govern.
      </p>
    </div>
  );
}

function VancoAucBlock({ defaultCrcl, isHot }: { defaultCrcl?: number; isHot?: boolean }) {
  const [calcMode, setCalcMode] = useState<"empiric" | "sawchuk-zaske">("empiric");
  const [dose, setDose] = useState("2000");
  const [crcl, setCrcl] = useState(defaultCrcl ? String(defaultCrcl) : "80");
  const [mic, setMic] = useState("1.0");

  // Sawchuk-Zaske 2-point state
  const [szDose, setSzDose] = useState("1250");
  const [szInfusion, setSzInfusion] = useState("1.5");
  const [szTau, setSzTau] = useState("12");
  const [szC1Peak, setSzC1Peak] = useState("28");
  const [szT1Post, setSzT1Post] = useState("1.5");
  const [szC2Trough, setSzC2Trough] = useState("12");
  const [szT2Pre, setSzT2Pre] = useState("0.5");

  useEffect(() => {
    if (defaultCrcl && defaultCrcl > 0) {
      setCrcl(String(defaultCrcl));
    }
  }, [defaultCrcl]);

  const empiricRes = vancoAucOf({
    totalDailyDoseMg: Number(dose),
    crcl: Number(crcl),
    mic: Number(mic),
  });

  const szRes = calculateVancoSawchukZaske({
    doseMg: Number(szDose),
    infusionHours: Number(szInfusion),
    tauHours: Number(szTau),
    c1PeakUgMl: Number(szC1Peak),
    t1HoursPostInfusion: Number(szT1Post),
    c2TroughUgMl: Number(szC2Trough),
    t2HoursBeforeNextDose: Number(szT2Pre),
    mic: Number(mic),
  });

  const activeRes = calcMode === "empiric" ? empiricRes : szRes;
  const activeAuc = calcMode === "empiric" ? empiricRes?.auc24 : szRes?.auc24;
  const activeBand = calcMode === "empiric" ? empiricRes?.band : szRes?.band;

  return (
    <article className={cn("rounded-md px-3 py-3", isHot ? "bg-accent-soft/60" : "bg-bg-sunken")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg tracking-tight text-fg">Vancomycin AUC24 / MIC</h3>
            {isHot ? <Badge tone="info">Vancomycin on tray</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-muted">
            2020 ASHP/IDSA consensus target: 400–600 mg·h/L for serious MRSA infections (assuming MIC 1 mg/L).
          </p>
        </div>
        {activeRes ? (
          <div className="text-right">
            <p className="font-mono text-lg text-fg">AUC {activeAuc} mg·h/L</p>
            <Badge tone={activeBand === "target" ? "ok" : activeBand === "subtherapeutic" ? "warn" : "danger"}>
              {activeBand === "target" ? "Target (400–600)" : activeBand === "subtherapeutic" ? "Subtherapeutic (<400)" : "Supratherapeutic (>600)"}
            </Badge>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex gap-1">
        <button
          type="button"
          aria-pressed={calcMode === "empiric"}
          onClick={() => setCalcMode("empiric")}
          className={cn(
            "h-8 rounded px-3 text-xs font-medium",
            calcMode === "empiric" ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
          )}
        >
          Empiric CrCl Estimate
        </button>
        <button
          type="button"
          aria-pressed={calcMode === "sawchuk-zaske"}
          onClick={() => setCalcMode("sawchuk-zaske")}
          className={cn(
            "h-8 rounded px-3 text-xs font-medium",
            calcMode === "sawchuk-zaske" ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
          )}
        >
          Sawchuk-Zaske (Peak & Trough)
        </button>
      </div>

      {calcMode === "empiric" ? (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <label className="text-xs text-muted">
              Total daily dose (mg/24h)
              <Input className="mt-1" inputMode="decimal" value={dose} onChange={(e) => setDose(e.target.value)} />
            </label>
            <label className="text-xs text-muted">
              CrCl (mL/min)
              <Input className="mt-1" inputMode="decimal" value={crcl} onChange={(e) => setCrcl(e.target.value)} />
            </label>
            <label className="text-xs text-muted">
              MIC (mg/L)
              <Input className="mt-1" inputMode="decimal" value={mic} onChange={(e) => setMic(e.target.value)} />
            </label>
          </div>

          {empiricRes ? (
            <div className={cn("mt-3 rounded-md px-3 py-2.5", toneClass(empiricRes.band === "target" ? "ok" : empiricRes.band === "subtherapeutic" ? "warn" : "danger"))}>
              <p className="text-sm font-medium text-fg">{empiricRes.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-fg">{empiricRes.note}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">Enter total daily dose (250–8000 mg) and CrCl (5–250 mL/min).</p>
          )}
        </>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="text-xs text-muted">
              Dose per Admin (mg)
              <Input className="mt-1" inputMode="decimal" value={szDose} onChange={(e) => setSzDose(e.target.value)} />
            </label>
            <label className="text-xs text-muted">
              Infusion Time (hours)
              <Input className="mt-1" inputMode="decimal" value={szInfusion} onChange={(e) => setSzInfusion(e.target.value)} />
            </label>
            <label className="text-xs text-muted">
              Interval Tau (hours)
              <Input className="mt-1" inputMode="decimal" value={szTau} onChange={(e) => setSzTau(e.target.value)} />
            </label>
            <label className="text-xs text-muted">
              MIC (mg/L)
              <Input className="mt-1" inputMode="decimal" value={mic} onChange={(e) => setMic(e.target.value)} />
            </label>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="text-xs text-muted">
              C1 Peak (µg/mL)
              <Input className="mt-1" inputMode="decimal" value={szC1Peak} onChange={(e) => setSzC1Peak(e.target.value)} />
            </label>
            <label className="text-xs text-muted">
              Post-Infusion Draw (h)
              <Input className="mt-1" inputMode="decimal" value={szT1Post} onChange={(e) => setSzT1Post(e.target.value)} />
            </label>
            <label className="text-xs text-muted">
              C2 Trough (µg/mL)
              <Input className="mt-1" inputMode="decimal" value={szC2Trough} onChange={(e) => setSzC2Trough(e.target.value)} />
            </label>
            <label className="text-xs text-muted">
              Pre-Dose Draw (h)
              <Input className="mt-1" inputMode="decimal" value={szT2Pre} onChange={(e) => setSzT2Pre(e.target.value)} />
            </label>
          </div>

          {szRes ? (
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded bg-surface p-2 text-xs">
                  <span className="text-[10px] text-muted block">True Cmax (end-inf)</span>
                  <span className="font-mono text-sm font-semibold text-fg">{szRes.trueCmaxUgMl} µg/mL</span>
                </div>
                <div className="rounded bg-surface p-2 text-xs">
                  <span className="text-[10px] text-muted block">True Cmin (pre-dose)</span>
                  <span className="font-mono text-sm font-semibold text-fg">{szRes.trueCminUgMl} µg/mL</span>
                </div>
                <div className="rounded bg-surface p-2 text-xs">
                  <span className="text-[10px] text-muted block">ke & t½</span>
                  <span className="font-mono text-sm font-semibold text-fg">{szRes.ke} h⁻¹ ({szRes.halfLifeHours} h)</span>
                </div>
                <div className="rounded bg-surface p-2 text-xs">
                  <span className="text-[10px] text-muted block">Vd & Clearance</span>
                  <span className="font-mono text-sm font-semibold text-fg">{szRes.vdL} L ({szRes.clearanceLPerHr} L/h)</span>
                </div>
              </div>

              {szRes.samplingTimingWarning ? (
                <div className="rounded bg-warn-soft p-2.5 text-xs text-fg leading-relaxed">
                  {szRes.samplingTimingWarning}
                </div>
              ) : null}

              <div className={cn("rounded-md px-3 py-2.5", toneClass(szRes.band === "target" ? "ok" : szRes.band === "subtherapeutic" ? "warn" : "danger"))}>
                <p className="text-sm font-medium text-fg">{szRes.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-fg">{szRes.clinicalNote}</p>
              </div>

              <p className="text-xs leading-relaxed text-muted font-mono">{szRes.troughContextNote}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">Enter valid peak/trough levels (Peak &gt; Trough) and sampling time points.</p>
          )}
        </>
      )}

      <p className="mt-2 text-[11px] leading-relaxed text-subtle">
        Consensus guidelines retired trough-only targets (15–20 µg/mL) in favor of AUC24:MIC to minimize nephrotoxicity while preserving bactericidal efficacy. Bedside pharmacokinetic kinetic estimate; individual therapeutic drug monitoring and clinical judgment govern.
      </p>
    </article>
  );
}

function OsmolarGapBlock({ isHot }: { isHot?: boolean }) {
  const [meas, setMeas] = useState("300");
  const [na, setNa] = useState("140");
  const [glu, setGlu] = useState("90");
  const [bun, setBun] = useState("14");
  const [eth, setEth] = useState("0");

  const res = osmolarGapOf({
    measuredOsm: Number(meas),
    na: Number(na),
    glucose: Number(glu),
    bun: Number(bun),
    ethanolMgDl: Number(eth) || 0,
  });

  return (
    <article className={cn("rounded-md px-3 py-3", isHot ? "bg-accent-soft/60" : "bg-bg-sunken")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg tracking-tight text-fg">Serum Osmolar Gap</h3>
            {isHot ? <Badge tone="info">Alcohol / Osmolyte on tray</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-muted">
            Measured osmolality minus calculated (2·Na + Glu/18 + BUN/2.8 + EtOH/4.6). Unmeasured toxic alcohol screen.
          </p>
        </div>
        {res ? (
          <div className="text-right">
            <p className="font-mono text-lg text-fg">Gap: {res.gap > 0 ? `+${res.gap}` : res.gap} mOsm/kg</p>
            <Badge tone={res.band === "normal" ? "ok" : res.band === "borderline" ? "warn" : "danger"}>
              {res.band === "normal" ? "Normal (≤10)" : res.band === "borderline" ? "Borderline (11–14)" : "Elevated (≥15)"}
            </Badge>
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <label className="text-xs text-muted">
          Measured Osm
          <Input className="mt-1" inputMode="decimal" value={meas} onChange={(e) => setMeas(e.target.value)} />
        </label>
        <label className="text-xs text-muted">
          Na (mEq/L)
          <Input className="mt-1" inputMode="decimal" value={na} onChange={(e) => setNa(e.target.value)} />
        </label>
        <label className="text-xs text-muted">
          Glucose (mg/dL)
          <Input className="mt-1" inputMode="decimal" value={glu} onChange={(e) => setGlu(e.target.value)} />
        </label>
        <label className="text-xs text-muted">
          BUN (mg/dL)
          <Input className="mt-1" inputMode="decimal" value={bun} onChange={(e) => setBun(e.target.value)} />
        </label>
        <label className="text-xs text-muted">
          Ethanol (mg/dL)
          <Input className="mt-1" inputMode="decimal" value={eth} onChange={(e) => setEth(e.target.value)} />
        </label>
      </div>

      {res ? (
        <div className={cn("mt-3 rounded-md px-3 py-2.5", toneClass(res.band === "normal" ? "ok" : res.band === "borderline" ? "warn" : "danger"))}>
          <div className="flex justify-between text-xs font-mono">
            <span>Calculated: {res.calculatedOsm} mOsm/kg</span>
            <span>Delta: {res.gap} mOsm/kg</span>
          </div>
          <p className="mt-1 text-sm font-medium text-fg">{res.label}</p>
          <p className="mt-1 text-sm leading-relaxed text-fg">{res.note}</p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">Enter measured osmolality (200–550) and chemistry values.</p>
      )}

      <p className="mt-2 text-[11px] leading-relaxed text-subtle">
        Normal gap does not exclude late toxic alcohol ingestions after the parent alcohol is converted into non-volatile acidic metabolites. Correlate with clinical state, anion gap, and poison center guidance.
      </p>
    </article>
  );
}

function DialysisPanel({ report }: { report: DialysisReport }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-serif text-lg tracking-tight text-fg">Hemodialysis Drug Clearance</h3>
          <p className="mt-1 text-xs text-muted">
            Extracorporeal clearance and post-dialysis replacement schedule (Bennett / FDA PK labeling).
          </p>
        </div>
        <div className="flex flex-wrap gap-1 text-right">
          <Badge tone="danger">{report.dialyzedCount} Dialyzed</Badge>
          {report.partiallyDialyzedCount ? (
            <Badge tone="warn">{report.partiallyDialyzedCount} Partial</Badge>
          ) : null}
          <Badge tone="info">{report.notDialyzedCount} Non-dialyzed</Badge>
        </div>
      </div>

      <div className="rounded-md bg-bg-sunken px-3 py-3">
        <p className="text-sm font-medium text-fg">{report.summary}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{report.principles}</p>
      </div>

      <div>
        <h4 className="font-mono text-[11px] uppercase tracking-wide text-muted">Tray drug clearance profiles</h4>
        <ul className="mt-2 space-y-2.5">
          {report.rows.map((row) => (
            <li key={row.id} className="rounded-md bg-bg-sunken px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-semibold text-fg">{row.name}</span>
                  {row.fractionRemovedPct ? (
                    <span className="ml-2 font-mono text-xs text-muted">({row.fractionRemovedPct} removed)</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge tone={row.dialyzability === "dialyzed" ? "danger" : row.dialyzability === "partially-dialyzed" ? "warn" : "ok"}>
                    {row.dialyzability === "dialyzed" ? "Dialyzed" : row.dialyzability === "partially-dialyzed" ? "Partially dialyzed" : "Not dialyzed"}
                  </Badge>
                  <Badge tone={row.schedule === "post-hd" ? "danger" : row.schedule === "supplement" ? "warn" : "info"}>
                    {row.schedule === "post-hd" ? "Dose post-HD" : row.schedule === "supplement" ? "Supplement" : "Standard schedule"}
                  </Badge>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted">
                <span>MW: {row.molecularWeightDa} Da</span>
                <span>Protein binding: {row.proteinBindingPct}%</span>
                <span>Vd: {row.volumeDistributionLKg} L/kg</span>
              </div>

              <p className="mt-1.5 text-xs leading-relaxed text-muted">{row.mechanism}</p>
              <p className="mt-1 text-xs leading-relaxed text-fg">{row.pearl}</p>
              {row.caution ? (
                <p className="mt-1 text-xs leading-relaxed text-danger font-medium">{row.caution}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-md bg-bg-sunken p-3 text-[11px] leading-relaxed text-subtle">
        Teaching reference grounded in Bennett's Drug Prescribing in Renal Failure and FDA package inserts. Does not generate replacement milligram orders. Consult nephrology and dialysis unit protocols for specific dialyzer membrane flux and blood/dialysate flow rates.
      </div>
    </div>
  );
}

function AnionGapBlock({ isHot }: { isHot?: boolean }) {
  const [na, setNa] = useState("140");
  const [cl, setCl] = useState("100");
  const [hco3, setHco3] = useState("15");
  const [alb, setAlb] = useState("2.5");
  const [useAlb, setUseAlb] = useState(true);

  const res = anionGapOf({
    na: Number(na),
    cl: Number(cl),
    hco3: Number(hco3),
    albumin: useAlb ? Number(alb) : undefined,
  });

  return (
    <article className={cn("rounded-md px-3 py-3", isHot ? "bg-accent-soft/60" : "bg-bg-sunken")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg tracking-tight text-fg">Serum Anion Gap & Albumin Correction</h3>
            {isHot ? <Badge tone="info">Acidosis / Toxin on tray</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-muted">
            Na - (Cl + HCO3). Figge-Jabor-Kazda albumin adjustment: +2.5 mEq/L per 1 g/dL drop below 4.0.
          </p>
        </div>
        {res ? (
          <div className="text-right">
            <p className="font-mono text-lg text-fg">
              Gap: {res.correctedGap} mEq/L
              {res.albuminCorrectionApplied ? (
                <span className="text-xs text-muted"> (raw {res.rawGap})</span>
              ) : null}
            </p>
            <Badge tone={res.band === "elevated" ? "danger" : res.band === "low" ? "warn" : "ok"}>
              {res.band === "elevated" ? "HAGMA (Elevated)" : res.band === "low" ? "Low Gap (<4)" : "Normal Gap (8–12)"}
            </Badge>
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="text-xs text-muted">
          Na (mEq/L)
          <Input className="mt-1" inputMode="decimal" value={na} onChange={(e) => setNa(e.target.value)} />
        </label>
        <label className="text-xs text-muted">
          Cl (mEq/L)
          <Input className="mt-1" inputMode="decimal" value={cl} onChange={(e) => setCl(e.target.value)} />
        </label>
        <label className="text-xs text-muted">
          HCO3 (mEq/L)
          <Input className="mt-1" inputMode="decimal" value={hco3} onChange={(e) => setHco3(e.target.value)} />
        </label>
        <div className="text-xs text-muted">
          <div className="flex items-center justify-between">
            <span>Albumin (g/dL)</span>
            <button
              type="button"
              aria-pressed={useAlb}
              onClick={() => setUseAlb((v) => !v)}
              className="text-[10px] text-accent underline"
            >
              {useAlb ? "Disable" : "Enable"}
            </button>
          </div>
          <Input
            className="mt-1"
            inputMode="decimal"
            disabled={!useAlb}
            value={useAlb ? alb : "4.0"}
            onChange={(e) => setAlb(e.target.value)}
          />
        </div>
      </div>

      {res ? (
        <div className={cn("mt-3 rounded-md px-3 py-2.5", toneClass(res.band === "elevated" ? "danger" : res.band === "low" ? "warn" : "ok"))}>
          <div className="flex flex-wrap justify-between gap-1 text-xs font-mono">
            <span>Raw AG: {res.rawGap} mEq/L</span>
            {res.albuminCorrectionApplied ? <span>Albumin Adj: {res.correctedGap} mEq/L</span> : null}
            {res.deltaRatio !== null ? <span>Delta Ratio: {res.deltaRatio}</span> : null}
          </div>
          <p className="mt-1 text-sm font-medium text-fg">{res.label}</p>
          <p className="mt-1 text-sm leading-relaxed text-fg">{res.interpretation}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-fg/90">{res.etiologyNote}</p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">Enter valid serum electrolytes (Na 100–180, Cl 50–150, HCO3 2–60).</p>
      )}

      <p className="mt-2 text-[11px] leading-relaxed text-subtle">
        Serum albumin is the predominant unmeasured anion. In critical illness or hypoalbuminemia, an uncorrected normal anion gap may obscure a true high anion gap metabolic acidosis. Delta ratio (ΔAG / ΔHCO3) assesses for mixed acid-base disorders.
      </p>
    </article>
  );
}

function CorrectedSodiumBlock({ isHot }: { isHot?: boolean }) {
  const [measNa, setMeasNa] = useState("130");
  const [glu, setGlu] = useState("650");

  const res = correctedSodiumOf({
    measuredNa: Number(measNa),
    glucose: Number(glu),
  });

  return (
    <article className={cn("rounded-md px-3 py-3", isHot ? "bg-accent-soft/60" : "bg-bg-sunken")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg tracking-tight text-fg">Hyperglycemia-Corrected Sodium</h3>
            {isHot ? <Badge tone="info">Insulin / Glucose on tray</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-muted">
            Translocational pseudohyponatremia math for DKA / HHS resuscitation and IV fluid choice.
          </p>
        </div>
        {res ? (
          <div className="text-right">
            <p className="font-mono text-lg text-fg">
              {res.hillierSodium} mEq/L
              <span className="text-xs text-muted"> (meas {res.measuredNa})</span>
            </p>
            <Badge tone={res.hillierSodium >= 135 ? "ok" : "warn"}>
              {res.hillierSodium >= 135 ? "Eunatremic / Hypernatremic" : "Persistent Hyponatremia"}
            </Badge>
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">
          Measured Na (mEq/L)
          <Input className="mt-1" inputMode="decimal" value={measNa} onChange={(e) => setMeasNa(e.target.value)} />
        </label>
        <label className="text-xs text-muted">
          Serum Glucose (mg/dL)
          <Input className="mt-1" inputMode="decimal" value={glu} onChange={(e) => setGlu(e.target.value)} />
        </label>
      </div>

      {res ? (
        <div className="mt-3 rounded-md bg-bg-sunken px-3 py-2.5">
          <div className="grid grid-cols-2 gap-2 text-xs font-mono sm:grid-cols-3">
            <div>
              <span className="text-muted block">Hillier 1999 (2.4x)</span>
              <span className="font-semibold text-fg">{res.hillierSodium} mEq/L</span>
            </div>
            <div>
              <span className="text-muted block">Katz 1973 (1.6x)</span>
              <span className="font-semibold text-fg">{res.katzSodium} mEq/L</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-muted block">Water-shift ΔNa</span>
              <span className="font-semibold text-fg">+{res.deltaNa} mEq/L</span>
            </div>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-accent font-medium">{res.fluidGuidance}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{res.note}</p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">Enter valid Na (100–180) and Glucose (30–2500).</p>
      )}

      <p className="mt-2 text-[11px] leading-relaxed text-subtle">
        Extracellular glucose pulls water from intracellular space into the vascular compartment, diluting serum sodium without actual total-body sodium loss. In DKA / HHS protocols, corrected sodium governs whether 0.45% NaCl vs 0.9% NaCl is selected once initial volume resuscitation is completed.
      </p>
    </article>
  );
}

function SteroidEquivBlock({ defaultDrugId, isHot }: { defaultDrugId?: string; isHot?: boolean }) {
  const [drugId, setDrugId] = useState(defaultDrugId ?? "prednisone");
  const [doseMg, setDoseMg] = useState("20");

  useEffect(() => {
    if (defaultDrugId && STEROID_BY_ID[defaultDrugId]) {
      setDrugId(defaultDrugId);
    }
  }, [defaultDrugId]);

  const res = convertSteroid({
    fromDrugId: drugId,
    amountMg: Number(doseMg),
  });

  return (
    <article className={cn("rounded-md px-3 py-3", isHot ? "bg-accent-soft/60" : "bg-bg-sunken")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg tracking-tight text-fg">Systemic Corticosteroid Equivalence</h3>
            {isHot ? <Badge tone="info">Steroid on tray</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-muted">
            Glucocorticoid anti-inflammatory equivalent dosing and mineralocorticoid potency comparison.
          </p>
        </div>
        {res ? (
          <div className="text-right">
            <p className="font-mono text-lg text-fg">{res.prednisoneEqMg} mg pred eq</p>
            <Badge tone={res.prednisoneEqMg >= 20 ? "warn" : "ok"}>
              {res.prednisoneEqMg >= 20 ? "High Dose (≥20 mg/d)" : "Low / Replacement Dose"}
            </Badge>
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">
          Steroid agent
          <select
            value={drugId}
            onChange={(e) => setDrugId(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-input bg-surface px-2 text-xs font-medium text-fg"
          >
            {STEROID_AGENTS.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} ({agent.equivDoseMg} mg eq)
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          Current dose (mg)
          <Input className="mt-1" inputMode="decimal" value={doseMg} onChange={(e) => setDoseMg(e.target.value)} />
        </label>
      </div>

      {res ? (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 font-mono text-xs">
            <div className="rounded bg-surface p-2">
              <span className="text-[10px] text-muted block uppercase">Prednisone eq</span>
              <span className="text-sm font-semibold text-fg">{res.prednisoneEqMg} mg</span>
            </div>
            <div className="rounded bg-surface p-2">
              <span className="text-[10px] text-muted block uppercase">Hydrocortisone eq</span>
              <span className="text-sm font-semibold text-fg">{res.hydrocortisoneEqMg} mg</span>
            </div>
            <div className="rounded bg-surface p-2">
              <span className="text-[10px] text-muted block uppercase">Methylprednisolone</span>
              <span className="text-sm font-semibold text-fg">
                {res.conversions.find((c) => c.id === "methylprednisolone")?.amountMg} mg
              </span>
            </div>
            <div className="rounded bg-surface p-2">
              <span className="text-[10px] text-muted block uppercase">Dexamethasone</span>
              <span className="text-sm font-semibold text-fg">
                {res.conversions.find((c) => c.id === "dexamethasone")?.amountMg} mg
              </span>
            </div>
          </div>

          {res.mineralocorticoidWarning ? (
            <p className="rounded bg-warn-soft p-2 text-xs leading-relaxed text-fg">
              {res.mineralocorticoidWarning}
            </p>
          ) : null}

          {res.hepaticProdrugNote ? (
            <p className="rounded bg-bg-sunken p-2 text-xs leading-relaxed text-muted">
              {res.hepaticProdrugNote}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">Enter a valid dose in mg (0.1–5000).</p>
      )}

      <p className="mt-2 text-[11px] leading-relaxed text-subtle">
        Educational equivalence reference grounded in standard clinical pharmacology tables. Individual pharmacokinetics, route of administration, and biologic half-life vary. Does not replace clinical consultation.
      </p>
    </article>
  );
}

function SteroidsPanel({ report }: { report: SteroidReport }) {
  const [selectedAgent, setSelectedAgent] = useState("prednisone");
  const [doseMg, setDoseMg] = useState("20");
  const [targetId, setTargetId] = useState("methylprednisolone");

  // HPA calculator state
  const [hpaDose, setHpaDose] = useState("20");
  const [hpaWeeks, setHpaWeeks] = useState("4");
  const [timing, setTiming] = useState<DosingTiming>("morning");
  const [cushingoid, setCushingoid] = useState(false);

  const conv = convertSteroid({
    fromDrugId: selectedAgent,
    amountMg: Number(doseMg),
    targetDrugId: targetId,
  });

  const hpa = hpaSuppressionRisk({
    prednisoneEqMgPerDay: Number(hpaDose),
    durationWeeks: Number(hpaWeeks),
    timing,
    cushingoidFeatures: cushingoid,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-serif text-lg tracking-tight text-fg">Corticosteroid Pharmacology & HPA Axis Station</h3>
          <p className="mt-1 text-xs text-muted">
            Glucocorticoid equivalence, anti-inflammatory vs mineralocorticoid potency, and HPA axis suppression risk.
          </p>
        </div>
        <Badge tone="info">
          {report.present.length} on tray
        </Badge>
      </div>

      {report.hasSteroid ? (
        <div className="rounded-md bg-accent-soft/40 p-3">
          <p className="text-sm font-semibold text-fg">{report.summary}</p>
          <ul className="mt-2 space-y-1 text-xs text-fg">
            {report.pearls.map((p, idx) => (
              <li key={idx} className="leading-relaxed">• {p}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Section 1: Equivalence Converter */}
      <article className="rounded-md bg-bg-sunken p-4">
        <h4 className="font-serif text-base tracking-tight text-fg">Glucocorticoid Equivalence Converter</h4>
        <p className="mt-1 text-xs text-muted">
          Convert any systemic corticosteroid into therapeutic equivalents across standard clinical agents.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-muted">
            Source Steroid
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-surface px-2 text-xs font-medium text-fg"
            >
              {STEROID_AGENTS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.equivDoseMg} mg eq)
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            Current Dose (mg)
            <Input className="mt-1" inputMode="decimal" value={doseMg} onChange={(e) => setDoseMg(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            Target Steroid Comparison
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-surface px-2 text-xs font-medium text-fg"
            >
              {STEROID_AGENTS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {conv ? (
          <div className="mt-4 space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-md bg-surface p-3">
                <span className="text-[11px] text-muted block">Prednisone Equivalent</span>
                <span className="font-mono text-lg font-semibold text-fg">{conv.prednisoneEqMg} mg</span>
                <span className="text-[10px] text-muted block mt-0.5">Benchmark outpatient dose</span>
              </div>
              <div className="rounded-md bg-surface p-3">
                <span className="text-[11px] text-muted block">Hydrocortisone Equivalent</span>
                <span className="font-mono text-lg font-semibold text-fg">{conv.hydrocortisoneEqMg} mg</span>
                <span className="text-[10px] text-muted block mt-0.5">Endogenous cortisol standard</span>
              </div>
              <div className="rounded-md bg-surface p-3">
                <span className="text-[11px] text-muted block">Target ({conv.specificTarget?.name})</span>
                <span className="font-mono text-lg font-semibold text-accent">{conv.specificTarget?.amountMg} mg</span>
                <span className="text-[10px] text-muted block mt-0.5">Therapeutic equivalent dose</span>
              </div>
            </div>

            {conv.mineralocorticoidWarning ? (
              <div className="rounded bg-warn-soft p-2.5 text-xs text-fg leading-relaxed">
                {conv.mineralocorticoidWarning}
              </div>
            ) : null}

            {conv.hepaticProdrugNote ? (
              <div className="rounded bg-bg-surface p-2.5 text-xs text-muted leading-relaxed">
                {conv.hepaticProdrugNote}
              </div>
            ) : null}
          </div>
        ) : null}
      </article>

      {/* Section 2: HPA Axis Suppression & Tapering Framework */}
      <article className="rounded-md bg-bg-sunken p-4">
        <h4 className="font-serif text-base tracking-tight text-fg">HPA Axis Suppression Risk & Tapering Framework</h4>
        <p className="mt-1 text-xs text-muted">
          Endocrine Society / CDC guidelines for hypothalamic-pituitary-adrenal axis recovery and stress-dosing indications.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <label className="text-xs text-muted">
            Prednisone Eq (mg/day)
            <Input className="mt-1" inputMode="decimal" value={hpaDose} onChange={(e) => setHpaDose(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            Duration (weeks)
            <Input className="mt-1" inputMode="decimal" value={hpaWeeks} onChange={(e) => setHpaWeeks(e.target.value)} />
          </label>
          <div className="text-xs text-muted">
            Dosing Schedule
            <div className="mt-1 flex gap-1">
              {(["morning", "evening", "divided"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={timing === t}
                  onClick={() => setTiming(t)}
                  className={cn(
                    "h-9 flex-1 rounded text-[11px] font-medium capitalize",
                    timing === t ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="text-xs text-muted">
            Cushingoid Signs
            <button
              type="button"
              aria-pressed={cushingoid}
              onClick={() => setCushingoid((v) => !v)}
              className={cn(
                "mt-1 flex h-9 w-full items-center justify-center rounded text-xs font-medium",
                cushingoid ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
              )}
            >
              {cushingoid ? "Present (Facies/Hump)" : "None noted"}
            </button>
          </div>
        </div>

        {hpa ? (
          <div className="mt-4 space-y-3">
            <div className={cn("rounded-md p-3", toneClass(hpa.risk === "high" ? "danger" : hpa.risk === "intermediate" ? "warn" : "ok"))}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-fg">{hpa.label}</span>
                <Badge tone={hpa.risk === "high" ? "danger" : hpa.risk === "intermediate" ? "warn" : "ok"}>
                  {hpa.risk.toUpperCase()} RISK
                </Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-fg">{hpa.summary}</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 text-xs">
              <div className="rounded bg-surface p-3">
                <span className="font-semibold text-fg block">Tapering Strategy</span>
                <p className="mt-1 text-muted leading-relaxed">{hpa.taperRecommendation}</p>
              </div>
              <div className="rounded bg-surface p-3">
                <span className="font-semibold text-fg block">
                  {hpa.stressDoseNeeded ? "Stress-Dose Coverage Indicated" : "Stress-Dose Coverage"}
                </span>
                <p className="mt-1 text-muted leading-relaxed">{hpa.stressDoseGuidance}</p>
              </div>
            </div>

            {hpa.pjpProphylaxisNote ? (
              <div className="rounded bg-danger-soft p-2.5 text-xs text-fg leading-relaxed font-medium">
                {hpa.pjpProphylaxisNote}
              </div>
            ) : null}

            <div className="rounded bg-bg-surface p-2.5 text-xs text-muted leading-relaxed">
              <span className="font-medium text-fg">Glycemic Pattern Watch:</span> {hpa.glucoseWatch}
            </div>
          </div>
        ) : null}
      </article>

      {/* Section 3: Comparative Reference Table */}
      <article className="rounded-md bg-bg-sunken p-4">
        <h4 className="font-serif text-base tracking-tight text-fg">Comparative Glucocorticoid Reference Table</h4>
        <p className="mt-1 text-xs text-muted">
          Relative anti-inflammatory potency, mineralocorticoid effect, and biologic duration of action.
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-subtle text-muted">
                <th className="py-2 pr-3">Steroid</th>
                <th className="py-2 px-2 text-right">Eq Dose</th>
                <th className="py-2 px-2 text-right">Anti-Inflam</th>
                <th className="py-2 px-2 text-right">Mineralo</th>
                <th className="py-2 px-2">Duration</th>
                <th className="py-2 px-2">Biologic t½</th>
                <th className="py-2 pl-2">Hepatic 11β-HSD1</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle/50">
              {STEROID_AGENTS.map((agent) => (
                <tr key={agent.id} className="hover:bg-surface/50">
                  <td className="py-2 pr-3 font-sans font-medium text-fg">
                    {agent.name}
                    {agent.brandNames.length ? (
                      <span className="block text-[10px] text-muted font-normal">({agent.brandNames.join(", ")})</span>
                    ) : null}
                  </td>
                  <td className="py-2 px-2 text-right font-semibold text-fg">{agent.equivDoseMg} mg</td>
                  <td className="py-2 px-2 text-right text-fg">{agent.antiInflammatoryPotency}</td>
                  <td className="py-2 px-2 text-right text-fg">{agent.mineralocorticoidPotency}</td>
                  <td className="py-2 px-2 capitalize text-muted">{agent.durationCategory}</td>
                  <td className="py-2 px-2 text-muted">{agent.biologicHalfLifeHours}</td>
                  <td className="py-2 pl-2 text-muted">
                    {agent.hepaticConversion ? (
                      <Badge tone="warn">Prodrug</Badge>
                    ) : (
                      <Badge tone="ok">Active</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <p className="text-[11px] leading-relaxed text-subtle">
        Educational reference only. Dose conversions are approximate and do not account for individual bioavailability, formulation differences, or target organ sensitivity. Tapering schedules must be individualized based on disease activity and clinician judgment. Not a prescribing calculator.
      </p>
    </div>
  );
}

function BodyMetricsBlock({
  age,
  sex,
  scr,
  defaultWeight = 70,
}: {
  age: number;
  sex: Sex;
  scr: number;
  defaultWeight?: number;
}) {
  const [htCm, setHtCm] = useState("175");
  const [wtKg, setWtKg] = useState(String(defaultWeight));

  const metrics = bodyMetricsOf({
    heightCm: Number(htCm),
    weightKg: Number(wtKg),
    sex,
  });

  const crclComp =
    metrics && Number.isFinite(age) && Number.isFinite(scr) && scr > 0
      ? crclWeightComparisonOf({
          age,
          sex,
          scr,
          weightKg: Number(wtKg),
          heightCm: Number(htCm),
        })
      : null;

  return (
    <article className="rounded-md bg-bg-sunken px-3 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-serif text-lg tracking-tight text-fg">Body Metrics & Renal Dosing Sizing</h3>
          <p className="mt-1 text-xs text-muted">
            Devine 1974 Ideal Body Weight, Adjusted Body Weight (0.4), Mosteller / Du Bois BSA, and CrCl weight divergence.
          </p>
        </div>
        {metrics ? (
          <div className="text-right">
            <p className="font-mono text-lg text-fg">BSA {metrics.bsaMosteller} m²</p>
            <Badge tone={metrics.weightCategory === "obese" ? "warn" : metrics.weightCategory === "underweight" ? "danger" : "ok"}>
              {metrics.weightCategory === "obese"
                ? `Obese (${Math.round(metrics.weightToIbwRatio * 100)}% IBW)`
                : metrics.weightCategory === "underweight"
                  ? "Underweight (<IBW)"
                  : "Normal Weight"}
            </Badge>
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="text-xs text-muted">
          Height (cm)
          <Input className="mt-1" inputMode="decimal" value={htCm} onChange={(e) => setHtCm(e.target.value)} />
        </label>
        <label className="text-xs text-muted">
          Weight (kg)
          <Input className="mt-1" inputMode="decimal" value={wtKg} onChange={(e) => setWtKg(e.target.value)} />
        </label>
        {metrics ? (
          <>
            <div className="rounded bg-surface p-2 text-xs">
              <span className="text-[10px] text-muted block uppercase">IBW (Devine)</span>
              <span className="font-mono text-sm font-semibold text-fg">{metrics.ibwKg} kg</span>
            </div>
            <div className="rounded bg-surface p-2 text-xs">
              <span className="text-[10px] text-muted block uppercase">AdjBW (0.4)</span>
              <span className="font-mono text-sm font-semibold text-fg">{metrics.adjBwKg} kg</span>
            </div>
          </>
        ) : null}
      </div>

      {metrics ? (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted">
            <span>BMI: <strong className="text-fg">{metrics.bmi}</strong> kg/m²</span>
            <span>Mosteller BSA: <strong className="text-fg">{metrics.bsaMosteller}</strong> m²</span>
            <span>Du Bois BSA: <strong className="text-fg">{metrics.bsaDuBois}</strong> m²</span>
            <span>Height: <strong className="text-fg">{metrics.heightInches}</strong> in</span>
          </div>

          <div className="rounded bg-surface p-2.5 text-xs text-fg leading-relaxed">
            <span className="font-medium text-accent">Dosing Weight Guidance:</span> {metrics.dosingWeightAdvice}
          </div>

          {crclComp ? (
            <div className="rounded bg-surface p-2.5">
              <p className="text-xs font-semibold text-fg">Cockcroft–Gault Clearance Divergence</p>
              <div className="mt-1.5 grid grid-cols-3 gap-2 font-mono text-xs text-center">
                <div className={cn("rounded p-1.5", crclComp.recommendedWeightUsed === "actual" ? "bg-accent-soft font-bold text-fg" : "bg-bg-sunken text-muted")}>
                  <span className="text-[10px] block uppercase">Actual Wt</span>
                  <span>{crclComp.crclActual} mL/min</span>
                </div>
                <div className={cn("rounded p-1.5", crclComp.recommendedWeightUsed === "ibw" ? "bg-accent-soft font-bold text-fg" : "bg-bg-sunken text-muted")}>
                  <span className="text-[10px] block uppercase">IBW</span>
                  <span>{crclComp.crclIbw} mL/min</span>
                </div>
                <div className={cn("rounded p-1.5", crclComp.recommendedWeightUsed === "adj" ? "bg-accent-soft font-bold text-fg" : "bg-bg-sunken text-muted")}>
                  <span className="text-[10px] block uppercase">AdjBW</span>
                  <span>{crclComp.crclAdj} mL/min</span>
                </div>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{crclComp.clinicalCaveat}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">Enter valid height (100–250 cm) and weight (30–300 kg).</p>
      )}

      <p className="mt-2 text-[11px] leading-relaxed text-subtle">
        Educational sizing math. In severe obesity, Cockcroft–Gault using actual body weight markedly overestimates clearance, risking overdoses of narrow therapeutic index renally eliminated drugs. Prescribing Information guides whether product labeling specifies ABW, IBW, or AdjBW.
      </p>
    </article>
  );
}

function CalvertBlock({ defaultGfr, isHot }: { defaultGfr?: number; isHot?: boolean }) {
  const [auc, setAuc] = useState("5");
  const [gfr, setGfr] = useState(defaultGfr ? String(defaultGfr) : "80");

  useEffect(() => {
    if (defaultGfr && defaultGfr > 0) {
      setGfr(String(defaultGfr));
    }
  }, [defaultGfr]);

  const res = calvertCarboplatinOf({
    targetAuc: Number(auc),
    gfrOrCrcl: Number(gfr),
  });

  return (
    <article className={cn("rounded-md px-3 py-3", isHot ? "bg-accent-soft/60" : "bg-bg-sunken")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg tracking-tight text-fg">Calvert Formula (Carboplatin Dosing)</h3>
            {isHot ? <Badge tone="info">Platinum on tray</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-muted">
            Dose (mg) = Target AUC · (GFR + 25). Enforces FDA 125 mL/min GFR safety cap against myelosuppression.
          </p>
        </div>
        {res ? (
          <div className="text-right">
            <p className="font-mono text-lg text-fg">{res.carboplatinDoseMg} mg</p>
            <Badge tone={res.capApplied ? "danger" : "ok"}>
              {res.capApplied ? "FDA Cap Applied (125 mL/min)" : "Standard AUC Dose"}
            </Badge>
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">
          Target AUC (mg·min/mL)
          <select
            value={auc}
            onChange={(e) => setAuc(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-input bg-surface px-2 text-xs font-medium text-fg"
          >
            {[4, 5, 6, 7].map((val) => (
              <option key={val} value={val}>
                AUC {val}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          GFR / CrCl (mL/min)
          <Input className="mt-1" inputMode="decimal" value={gfr} onChange={(e) => setGfr(e.target.value)} />
        </label>
      </div>

      {res ? (
        <div className="mt-3 rounded-md bg-surface p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs font-mono sm:grid-cols-3">
            <div>
              <span className="text-muted block">Effective GFR</span>
              <span className="font-semibold text-fg">{res.effectiveGfr} mL/min</span>
            </div>
            <div>
              <span className="text-muted block">Calvert Total Dose</span>
              <span className="font-semibold text-accent">{res.carboplatinDoseMg} mg</span>
            </div>
            {res.capApplied ? (
              <div>
                <span className="text-muted block">Uncapped Dose</span>
                <span className="line-through text-danger">{res.uncappedDoseMg} mg</span>
              </div>
            ) : null}
          </div>
          <p className="text-xs leading-relaxed text-fg">{res.safetyNote}</p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">Enter valid target AUC (1–10) and GFR/CrCl (5–300 mL/min).</p>
      )}

      <p className="mt-2 text-[11px] leading-relaxed text-subtle">
        Calvert 1989. The 2010 FDA Drug Safety Communication capped GFR at 125 mL/min to prevent catastrophic thrombocytopenia and neutropenic fever in hyperfiltrating patients. Oncology regimen protocols and treating oncologist govern chemotherapy dosing.
      </p>
    </article>
  );
}

function GanzoniBlock({
  defaultWeight = 70,
  defaultSex = "female",
  isHot,
}: {
  defaultWeight?: number;
  defaultSex?: Sex;
  isHot?: boolean;
}) {
  const [actualHb, setActualHb] = useState("8.5");
  const [targetHb, setTargetHb] = useState("15.0");
  const [wt, setWt] = useState(String(defaultWeight));
  const [ht, setHt] = useState("165");
  const [sex, setSex] = useState<Sex>(defaultSex);

  const res = calculateGanzoni({
    actualHb: Number(actualHb),
    targetHb: Number(targetHb),
    weightKg: Number(wt),
    heightCm: Number(ht),
    sex,
  });

  return (
    <article className={cn("rounded-md px-3 py-3", isHot ? "bg-accent-soft/60" : "bg-bg-sunken")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg tracking-tight text-fg">Ganzoni Total Iron Deficit</h3>
            {isHot ? <Badge tone="info">Iron on tray</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-muted">
            Deficit (mg) = Weight · (Target Hb − Actual Hb) · 2.4 + 500 mg depot. Adjusted for obesity divergence.
          </p>
        </div>
        {res ? (
          <div className="text-right">
            <p className="font-mono text-lg text-fg">{res.suggestedDeficitMg} mg total</p>
            <Badge tone={res.isObese ? "warn" : "ok"}>
              {res.isObese ? "Obesity Adjusted (AdjBW)" : "Standard Adult Deficit"}
            </Badge>
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <label className="text-xs text-muted">
          Actual Hb (g/dL)
          <Input className="mt-1" inputMode="decimal" value={actualHb} onChange={(e) => setActualHb(e.target.value)} />
        </label>
        <label className="text-xs text-muted">
          Target Hb (g/dL)
          <Input className="mt-1" inputMode="decimal" value={targetHb} onChange={(e) => setTargetHb(e.target.value)} />
        </label>
        <label className="text-xs text-muted">
          Weight (kg)
          <Input className="mt-1" inputMode="decimal" value={wt} onChange={(e) => setWt(e.target.value)} />
        </label>
        <label className="text-xs text-muted">
          Height (cm)
          <Input className="mt-1" inputMode="decimal" value={ht} onChange={(e) => setHt(e.target.value)} />
        </label>
        <div className="text-xs text-muted">
          Sex
          <div className="mt-1 flex gap-1">
            {(["female", "male"] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={sex === s}
                onClick={() => setSex(s)}
                className={cn(
                  "h-9 flex-1 rounded text-xs font-medium",
                  sex === s ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
                )}
              >
                {s === "female" ? "F" : "M"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {res ? (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 font-mono text-xs">
            <div className="rounded bg-surface p-2">
              <span className="text-[10px] text-muted block uppercase">Circulating Hb Deficit</span>
              <span className="text-sm font-semibold text-fg">
                {Math.round(res.weightKg * res.hbDeficit * res.factorConstant)} mg
              </span>
            </div>
            <div className="rounded bg-surface p-2">
              <span className="text-[10px] text-muted block uppercase">Depot Iron Store</span>
              <span className="text-sm font-semibold text-fg">{res.depotIronMg} mg</span>
            </div>
            <div className="rounded bg-surface p-2">
              <span className="text-[10px] text-muted block uppercase">Simplified Matrix</span>
              <span className="text-sm font-semibold text-accent">{res.simplifiedMatrixMg} mg</span>
            </div>
            <div className="rounded bg-surface p-2">
              <span className="text-[10px] text-muted block uppercase">Recommended Deficit</span>
              <span className="text-sm font-semibold text-fg">{res.suggestedDeficitMg} mg</span>
            </div>
          </div>

          <div className="rounded bg-surface p-2.5 text-xs text-fg leading-relaxed">
            <span className="font-medium text-accent">Dosing Kinetics:</span> {res.divergenceNote}
          </div>

          <div className="rounded bg-warn-soft/40 p-2.5 text-xs text-fg leading-relaxed">
            <p className="font-semibold text-fg">Iron Overload Safety Screen:</p>
            <ul className="mt-1 list-disc pl-4 space-y-0.5 text-muted">
              {res.clinicalSafetyNotes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">Enter valid hemoglobin (3–18 g/dL) and weight (10–250 kg).</p>
      )}

      <p className="mt-2 text-[11px] leading-relaxed text-subtle">
        Ganzoni 1970 classical equation. In severe obesity, adipose tissue is poorly vascularized; unadjusted weight overestimates deficit. Modern label tables (e.g. FERINJECT / MONOFERRIC) use simplified weight/Hb tiers. Not an automated order.
      </p>
    </article>
  );
}

function DigoxinBlock({
  defaultWeight = 70,
  isHot,
}: {
  defaultWeight?: number;
  isHot?: boolean;
}) {
  const [level, setLevel] = useState("1.4");
  const [ind, setInd] = useState<"heart-failure" | "atrial-fib">("heart-failure");
  const [hours, setHours] = useState("12");
  const [wt, setWt] = useState(String(defaultWeight));

  const evalRes = evaluateDigoxinLevel(Number(level), ind, Number(hours));
  const fabRes = calculateDigifab({
    scenario: "steady-state-level",
    serumLevelNgMl: Number(level),
    weightKg: Number(wt),
  });

  return (
    <article className={cn("rounded-md px-3 py-3", isHot ? "bg-accent-soft/60" : "bg-bg-sunken")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg tracking-tight text-fg">Serum Digoxin & DigiFab Sizing</h3>
            {isHot ? <Badge tone="info">Digoxin on tray</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-muted">
            TDM window (DIG trial 0.5–0.9 ng/mL vs AF rate control) and DigiFab stoichiometry (SDC · Wt / 100).
          </p>
        </div>
        {evalRes ? (
          <div className="text-right">
            <p className="font-mono text-lg text-fg">{evalRes.levelNgMl} ng/mL</p>
            <Badge tone={evalRes.band === "toxic" ? "danger" : evalRes.band === "elevated" || evalRes.band === "distribution-warning" ? "warn" : evalRes.band === "subtherapeutic" ? "info" : "ok"}>
              {evalRes.label}
            </Badge>
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="text-xs text-muted">
          Serum Level (ng/mL)
          <Input className="mt-1" inputMode="decimal" value={level} onChange={(e) => setLevel(e.target.value)} />
        </label>
        <label className="text-xs text-muted">
          Hours Post-Dose
          <Input className="mt-1" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} />
        </label>
        <label className="text-xs text-muted">
          Patient Weight (kg)
          <Input className="mt-1" inputMode="decimal" value={wt} onChange={(e) => setWt(e.target.value)} />
        </label>
        <div className="text-xs text-muted">
          Clinical Indication
          <div className="mt-1 flex gap-1">
            {(["heart-failure", "atrial-fib"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={ind === mode}
                onClick={() => setInd(mode)}
                className={cn(
                  "h-9 flex-1 rounded text-xs font-medium",
                  ind === mode ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
                )}
              >
                {mode === "heart-failure" ? "HF" : "AF"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div className={cn("rounded-md p-2.5 text-xs", evalRes.band === "toxic" ? "bg-danger-soft text-fg" : evalRes.band === "elevated" ? "bg-warn-soft text-fg" : "bg-surface text-muted")}>
          <p className="font-semibold text-fg">{evalRes.label}</p>
          <p className="mt-0.5 leading-relaxed">{evalRes.clinicalMeaning}</p>
          {evalRes.mortalityNote ? (
            <p className="mt-1 text-danger font-medium">{evalRes.mortalityNote}</p>
          ) : null}
          {evalRes.samplingTimingWarning ? (
            <p className="mt-1 text-warn font-medium">{evalRes.samplingTimingWarning}</p>
          ) : null}
        </div>

        {evalRes.band === "toxic" || Number(level) >= 2.0 ? (
          <div className="rounded-md bg-surface p-2.5 text-xs space-y-1.5">
            <div className="flex flex-wrap justify-between items-baseline gap-1">
              <span className="font-semibold text-fg">DigiFab Stoichiometry Estimate:</span>
              <span className="font-mono text-sm font-bold text-accent">{fabRes.vialsRounded} vial{fabRes.vialsRounded > 1 ? "s" : ""} (~{fabRes.mgDigoxinBound} mg bound)</span>
            </div>
            <p className="font-mono text-[11px] text-muted">{fabRes.formulaString}</p>
            <p className="text-[11px] leading-relaxed text-danger font-medium">{fabRes.reboundHypokalemiaAlert}</p>
            <p className="text-[11px] leading-relaxed text-subtle">{fabRes.postFabImmunoassayAlert}</p>
          </div>
        ) : null}
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-subtle">
        Educational reference only. Early levels (&lt;6–8 hours) reflect distribution and overestimate toxicity. Post-Fab total digoxin immunoassay levels are uninterpretable for 5–7 days. Prescribing Information and medical toxicology consultation govern.
      </p>
    </article>
  );
}

function ApapPanel({ ids }: { ids: string[] }) {
  const [hours, setHours] = useState("8");
  const [level, setLevel] = useState("120");
  const [chronicAlc, setChronicAlc] = useState(false);
  const [fasting, setFasting] = useState(false);

  // King's College state
  const [phLow, setPhLow] = useState(false);
  const [enceph, setEnceph] = useState(false);
  const [crHigh, setCrHigh] = useState(false);
  const [inrHigh, setInrHigh] = useState(false);
  const [lactateHigh, setLactateHigh] = useState(false);

  const nomo = evaluateRumackMatthew({
    hoursPostIngestion: Number(hours),
    serumApapUgMl: Number(level),
    chronicAlcoholOrInducer: chronicAlc,
    malnutritionOrFasting: fasting,
  });

  const kings = evaluateKingsCollege({
    arterialPhUnder730: phLow,
    encephalopathyGrade3Or4: enceph,
    serumCreatinineOver34: crHigh,
    inrOver65: inrHigh,
    lactateOver3AfterResuscitation: lactateHigh,
  });

  const hasApap = ids.includes("acetaminophen");
  const hasNac = ids.includes("nac");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-serif text-lg tracking-tight text-fg">Acetaminophen Toxicology & NAC Station</h3>
          <p className="mt-1 text-xs text-muted">
            Rumack-Matthew Nomogram, N-acetylcysteine kinetics, and King's College transplant criteria.
          </p>
        </div>
        <div className="flex gap-1.5">
          {hasApap ? <Badge tone="danger">Acetaminophen on tray</Badge> : null}
          {hasNac ? <Badge tone="ok">NAC on tray</Badge> : null}
        </div>
      </div>

      {/* Section 1: Rumack-Matthew Nomogram */}
      <article className="rounded-md bg-bg-sunken p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h4 className="font-serif text-base tracking-tight text-fg">Rumack-Matthew Nomogram Evaluator</h4>
            <p className="mt-0.5 text-xs text-muted">
              Single acute ingestion between 4 and 24 hours. Evaluated against 150-treatment line and 300-high risk line.
            </p>
          </div>
          {nomo ? (
            <Badge tone={nomo.nacIndicated ? "danger" : nomo.band === "too-early" ? "warn" : "ok"}>
              {nomo.label}
            </Badge>
          ) : null}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-muted">
            Hours Post-Ingestion (4–24h)
            <Input className="mt-1" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            Serum APAP (µg/mL)
            <Input className="mt-1" inputMode="decimal" value={level} onChange={(e) => setLevel(e.target.value)} />
          </label>
          <div className="text-xs text-muted">
            Chronic Alcohol / 2E1 Inducer
            <button
              type="button"
              aria-pressed={chronicAlc}
              onClick={() => setChronicAlc((v) => !v)}
              className={cn(
                "mt-1 flex h-9 w-full items-center justify-center rounded text-xs font-medium",
                chronicAlc ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
              )}
            >
              {chronicAlc ? "Induction / GSH Depleted" : "No Inducer"}
            </button>
          </div>
          <div className="text-xs text-muted">
            Malnutrition / Fasting
            <button
              type="button"
              aria-pressed={fasting}
              onClick={() => setFasting((v) => !v)}
              className={cn(
                "mt-1 flex h-9 w-full items-center justify-center rounded text-xs font-medium",
                fasting ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
              )}
            >
              {fasting ? "GSH Depleted (<30%)" : "Normal Nutrition"}
            </button>
          </div>
        </div>

        {nomo ? (
          <div className="mt-4 space-y-3">
            <div className={cn("rounded-md p-3", toneClass(nomo.nacIndicated ? "danger" : nomo.band === "too-early" ? "warn" : "ok"))}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-fg">{nomo.label}</span>
                {nomo.treatmentLineUgMl !== null ? (
                  <span className="font-mono text-xs">
                    150-Line Cut: {nomo.treatmentLineUgMl} µg/mL | High-Risk Cut: {nomo.highRiskLineUgMl} µg/mL
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-fg">{nomo.nacUrgency}</p>
              <p className="mt-1 text-xs leading-relaxed text-fg/90">{nomo.clinicalGuidance}</p>
            </div>

            {nomo.riskModifiers.length ? (
              <div className="rounded bg-warn-soft p-2.5 text-xs text-fg leading-relaxed">
                <span className="font-semibold block">Risk Modifiers Active:</span>
                {nomo.riskModifiers.map((m, i) => (
                  <p key={i}>• {m}</p>
                ))}
              </div>
            ) : null}

            <p className="text-xs leading-relaxed text-muted font-mono">{nomo.toxicologyPearl}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Enter hours (0–168) and APAP level (0–2500 µg/mL).</p>
        )}
      </article>

      {/* Section 2: NAC Regimens Comparison */}
      <article className="rounded-md bg-bg-sunken p-4">
        <h4 className="font-serif text-base tracking-tight text-fg">N-Acetylcysteine (NAC) Dosing Regimens & Kinetics</h4>
        <p className="mt-1 text-xs text-muted">
          Replenishes hepatic glutathione (GSH) reserves and detoxifies reactive NAPQI metabolites.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {NAC_REGIMENS.map((reg) => (
            <div key={reg.name} className="rounded-md bg-surface p-3 flex flex-col justify-between">
              <div>
                <h5 className="font-semibold text-sm text-fg">{reg.name}</h5>
                <span className="font-mono text-xs text-accent block mt-0.5">
                  Total {reg.totalDoseMgKg} mg/kg over {reg.durationHours}h
                </span>
                <ul className="mt-2 space-y-1.5 text-xs">
                  {reg.steps.map((st) => (
                    <li key={st.phase} className="rounded bg-bg-sunken p-1.5">
                      <span className="font-medium text-fg block">{st.phase} ({st.doseMgKg} mg/kg)</span>
                      <span className="text-[11px] text-muted block leading-tight">{st.rateNote}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted border-t border-subtle/50 pt-1.5">
                {reg.pearl}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded bg-surface p-3 text-xs leading-relaxed text-fg">
          <span className="font-semibold text-accent block">Non-Allergic Anaphylactoid Reactions (NAAR):</span>
          Flushing, pruritus, and urticaria occur in 10–20% of patients during IV loading due to rate-dependent non-IgE histamine release. Standard protocol: temporarily pause infusion, administer diphenhydramine (25–50 mg IV), and resume infusion at a 50% reduced rate once symptoms clear. Do NOT permanently discontinue NAC for cutaneous reactions.
        </div>
      </article>

      {/* Section 3: King's College Criteria */}
      <article className="rounded-md bg-bg-sunken p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h4 className="font-serif text-base tracking-tight text-fg">King's College Criteria (Transplant Urgency)</h4>
            <p className="mt-0.5 text-xs text-muted">
              Prognostic criteria for emergency liver transplant evaluation in acetaminophen-induced acute liver failure.
            </p>
          </div>
          <Badge tone={kings.meetsCriteria ? "danger" : "ok"}>
            {kings.meetsCriteria ? "CRITERIA MET (High Mortality)" : "Criteria Not Met"}
          </Badge>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <button
            type="button"
            aria-pressed={phLow}
            onClick={() => setPhLow((v) => !v)}
            className={cn(
              "flex h-auto min-h-11 items-center justify-between rounded p-2.5 text-left text-xs font-medium",
              phLow ? "bg-danger-soft text-fg" : "bg-surface text-muted hover:text-fg",
            )}
          >
            <span>Arterial pH &lt; 7.30 (post-fluids)</span>
            {phLow ? <CheckSquare className="size-4 shrink-0 text-danger" /> : <Square className="size-4 shrink-0 text-muted" />}
          </button>

          <button
            type="button"
            aria-pressed={enceph}
            onClick={() => setEnceph((v) => !v)}
            className={cn(
              "flex h-auto min-h-11 items-center justify-between rounded p-2.5 text-left text-xs font-medium",
              enceph ? "bg-danger-soft text-fg" : "bg-surface text-muted hover:text-fg",
            )}
          >
            <span>Encephalopathy Grade 3 or 4</span>
            {enceph ? <CheckSquare className="size-4 shrink-0 text-danger" /> : <Square className="size-4 shrink-0 text-muted" />}
          </button>

          <button
            type="button"
            aria-pressed={crHigh}
            onClick={() => setCrHigh((v) => !v)}
            className={cn(
              "flex h-auto min-h-11 items-center justify-between rounded p-2.5 text-left text-xs font-medium",
              crHigh ? "bg-danger-soft text-fg" : "bg-surface text-muted hover:text-fg",
            )}
          >
            <span>Serum Creatinine &gt; 3.4 mg/dL</span>
            {crHigh ? <CheckSquare className="size-4 shrink-0 text-danger" /> : <Square className="size-4 shrink-0 text-muted" />}
          </button>

          <button
            type="button"
            aria-pressed={inrHigh}
            onClick={() => setInrHigh((v) => !v)}
            className={cn(
              "flex h-auto min-h-11 items-center justify-between rounded p-2.5 text-left text-xs font-medium",
              inrHigh ? "bg-danger-soft text-fg" : "bg-surface text-muted hover:text-fg",
            )}
          >
            <span>INR &gt; 6.5 (PT &gt; 100 s)</span>
            {inrHigh ? <CheckSquare className="size-4 shrink-0 text-danger" /> : <Square className="size-4 shrink-0 text-muted" />}
          </button>

          <button
            type="button"
            aria-pressed={lactateHigh}
            onClick={() => setLactateHigh((v) => !v)}
            className={cn(
              "flex h-auto min-h-11 items-center justify-between rounded p-2.5 text-left text-xs font-medium sm:col-span-2 lg:col-span-2",
              lactateHigh ? "bg-danger-soft text-fg" : "bg-surface text-muted hover:text-fg",
            )}
          >
            <span>Arterial Lactate &gt; 3.0 mmol/L (post-resuscitation at 12h)</span>
            {lactateHigh ? <CheckSquare className="size-4 shrink-0 text-danger" /> : <Square className="size-4 shrink-0 text-muted" />}
          </button>
        </div>

        <div className={cn("mt-3 rounded-md p-3", toneClass(kings.meetsCriteria ? "danger" : "ok"))}>
          <p className="text-sm font-semibold text-fg">{kings.summary}</p>
          <p className="mt-1 text-xs leading-relaxed text-fg">{kings.reason}</p>
          <p className="mt-1 text-xs leading-relaxed text-accent font-medium">{kings.urgency}</p>
        </div>
      </article>

      <p className="text-[11px] leading-relaxed text-subtle">
        Educational toxicology reference. Nomogram applies strictly to acute single ingestions with known time. Chronic supratherapeutic ingestion, staggered ingestions, or unknown time of ingestion require direct clinical consultation with a regional Poison Control Center (1-800-222-1222 in US) or medical toxicologist.
      </p>
    </div>
  );
}

function IronPanel({ ids }: { ids: string[] }) {
  const [actualHb, setActualHb] = useState("8.5");
  const [targetHb, setTargetHb] = useState("15.0");
  const [wt, setWt] = useState("70");
  const [ht, setHt] = useState("165");
  const [sex, setSex] = useState<Sex>("female");

  const ganzoni = calculateGanzoni({
    actualHb: Number(actualHb),
    targetHb: Number(targetHb),
    weightKg: Number(wt),
    heightCm: Number(ht),
    sex,
  });

  const report = ironReportOnDesk(ids);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-serif text-lg tracking-tight text-fg">Parenteral Iron Sizing & Ganzoni Kinetics</h3>
          <p className="mt-1 text-xs text-muted">
            Ganzoni formula deficit math, formulation comparative kinetics, test-dose protocols, and FGF23 hypophosphatemia.
          </p>
        </div>
        <Badge tone="info">{report.headline}</Badge>
      </div>

      {report.items.length > 0 ? (
        <div className="rounded-md bg-accent-soft/40 p-3 space-y-2">
          {report.items.map((it, idx) => (
            <div key={idx} className={cn("rounded p-2 text-xs", it.warning ? "bg-warn-soft text-fg" : "bg-surface text-muted")}>
              <span className="font-semibold text-fg block">{it.title}</span>
              <p className="mt-0.5 leading-relaxed">{it.detail}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Section 1: Interactive Ganzoni Sizing Station */}
      <article className="rounded-md bg-bg-sunken p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h4 className="font-serif text-base tracking-tight text-fg">Ganzoni Iron Deficit Calculator</h4>
            <p className="mt-0.5 text-xs text-muted">
              Weight (kg) · (Target Hb − Actual Hb) · 2.4 + Depot (500 mg). Compared with European/US fixed-dose tiers.
            </p>
          </div>
          {ganzoni ? (
            <div className="text-right">
              <span className="font-mono text-lg font-semibold text-fg">{ganzoni.suggestedDeficitMg} mg</span>
              <span className="text-[11px] text-muted block">Deficit with depot</span>
            </div>
          ) : null}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs text-muted">
            Actual Hb (g/dL)
            <Input className="mt-1" inputMode="decimal" value={actualHb} onChange={(e) => setActualHb(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            Target Hb (g/dL)
            <Input className="mt-1" inputMode="decimal" value={targetHb} onChange={(e) => setTargetHb(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            Weight (kg)
            <Input className="mt-1" inputMode="decimal" value={wt} onChange={(e) => setWt(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            Height (cm)
            <Input className="mt-1" inputMode="decimal" value={ht} onChange={(e) => setHt(e.target.value)} />
          </label>
          <div className="text-xs text-muted">
            Biological Sex
            <div className="mt-1 flex gap-1">
              {(["female", "male"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={sex === s}
                  onClick={() => setSex(s)}
                  className={cn(
                    "h-9 flex-1 rounded text-xs font-medium",
                    sex === s ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
                  )}
                >
                  {s === "female" ? "Female" : "Male"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {ganzoni ? (
          <div className="mt-4 space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-md bg-surface p-3">
                <span className="text-[11px] text-muted block">Raw Ganzoni (ABW)</span>
                <span className="font-mono text-lg font-semibold text-fg">{ganzoni.rawDeficitMg} mg</span>
                <span className="text-[10px] text-muted block mt-0.5">Unadjusted body weight</span>
              </div>
              <div className="rounded-md bg-surface p-3">
                <span className="text-[11px] text-muted block">Adjusted Deficit (AdjBW)</span>
                <span className="font-mono text-lg font-semibold text-accent">
                  {ganzoni.suggestedDeficitMg} mg
                </span>
                <span className="text-[10px] text-muted block mt-0.5">
                  {ganzoni.isObese ? "Corrected for adiposity" : "Identical to standard"}
                </span>
              </div>
              <div className="rounded-md bg-surface p-3">
                <span className="text-[11px] text-muted block">Simplified Tier Matrix</span>
                <span className="font-mono text-lg font-semibold text-fg">{ganzoni.simplifiedMatrixMg} mg</span>
                <span className="text-[10px] text-muted block mt-0.5">Fixed 1000–1500 mg label tier</span>
              </div>
            </div>

            <p className="rounded bg-surface p-2.5 text-xs text-fg leading-relaxed">
              {ganzoni.divergenceNote}
            </p>
          </div>
        ) : null}
      </article>

      {/* Section 2: Formulations Comparative Reference Table */}
      <article className="rounded-md bg-bg-sunken p-4">
        <h4 className="font-serif text-base tracking-tight text-fg">Parenteral Iron Formulations Reference</h4>
        <p className="mt-1 text-xs text-muted">
          Elemental iron concentration, maximum single infusion dose, test-dose mandates, and FGF23 hypophosphatemia.
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-subtle text-muted">
                <th className="py-2 pr-3">Formulation</th>
                <th className="py-2 px-2 text-right">Iron Conc</th>
                <th className="py-2 px-2 text-right">Max Dose</th>
                <th className="py-2 px-2">Time</th>
                <th className="py-2 px-2">Test Dose</th>
                <th className="py-2 px-2">FGF23 Risk</th>
                <th className="py-2 pl-2">Boxed Warning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle/50">
              {Object.values(IRON_FORMULATIONS).map((f) => (
                <tr key={f.id} className="hover:bg-surface/50">
                  <td className="py-2 pr-3 font-sans font-medium text-fg">
                    {f.name}
                    <span className="block text-[10px] text-muted font-normal">({f.brand})</span>
                  </td>
                  <td className="py-2 px-2 text-right text-fg">{f.elementalIronMgPerMl} mg/mL</td>
                  <td className="py-2 px-2 text-right font-semibold text-fg">{f.maxSingleDoseMg} mg</td>
                  <td className="py-2 px-2 text-muted">{f.infusionTimeMin} min</td>
                  <td className="py-2 px-2">
                    {f.testDoseRequired ? (
                      <Badge tone="danger">Mandatory 25 mg</Badge>
                    ) : (
                      <span className="text-muted">None</span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <Badge tone={f.fgf23HypophosphatemiaRisk === "high" ? "danger" : f.fgf23HypophosphatemiaRisk === "low" ? "ok" : "info"}>
                      {f.fgf23HypophosphatemiaRisk}
                    </Badge>
                  </td>
                  <td className="py-2 pl-2">
                    {f.boxedWarning ? (
                      <Badge tone="danger">Black Box</Badge>
                    ) : (
                      <span className="text-muted">None</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {/* Section 3: Deep Clinical Pearls */}
      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-md bg-bg-sunken p-3.5">
          <h5 className="font-serif text-sm font-semibold text-fg">Oral vs IV Iron & Hepcidin Dynamics</h5>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Oral iron stimulates hepatic hepcidin synthesis for up to 48 hours, blocking duodenal ferroportin. Alternate-day oral dosing maximizes fractional absorption. IV iron bypasses hepcidin mucosal block and is preferred in malabsorption, celiac disease, bariatric anatomy, active IBD, hemodialysis, and heart failure (HFrEF NYHA II/III with ferritin &lt; 100 ng/mL or 100–300 with TSAT &lt; 20%).
          </p>
        </article>

        <article className="rounded-md bg-bg-sunken p-3.5">
          <h5 className="font-serif text-sm font-semibold text-fg">Infusion Reactions (Fishbane Reactions)</h5>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Acute chest/back tightness, flushing, and joint discomfort during rapid infusion usually represent complement activation-related pseudoallergy (CARPA) or labile free iron, NOT true IgE-mediated anaphylaxis. Stopping the infusion for 15 minutes and resuming at a slower rate resolves &gt;90% of mild reactions without antihistamines or epinephrine.
          </p>
        </article>
      </div>

      <p className="text-[11px] leading-relaxed text-subtle">
        Educational clinical pharmacology reference. Not a prescribing order or therapeutic protocol. Always verify individual institutional infusion policies, patient ferritin/TSAT levels, and official Prescribing Information prior to ordering parenteral iron.
      </p>
    </div>
  );
}

function DigoxinPanel({ ids }: { ids: string[] }) {
  const [scenario, setScenario] = useState<"steady-state-level" | "acute-dose" | "empiric-arrest">("steady-state-level");
  const [level, setLevel] = useState("3.5");
  const [ingestedMg, setIngestedMg] = useState("10");
  const [wt, setWt] = useState("70");
  const [ind, setInd] = useState<"heart-failure" | "atrial-fib">("heart-failure");
  const [arrestType, setArrestType] = useState<"acute" | "chronic">("acute");

  const evalRes = evaluateDigoxinLevel(Number(level), ind);
  const fabRes = calculateDigifab({
    scenario,
    serumLevelNgMl: Number(level),
    ingestedDoseMg: Number(ingestedMg),
    weightKg: Number(wt),
    indication: arrestType,
  });

  const report = digoxinReportOnDesk(ids);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-serif text-lg tracking-tight text-fg">Digoxin Pharmacokinetics & DigiFab Sizing</h3>
          <p className="mt-1 text-xs text-muted">
            TDM windows, P-gp collision reductions, electrolyte sensitizers, and DigiFab reversal stoichiometry.
          </p>
        </div>
        <Badge tone="info">{report.headline}</Badge>
      </div>

      {report.items.length > 0 ? (
        <div className="rounded-md bg-accent-soft/40 p-3 space-y-2">
          {report.items.map((it, idx) => (
            <div key={idx} className={cn("rounded p-2 text-xs", it.warning ? "bg-warn-soft text-fg" : "bg-surface text-muted")}>
              <span className="font-semibold text-fg block">{it.title}</span>
              <p className="mt-0.5 leading-relaxed">{it.detail}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Section 1: Interactive DigiFab Sizing Calculator */}
      <article className="rounded-md bg-bg-sunken p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h4 className="font-serif text-base tracking-tight text-fg">DigiFab (Digoxin Immune Fab) Calculator</h4>
            <p className="mt-0.5 text-xs text-muted">
              Choose clinical presentation: known acute ingestion, steady-state SDC nomogram, or empiric arrest.
            </p>
          </div>
          <div className="text-right">
            <span className="font-mono text-lg font-semibold text-fg">{fabRes.vialsRounded} vial{fabRes.vialsRounded > 1 ? "s" : ""}</span>
            <span className="text-[11px] text-muted block">({fabRes.mgDigoxinBound} mg bound)</span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {([
            { id: "steady-state-level", label: "Steady-State Level (SDC)" },
            { id: "acute-dose", label: "Known Acute Dose (mg)" },
            { id: "empiric-arrest", label: "Empiric / Cardiac Arrest" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={scenario === tab.id}
              onClick={() => setScenario(tab.id)}
              className={cn(
                "h-8 rounded-full px-3 text-xs font-medium",
                scenario === tab.id ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {scenario === "steady-state-level" ? (
            <>
              <label className="text-xs text-muted">
                Serum Digoxin (ng/mL)
                <Input className="mt-1" inputMode="decimal" value={level} onChange={(e) => setLevel(e.target.value)} />
              </label>
              <label className="text-xs text-muted">
                Patient Weight (kg)
                <Input className="mt-1" inputMode="decimal" value={wt} onChange={(e) => setWt(e.target.value)} />
              </label>
              <div className="text-xs text-muted">
                Baseline Indication
                <div className="mt-1 flex gap-1">
                  {(["heart-failure", "atrial-fib"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={ind === m}
                      onClick={() => setInd(m)}
                      className={cn(
                        "h-9 flex-1 rounded text-xs font-medium",
                        ind === m ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
                      )}
                    >
                      {m === "heart-failure" ? "HF" : "AF"}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {scenario === "acute-dose" ? (
            <label className="text-xs text-muted">
              Estimated Ingested Dose (mg)
              <Input className="mt-1" inputMode="decimal" value={ingestedMg} onChange={(e) => setIngestedMg(e.target.value)} />
            </label>
          ) : null}

          {scenario === "empiric-arrest" ? (
            <div className="text-xs text-muted">
              Overdose Presentation
              <div className="mt-1 flex gap-1">
                {(["acute", "chronic"] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={arrestType === a}
                    onClick={() => setArrestType(a)}
                    className={cn(
                      "h-9 flex-1 rounded text-xs font-medium",
                      arrestType === a ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
                    )}
                  >
                    {a === "acute" ? "Acute Ingestion" : "Chronic Toxicity"}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {scenario === "steady-state-level" ? (
          <div className={cn("mt-3 rounded p-2.5 text-xs", evalRes.band === "toxic" ? "bg-danger-soft text-fg" : evalRes.band === "elevated" ? "bg-warn-soft text-fg" : "bg-surface text-muted")}>
            <span className="font-semibold block">{evalRes.label}</span>
            <p className="mt-0.5 leading-relaxed">{evalRes.clinicalMeaning}</p>
            {evalRes.mortalityNote ? <p className="mt-0.5 text-danger font-medium">{evalRes.mortalityNote}</p> : null}
          </div>
        ) : null}

        <div className="mt-4 space-y-2 rounded-md bg-surface p-3 text-xs">
          <div className="flex flex-wrap justify-between gap-1">
            <span className="font-semibold text-fg">Method: {fabRes.calculationMethod}</span>
            <span className="font-mono text-accent font-semibold">{fabRes.vialsRecommended} vials ({fabRes.vialsRounded} rounded)</span>
          </div>
          <p className="font-mono text-[11px] text-muted">{fabRes.formulaString}</p>
          <div className="rounded bg-danger-soft/60 p-2 text-fg">
            <span className="font-semibold block">Rebound Hypokalemia Alert:</span>
            <p className="mt-0.5 leading-relaxed">{fabRes.reboundHypokalemiaAlert}</p>
          </div>
          <div className="rounded bg-warn-soft/40 p-2 text-fg">
            <span className="font-semibold block">Post-Fab Immunoassay Trap:</span>
            <p className="mt-0.5 leading-relaxed">{fabRes.postFabImmunoassayAlert}</p>
          </div>
        </div>
      </article>

      {/* Section 2: P-gp Interactor Reference */}
      <article className="rounded-md bg-bg-sunken p-4">
        <h4 className="font-serif text-base tracking-tight text-fg">P-Glycoprotein (P-gp) Perpetrator Collisions</h4>
        <p className="mt-1 text-xs text-muted">
          P-gp inhibitors reduce renal and biliary digoxin clearance by 30–50%, prompting labeled dose reductions.
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-subtle text-muted">
                <th className="py-2 pr-3">Perpetrator Drug</th>
                <th className="py-2 px-2 text-right">Empiric Cut</th>
                <th className="py-2 pl-3">Mechanism & Clinical Caution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle/50">
              {DIGOXIN_PGP_INTERACTORS.map((p) => (
                <tr key={p.id} className="hover:bg-surface/50">
                  <td className="py-2 pr-3 font-sans font-medium text-fg">{p.name}</td>
                  <td className="py-2 px-2 text-right font-semibold text-danger">−{p.reductionPct}%</td>
                  <td className="py-2 pl-3 text-muted">{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {/* Section 3: Deep Pearls */}
      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-md bg-bg-sunken p-3.5">
          <h5 className="font-serif text-sm font-semibold text-fg">Electrolyte Sensitizers & Arrhythmogenesis</h5>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Hypokalemia facilitates digoxin binding to Na+/K+-ATPase, precipitating severe toxicity at "therapeutic" levels. Hypomagnesemia prevents intracellular potassium retention and inhibits the pump. Hypercalcemia compounds intracellular calcium overload, creating delayed afterdepolarizations (DADs) and ventricular ectopy. Always normalize K+ and Mg2+ before concluding an SDC is safe.
          </p>
        </article>
        <article className="rounded-md bg-bg-sunken p-3.5">
          <h5 className="font-serif text-sm font-semibold text-fg">DIG Trial Mortality Inflection</h5>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Historical laboratory references cited 0.8–2.0 ng/mL as "normal." The landmark DIG trial demonstrated that in heart failure, SDC 0.5–0.9 ng/mL reduced hospitalizations and improved functional class, whereas SDC ≥1.2 ng/mL independently increased all-cause mortality across all subgroups.
          </p>
        </article>
      </div>

      <p className="text-[11px] leading-relaxed text-subtle">
        Educational reference only. Does not replace regional poison control center guidance (1-800-222-1222 in US) or medical toxicologist consultation for acute poisoning.
      </p>
    </div>
  );
}

function PhenobarbitalBlock({ isHot, defaultWeight }: { isHot?: boolean; defaultWeight?: number }) {
  const [wt, setWt] = useState(defaultWeight && defaultWeight > 0 ? String(defaultWeight) : "70");
  const [ind, setInd] = useState<PhenobarbitalIndication>("alcohol-withdrawal");
  const [curr, setCurr] = useState("0");
  const [target, setTarget] = useState("20");

  useEffect(() => {
    if (defaultWeight && defaultWeight > 0) {
      setWt(String(defaultWeight));
    }
  }, [defaultWeight]);

  const res = calculatePhenobarbitalLoading({
    weightKg: Number(wt),
    indication: ind,
    currentLevelUgMl: Number(curr),
    targetLevelUgMl: Number(target),
  });

  return (
    <article className={cn("rounded-md px-3 py-3", isHot ? "bg-accent-soft/60" : "bg-bg-sunken")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg tracking-tight text-fg">Phenobarbital Loading & Elimination</h3>
            {isHot ? <Badge tone="info">Barbiturate on tray</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-muted">
            AWS built-in taper, status epilepticus loading velocity, and urinary alkalinization ion trapping.
          </p>
        </div>
        {res ? (
          <div className="text-right">
            <p className="font-mono text-lg font-semibold text-fg">{res.loadingDoseMg} mg ({res.loadingDoseMgPerKg} mg/kg)</p>
            <span className="font-mono text-xs text-muted">Min infusion {res.minInfusionDurationMinutes} min (≤60 mg/min)</span>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex gap-1">
        {(["alcohol-withdrawal", "status-epilepticus", "maintenance-tdm"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={ind === mode}
            onClick={() => {
              setInd(mode);
              if (mode === "status-epilepticus") setTarget("25");
              else setTarget("20");
            }}
            className={cn(
              "h-8 rounded px-2.5 text-xs font-medium",
              ind === mode ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
            )}
          >
            {mode === "alcohol-withdrawal" ? "Alcohol Withdrawal (AWS)" : mode === "status-epilepticus" ? "Status Epilepticus" : "Maintenance / TDM"}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="text-xs text-muted">
          Patient Weight (kg)
          <Input className="mt-1" inputMode="decimal" value={wt} onChange={(e) => setWt(e.target.value)} />
        </label>
        <label className="text-xs text-muted">
          Current Level (µg/mL)
          <Input className="mt-1" inputMode="decimal" value={curr} onChange={(e) => setCurr(e.target.value)} />
        </label>
        <label className="text-xs text-muted">
          Target Level (µg/mL)
          <Input className="mt-1" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
        </label>
        <div className="text-xs text-muted">
          Max Infusion Velocity
          <div className="mt-1 flex h-9 items-center rounded border border-input bg-surface px-2.5 font-mono text-xs text-fg">
            60 mg/min (adult cap)
          </div>
        </div>
      </div>

      {res ? (
        <div className="mt-3 space-y-2">
          <div className="rounded-md bg-surface p-2.5 text-xs text-fg">
            <p className="font-semibold">{res.indicationGuidance}</p>
            <p className="mt-1 font-mono text-[11px] text-danger">{res.propyleneGlycolAlert}</p>
          </div>
          <p className="text-[11px] leading-relaxed text-muted">{res.builtInTaperPearl}</p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">Enter valid weight (20–300 kg) and target level (5–60 µg/mL).</p>
      )}

      <p className="mt-2 text-[11px] leading-relaxed text-subtle">
        Educational reference only. Propylene glycol solvent limits infusion rate to ≤60 mg/min. For urinary alkalinization and detailed Henderson-Hasselbalch ion-trapping kinetics, open the Phenobarb tab.
      </p>
    </article>
  );
}

function PhenobarbitalPanel({ ids }: { ids: string[] }) {
  // Loading station state
  const [ind, setInd] = useState<PhenobarbitalIndication>("alcohol-withdrawal");
  const [wt, setWt] = useState("70");
  const [curr, setCurr] = useState("0");
  const [target, setTarget] = useState("20");
  const [vd, setVd] = useState("0.6");

  // Elimination station state
  const [serumLvl, setSerumLvl] = useState("65");
  const [basePh, setBasePh] = useState("6.0");
  const [alkPh, setAlkPh] = useState("7.8");

  const report = phenobarbitalReportOnDesk(ids);

  const loadRes = calculatePhenobarbitalLoading({
    weightKg: Number(wt),
    indication: ind,
    currentLevelUgMl: Number(curr),
    targetLevelUgMl: Number(target),
    vdLPerKg: Number(vd),
  });

  const elimRes = calculatePhenobarbitalElimination({
    serumLevelUgMl: Number(serumLvl),
    baselineUrinePh: Number(basePh),
    alkalinizedUrinePh: Number(alkPh),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-serif text-lg tracking-tight text-fg">Phenobarbital Pharmacokinetics & Elimination Station</h3>
          <p className="mt-1 text-xs text-muted">
            AWS loading & built-in auto-taper kinetics, Status Epilepticus loading velocity, and Henderson-Hasselbalch urinary alkalinization ion trapping.
          </p>
        </div>
        <div className="flex gap-1.5">
          {report.hasPhenobarbital ? <Badge tone="danger">Phenobarbital on tray</Badge> : null}
          {report.hasPrimidone ? <Badge tone="warn">Primidone on tray (CYP2C19 prodrug)</Badge> : null}
        </div>
      </div>

      {report.broadInductionSummary ? (
        <div className="rounded-md border border-warn/30 bg-warn-soft/40 p-3 text-xs leading-relaxed text-fg">
          <span className="font-semibold block text-fg">Pan-CYP Induction Warning:</span>
          {report.broadInductionSummary}
          {report.primidoneProdrugNote ? (
            <p className="mt-1 font-mono text-[11px] text-muted">{report.primidoneProdrugNote}</p>
          ) : null}
        </div>
      ) : null}

      {/* Section 1: Loading Dose & Infusion Kinetics */}
      <article className="rounded-md bg-bg-sunken p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h4 className="font-serif text-base tracking-tight text-fg">Loading Dose & Infusion Velocity Station</h4>
            <p className="mt-0.5 text-xs text-muted">
              Target serum level calculation with strict 60 mg/min rate limit to avoid propylene glycol solvent toxicity.
            </p>
          </div>
          {loadRes ? (
            <span className="font-mono text-sm font-bold text-accent">
              {loadRes.loadingDoseMg} mg ({loadRes.loadingDoseMgPerKg} mg/kg)
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex gap-1">
          {(["alcohol-withdrawal", "status-epilepticus", "maintenance-tdm"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={ind === mode}
              onClick={() => {
                setInd(mode);
                if (mode === "status-epilepticus") setTarget("25");
                else setTarget("20");
              }}
              className={cn(
                "h-8 rounded px-3 text-xs font-medium",
                ind === mode ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
              )}
            >
              {mode === "alcohol-withdrawal" ? "Alcohol Withdrawal (AWS)" : mode === "status-epilepticus" ? "Status Epilepticus" : "Maintenance / TDM"}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs text-muted">
            Patient Weight (kg)
            <Input className="mt-1" inputMode="decimal" value={wt} onChange={(e) => setWt(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            Current Level (µg/mL)
            <Input className="mt-1" inputMode="decimal" value={curr} onChange={(e) => setCurr(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            Target Level (µg/mL)
            <Input className="mt-1" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            Volume of Dist (L/kg)
            <Input className="mt-1" inputMode="decimal" value={vd} onChange={(e) => setVd(e.target.value)} />
          </label>
          <div className="text-xs text-muted">
            Max Infusion Speed
            <div className="mt-1 flex h-9 items-center rounded border border-input bg-surface px-2.5 font-mono text-xs text-fg">
              60 mg/min (adult cap)
            </div>
          </div>
        </div>

        {loadRes ? (
          <div className="mt-4 space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-md bg-surface p-3">
                <span className="text-[11px] text-muted block">Loading Dose</span>
                <span className="font-mono text-lg font-semibold text-fg">{loadRes.loadingDoseMg} mg</span>
                <span className="text-[10px] text-muted block mt-0.5">{loadRes.loadingDoseMgPerKg} mg/kg (Vd {loadRes.totalVdL} L)</span>
              </div>
              <div className="rounded-md bg-surface p-3">
                <span className="text-[11px] text-muted block">Min Infusion Time</span>
                <span className="font-mono text-lg font-semibold text-accent">{loadRes.minInfusionDurationMinutes} min</span>
                <span className="text-[10px] text-muted block mt-0.5">Rate: ≤60 mg/min</span>
              </div>
              <div className="rounded-md bg-surface p-3">
                <span className="text-[11px] text-muted block">Deficit to Replete</span>
                <span className="font-mono text-lg font-semibold text-fg">+{loadRes.deficitUgMl} µg/mL</span>
                <span className="text-[10px] text-muted block mt-0.5">Target: {loadRes.targetLevelUgMl} µg/mL</span>
              </div>
            </div>

            <div className="rounded bg-warn-soft p-2.5 text-xs text-fg leading-relaxed">
              <span className="font-semibold block">Propylene Glycol Diluent Black Box Caution:</span>
              <p className="mt-0.5">{loadRes.propyleneGlycolAlert}</p>
            </div>

            <div className="rounded bg-surface p-2.5 text-xs text-muted leading-relaxed">
              <p className="font-medium text-fg">{loadRes.indicationGuidance}</p>
              <p className="mt-1">{loadRes.respiratorySedationNote}</p>
              <p className="mt-1 font-mono text-[11px] text-accent">{loadRes.builtInTaperPearl}</p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Enter valid parameters (weight 20–300 kg, target 5–60 µg/mL).</p>
        )}
      </article>

      {/* Section 2: Barbiturate Toxicity & Ion-Trapping Urinary Alkalinization */}
      <article className="rounded-md bg-bg-sunken p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h4 className="font-serif text-base tracking-tight text-fg">Barbiturate Overdose & Ion-Trapping Urinary Alkalinization</h4>
            <p className="mt-0.5 text-xs text-muted">
              Weak acid pKa 7.24 kinetics: shifting urine pH from 6.0 to 7.8 traps ionized phenobarbital, multiplying renal clearance 5- to 10-fold.
            </p>
          </div>
          {elimRes ? (
            <Badge tone={elimRes.toxicityBand === "lethal-overdose" || elimRes.toxicityBand === "severe-toxicity" ? "danger" : elimRes.toxicityBand === "elevated" ? "warn" : "ok"}>
              {elimRes.toxicityLabel}
            </Badge>
          ) : null}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-muted">
            Serum Level (µg/mL)
            <Input className="mt-1" inputMode="decimal" value={serumLvl} onChange={(e) => setSerumLvl(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            Baseline Urine pH
            <Input className="mt-1" inputMode="decimal" value={basePh} onChange={(e) => setBasePh(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            Target Alkalinized Urine pH
            <Input className="mt-1" inputMode="decimal" value={alkPh} onChange={(e) => setAlkPh(e.target.value)} />
          </label>
        </div>

        {elimRes ? (
          <div className="mt-4 space-y-3">
            <div className="grid gap-2 sm:grid-cols-4">
              <div className="rounded-md bg-surface p-3">
                <span className="text-[11px] text-muted block">Drug pKa</span>
                <span className="font-mono text-lg font-semibold text-fg">{elimRes.pKa}</span>
                <span className="text-[10px] text-muted block mt-0.5">Weak organic acid</span>
              </div>
              <div className="rounded-md bg-surface p-3">
                <span className="text-[11px] text-muted block">Baseline (pH {elimRes.baselineUrinePh})</span>
                <span className="font-mono text-lg font-semibold text-muted">{elimRes.baselineIonizedPercent}% Ionized</span>
                <span className="text-[10px] text-muted block mt-0.5">&gt;90% lipid-soluble reabsorbed</span>
              </div>
              <div className="rounded-md bg-surface p-3">
                <span className="text-[11px] text-muted block">Alkalinized (pH {elimRes.alkalinizedUrinePh})</span>
                <span className="font-mono text-lg font-semibold text-accent">{elimRes.alkalinizedIonizedPercent}% Ionized</span>
                <span className="text-[10px] text-muted block mt-0.5">Trapped impermeable A⁻</span>
              </div>
              <div className="rounded-md bg-surface p-3">
                <span className="text-[11px] text-muted block">Clearance Enhancement</span>
                <span className="font-mono text-lg font-semibold text-fg">~{elimRes.clearanceFoldIncrease}× Multiplier</span>
                <span className="text-[10px] text-muted block mt-0.5">{elimRes.ionizationFoldIncrease}× ionized fraction</span>
              </div>
            </div>

            <div className="rounded-md border border-danger/40 bg-danger-soft/40 p-3 text-xs leading-relaxed text-fg">
              <span className="font-semibold block text-danger">CRITICAL PITFALL — Paradoxical Aciduria & Potassium Wasting:</span>
              <p className="mt-1">{elimRes.paradoxicalAciduriaAlert}</p>
            </div>

            <div className="rounded-md bg-surface p-3 text-xs space-y-2">
              <p className="text-fg font-medium">{elimRes.protocolSummary}</p>
              <p className="text-muted leading-relaxed">{elimRes.hemodialysisCriteria}</p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Enter valid parameters (serum level 0–300 µg/mL, urine pH 5.0–8.5).</p>
        )}
      </article>

      <p className="text-[11px] leading-relaxed text-subtle">
        Educational reference only. Urinary alkalinization requires intensive care monitoring and serial blood gas validation (keep blood pH ≤7.55). Prescribing Information and regional Poison Center consultation govern.
      </p>
    </div>
  );
}

function AminoglycosideBlock({
  isHot,
  defaultWeight,
  defaultSex = "male",
}: {
  isHot?: boolean;
  defaultWeight?: number;
  defaultSex?: Sex;
}) {
  const [agent, setAgent] = useState<AminoglycosideAgentId>("gentamicin");
  const [wt, setWt] = useState(defaultWeight && defaultWeight > 0 ? String(defaultWeight) : "70");
  const [ht, setHt] = useState("175");
  const [hours, setHours] = useState("8");
  const [level, setLevel] = useState("4.0");

  useEffect(() => {
    if (defaultWeight && defaultWeight > 0) {
      setWt(String(defaultWeight));
    }
  }, [defaultWeight]);

  const wtRes = calculateAminoglycosideWeight({
    heightCm: Number(ht),
    weightKg: Number(wt),
    sex: defaultSex,
  });

  const nomoRes = evaluateHartfordNomogram({
    agent,
    hoursPostStart: Number(hours),
    serumLevelUgMl: Number(level),
  });

  const dosePerKg = agent === "amikacin" ? 15 : 7;
  const estDoseMg = wtRes ? Math.round((wtRes.dosingWeightKg * dosePerKg) / 20) * 20 : null;

  return (
    <article className={cn("rounded-md px-3 py-3", isHot ? "bg-accent-soft/60" : "bg-bg-sunken")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg tracking-tight text-fg">Aminoglycoside Dosing & Hartford Nomogram</h3>
            {isHot ? <Badge tone="info">Aminoglycoside on tray</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-muted">
            Obesity weight adjustment (AdjBW 0.4) and Nicolau 1995 Hartford extended-interval triage.
          </p>
        </div>
        {wtRes && estDoseMg ? (
          <div className="text-right">
            <p className="font-mono text-lg font-semibold text-fg">~{estDoseMg} mg ({dosePerKg} mg/kg)</p>
            <span className="font-mono text-xs text-muted">Dosing Wt: {wtRes.dosingWeightKg} kg ({wtRes.recommendedWeightType.toUpperCase()})</span>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex gap-1">
        {(["gentamicin", "tobramycin", "amikacin"] as const).map((a) => (
          <button
            key={a}
            type="button"
            aria-pressed={agent === a}
            onClick={() => setAgent(a)}
            className={cn(
              "h-8 rounded px-2.5 text-xs font-medium",
              agent === a ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
            )}
          >
            {a === "gentamicin" ? "Gentamicin (7 mg/kg)" : a === "tobramycin" ? "Tobramycin (7 mg/kg)" : "Amikacin (15 mg/kg)"}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="text-xs text-muted">
          Height (cm)
          <Input className="mt-1" inputMode="decimal" value={ht} onChange={(e) => setHt(e.target.value)} />
        </label>
        <label className="text-xs text-muted">
          Actual Weight (kg)
          <Input className="mt-1" inputMode="decimal" value={wt} onChange={(e) => setWt(e.target.value)} />
        </label>
        <label className="text-xs text-muted">
          Draw Time (6–14h post-start)
          <Input className="mt-1" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} />
        </label>
        <label className="text-xs text-muted">
          Serum Level (µg/mL)
          <Input className="mt-1" inputMode="decimal" value={level} onChange={(e) => setLevel(e.target.value)} />
        </label>
      </div>

      {nomoRes ? (
        <div className="mt-3 space-y-2">
          <div className={cn("rounded-md p-2.5 text-xs", nomoRes.interval === "off-nomogram" ? "bg-danger-soft text-fg" : nomoRes.interval === "q48h" ? "bg-warn-soft text-fg" : "bg-surface text-fg")}>
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="font-semibold">{nomoRes.label}</span>
              {nomoRes.q24CutoffUgMl ? (
                <span className="font-mono text-[11px] text-muted">
                  Cutoffs at {nomoRes.hoursPostStart}h: Q24 ≤{nomoRes.q24CutoffUgMl} | Q36 ≤{nomoRes.q36CutoffUgMl} | Q48 ≤{nomoRes.q48CutoffUgMl} µg/mL
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 leading-relaxed text-muted">{nomoRes.clinicalGuidance}</p>
            {nomoRes.safetyAlert ? (
              <p className="mt-1 font-mono text-[11px] text-danger font-medium">{nomoRes.safetyAlert}</p>
            ) : null}
          </div>
          {wtRes ? (
            <p className="text-[11px] leading-relaxed text-muted font-mono">{wtRes.rationale}</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">Enter valid parameters (height 100–250 cm, weight 20–300 kg, hours 6–14).</p>
      )}

      <p className="mt-2 text-[11px] leading-relaxed text-subtle">
        Educational reference only. Hartford nomogram assumes normal distribution volume; excludes CrCl &lt;20 mL/min, ascites, burns &gt;20%, and pregnancy. For traditional peak/trough targets and endocarditis synergy, open the Aminoglycosides tab.
      </p>
    </article>
  );
}

function LithiumBlock({
  isHot,
  defaultWeight,
  defaultCrcl,
}: {
  isHot?: boolean;
  defaultWeight?: number;
  defaultCrcl?: number;
}) {
  const [level, setLevel] = useState("1.0");
  const [targetBand, setTargetBand] = useState<LithiumTargetBand>("maintenance");
  const [crcl, setCrcl] = useState(defaultCrcl && defaultCrcl > 0 ? String(defaultCrcl) : "80");
  const [wt, setWt] = useState(defaultWeight && defaultWeight > 0 ? String(defaultWeight) : "70");
  const [takingThiazide, setTakingThiazide] = useState(false);
  const [takingNsaid, setTakingNsaid] = useState(false);
  const [takingAceiArb, setTakingAceiArb] = useState(false);
  const [isDehydrated, setIsDehydrated] = useState(false);
  const [severeNeuro, setSevereNeuro] = useState(false);

  useEffect(() => {
    if (defaultCrcl && defaultCrcl > 0) setCrcl(String(defaultCrcl));
  }, [defaultCrcl]);

  useEffect(() => {
    if (defaultWeight && defaultWeight > 0) setWt(String(defaultWeight));
  }, [defaultWeight]);

  const numLevel = Number(level);
  const numCrcl = Number(crcl);
  const numWt = Number(wt);

  const levelRes = useMemo(() => {
    if (!Number.isFinite(numLevel) || numLevel < 0 || numLevel > 15) return null;
    return classifyLithiumLevel(numLevel, targetBand);
  }, [numLevel, targetBand]);

  const clRes = useMemo(() => {
    if (!Number.isFinite(numCrcl) || numCrcl <= 0 || !Number.isFinite(numWt) || numWt <= 0) return null;
    return calculateLithiumClearance({
      crclMlMin: numCrcl,
      weightKg: numWt,
      takingThiazide,
      takingNsaid,
      takingAceiArb,
      isDehydrated,
    });
  }, [numCrcl, numWt, takingThiazide, takingNsaid, takingAceiArb, isDehydrated]);

  const extripRes = useMemo(() => {
    if (!Number.isFinite(numLevel) || numLevel < 0) return null;
    return evaluateExtripLithiumCriteria({
      serumLithiumMeqL: numLevel,
      crclMlMin: Number.isFinite(numCrcl) ? numCrcl : undefined,
      hasSevereNeurologicSigns: severeNeuro,
    });
  }, [numLevel, numCrcl, severeNeuro]);

  return (
    <article className={cn("rounded-md px-3 py-3", isHot ? "bg-accent-soft/60" : "bg-bg-sunken")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg tracking-tight text-fg">Lithium Kinetics & EXTRIP Dialysis Triage</h3>
            {isHot ? <Badge tone="info">Lithium on tray</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-muted">
            12-hour trough target stratifier, proximal tubule NHE3 clearance drop, and EXTRIP dialysis rebound rules.
          </p>
        </div>
        {levelRes ? (
          <div className="text-right">
            <Badge tone={levelRes.severity === "severe-life-threatening" || levelRes.severity === "moderate" ? "danger" : levelRes.severity === "mild" || levelRes.severity === "borderline-elevated" ? "warn" : "ok"}>
              {levelRes.headline}
            </Badge>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {(["acute-mania", "maintenance", "geriatric"] as const).map((b) => (
          <button
            key={b}
            type="button"
            aria-pressed={targetBand === b}
            onClick={() => setTargetBand(b)}
            className={cn(
              "h-8 rounded px-2.5 text-xs font-medium",
              targetBand === b ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
            )}
          >
            {b === "acute-mania" ? "Acute Mania (0.8–1.2)" : b === "maintenance" ? "Maintenance (0.6–0.8)" : "Geriatric (0.4–0.6)"}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="text-xs text-muted">
          Serum Lithium (mEq/L)
          <Input className="mt-1" inputMode="decimal" value={level} onChange={(e) => setLevel(e.target.value)} />
        </label>
        <label className="text-xs text-muted">
          CrCl (mL/min)
          <Input className="mt-1" inputMode="decimal" value={crcl} onChange={(e) => setCrcl(e.target.value)} />
        </label>
        <label className="text-xs text-muted">
          Weight (kg)
          <Input className="mt-1" inputMode="decimal" value={wt} onChange={(e) => setWt(e.target.value)} />
        </label>
        <div className="text-xs text-muted">
          Severe Neuro (Coma/Seizures)
          <button
            type="button"
            aria-pressed={severeNeuro}
            onClick={() => setSevereNeuro((v) => !v)}
            className={cn(
              "mt-1 flex h-9 w-full items-center justify-between rounded px-2 text-xs font-medium",
              severeNeuro ? "bg-danger-soft text-fg" : "bg-surface text-muted hover:text-fg",
            )}
          >
            <span>{severeNeuro ? "Present" : "Absent"}</span>
            {severeNeuro ? <CheckSquare className="size-4 text-danger" /> : <Square className="size-4 text-muted" />}
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <button
          type="button"
          aria-pressed={takingThiazide}
          onClick={() => setTakingThiazide((v) => !v)}
          className={cn("h-7 rounded px-2 text-[11px] font-medium", takingThiazide ? "bg-danger text-bg" : "bg-surface text-muted hover:text-fg")}
        >
          + Thiazide (-40% Cl)
        </button>
        <button
          type="button"
          aria-pressed={takingNsaid}
          onClick={() => setTakingNsaid((v) => !v)}
          className={cn("h-7 rounded px-2 text-[11px] font-medium", takingNsaid ? "bg-warn text-bg" : "bg-surface text-muted hover:text-fg")}
        >
          + NSAID (-25% Cl)
        </button>
        <button
          type="button"
          aria-pressed={takingAceiArb}
          onClick={() => setTakingAceiArb((v) => !v)}
          className={cn("h-7 rounded px-2 text-[11px] font-medium", takingAceiArb ? "bg-warn text-bg" : "bg-surface text-muted hover:text-fg")}
        >
          + ACEi/ARB (-20% Cl)
        </button>
        <button
          type="button"
          aria-pressed={isDehydrated}
          onClick={() => setIsDehydrated((v) => !v)}
          className={cn("h-7 rounded px-2 text-[11px] font-medium", isDehydrated ? "bg-warn text-bg" : "bg-surface text-muted hover:text-fg")}
        >
          + Dehydration (-30% Cl)
        </button>
      </div>

      {clRes && extripRes && levelRes ? (
        <div className="mt-3 space-y-2">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded bg-surface p-2 text-xs">
              <span className="text-muted block text-[10px]">Lithium Clearance (Cl_Li)</span>
              <span className="font-mono text-sm font-semibold text-fg">{clRes.estimatedLithiumClearanceMlMin} mL/min</span>
              <span className="text-muted block text-[10px]">Baseline: {clRes.baselineLithiumClearanceMlMin} mL/min ({clRes.percentReduction > 0 ? `-${clRes.percentReduction}%` : "100%"})</span>
            </div>
            <div className="rounded bg-surface p-2 text-xs">
              <span className="text-muted block text-[10px]">Elimination Half-Life</span>
              <span className="font-mono text-sm font-semibold text-accent">~{clRes.halfLifeHours} hours</span>
              <span className="text-muted block text-[10px]">Vd ~{clRes.volumeOfDistributionLiters} L</span>
            </div>
            <div className="rounded bg-surface p-2 text-xs">
              <span className="text-muted block text-[10px]">EXTRIP Triage</span>
              <span className={cn("font-mono text-xs font-semibold block uppercase", extripRes.indication === "recommended" ? "text-danger" : extripRes.indication === "suggested" ? "text-warn" : "text-ok")}>
                {extripRes.indication === "recommended" ? "Dialysis Recommended" : extripRes.indication === "suggested" ? "Dialysis Suggested" : "Dialysis Not Indicated"}
              </span>
              <span className="text-muted block text-[10px]">{extripRes.indication !== "not-indicated" ? "IHD first-line" : "Conservative hydration"}</span>
            </div>
          </div>

          <div className={cn("rounded-md p-2.5 text-xs", extripRes.reboundWarning.isHighRisk ? "bg-danger-soft/40 border border-danger/20 text-fg" : "bg-surface text-fg")}>
            <span className="font-semibold text-danger block">EXTRIP Rebound Trap Warning:</span>
            <p className="mt-0.5 leading-relaxed text-muted">{extripRes.reboundWarning.mitigation}</p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">Enter valid parameters (lithium 0–15 mEq/L, CrCl 5–200 mL/min, weight 30–250 kg).</p>
      )}

      <p className="mt-2 text-[11px] leading-relaxed text-subtle">
        Educational reference only. Lithium is freely filtered and reabsorbed ~80% in the proximal tubule via NHE3. Distal-acting thiazides provoke proximal compensatory retention. For complete EXTRIP consensus criteria and multi-drug collision analysis, open the Lithium tab.
      </p>
    </article>
  );
}

function AminoglycosidesPanel({ ids }: { ids: string[] }) {
  const [agent, setAgent] = useState<AminoglycosideAgentId>("gentamicin");
  const [ht, setHt] = useState("175");
  const [wt, setWt] = useState("85");
  const [sex, setSex] = useState<Sex>("male");
  const [regimen, setRegimen] = useState<"extended-7" | "extended-5" | "extended-15">("extended-7");

  // Hartford state
  const [hours, setHours] = useState("8");
  const [level, setLevel] = useState("4.5");

  const report = aminoglycosideReportOnDesk(ids);

  const wtRes = calculateAminoglycosideWeight({
    heightCm: Number(ht),
    weightKg: Number(wt),
    sex,
  });

  const nomoRes = evaluateHartfordNomogram({
    agent,
    hoursPostStart: Number(hours),
    serumLevelUgMl: Number(level),
  });

  const dosePerKg = agent === "amikacin" ? 15 : regimen === "extended-5" ? 5 : 7;
  const calculatedDoseMg = wtRes ? Math.round((wtRes.dosingWeightKg * dosePerKg) / 20) * 20 : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-serif text-lg tracking-tight text-fg">Aminoglycoside Pharmacokinetics & Hartford Nomogram</h3>
          <p className="mt-1 text-xs text-muted">
            Concentration-dependent killing, obesity adjusted weight, Nicolau extended-interval nomogram, and ototoxicity/nephrotoxicity monitoring.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {report.presentAgents.map((name) => (
            <Badge key={name} tone="danger">{name} on tray</Badge>
          ))}
        </div>
      </div>

      {report.nephrotoxicityAlert || report.ototoxicityAlert ? (
        <div className="space-y-2">
          {report.nephrotoxicityAlert ? (
            <div className="rounded-md border border-warn/30 bg-warn-soft/40 p-3 text-xs leading-relaxed text-fg">
              <span className="font-semibold block text-fg">Nephrotoxicity Collision Warning:</span>
              {report.nephrotoxicityAlert}
            </div>
          ) : null}
          {report.ototoxicityAlert ? (
            <div className="rounded-md border border-danger/30 bg-danger-soft/30 p-3 text-xs leading-relaxed text-fg">
              <span className="font-semibold block text-danger">Sensory Ototoxicity Alert:</span>
              {report.ototoxicityAlert}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Section 1: Dosing Weight Optimization */}
      <article className="rounded-md bg-bg-sunken p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h4 className="font-serif text-base tracking-tight text-fg">Dosing Weight Selection & Extended-Interval Sizing</h4>
            <p className="mt-0.5 text-xs text-muted">
              Hydrophilic distribution kinetics: IBW or Adjusted Body Weight (AdjBW 0.4) in obesity to prevent severe overdosing.
            </p>
          </div>
          {wtRes && calculatedDoseMg ? (
            <span className="font-mono text-sm font-bold text-accent">
              Recommended Dose: ~{calculatedDoseMg} mg ({dosePerKg} mg/kg on {wtRes.dosingWeightKg} kg)
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {(["gentamicin", "tobramycin", "amikacin"] as const).map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={agent === a}
              onClick={() => {
                setAgent(a);
                if (a === "amikacin") setRegimen("extended-15");
                else setRegimen("extended-7");
              }}
              className={cn(
                "h-8 rounded px-3 text-xs font-medium",
                agent === a ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
              )}
            >
              {a === "gentamicin" ? "Gentamicin" : a === "tobramycin" ? "Tobramycin" : "Amikacin"}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-muted">
            Height (cm)
            <Input className="mt-1" inputMode="decimal" value={ht} onChange={(e) => setHt(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            Actual Weight (kg)
            <Input className="mt-1" inputMode="decimal" value={wt} onChange={(e) => setWt(e.target.value)} />
          </label>
          <div className="text-xs text-muted">
            Biological Sex
            <div className="mt-1 flex gap-1">
              {(["male", "female"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={sex === s}
                  onClick={() => setSex(s)}
                  className={cn(
                    "h-9 flex-1 rounded text-xs font-medium",
                    sex === s ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
                  )}
                >
                  {s === "male" ? "Male" : "Female"}
                </button>
              ))}
            </div>
          </div>
          <div className="text-xs text-muted">
            Dosing Regimen
            <div className="mt-1 flex gap-1">
              {agent === "amikacin" ? (
                <div className="flex h-9 w-full items-center justify-center rounded bg-surface font-mono text-xs font-medium text-fg">
                  15 mg/kg Standard
                </div>
              ) : (
                (["extended-7", "extended-5"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={regimen === r}
                    onClick={() => setRegimen(r)}
                    className={cn(
                      "h-9 flex-1 rounded text-xs font-medium",
                      regimen === r ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
                    )}
                  >
                    {r === "extended-7" ? "7 mg/kg" : "5 mg/kg"}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {wtRes ? (
          <div className="mt-4 space-y-3">
            <div className="grid gap-2 sm:grid-cols-4">
              <div className="rounded-md bg-surface p-3">
                <span className="text-[11px] text-muted block">Actual Body Weight</span>
                <span className="font-mono text-lg font-semibold text-fg">{wtRes.actualWeightKg} kg</span>
                <span className="text-[10px] text-muted block mt-0.5">Total mass</span>
              </div>
              <div className="rounded-md bg-surface p-3">
                <span className="text-[11px] text-muted block">Ideal Body Weight (IBW)</span>
                <span className="font-mono text-lg font-semibold text-fg">{wtRes.ibwKg} kg</span>
                <span className="text-[10px] text-muted block mt-0.5">Devine formula</span>
              </div>
              <div className="rounded-md bg-surface p-3">
                <span className="text-[11px] text-muted block">Adjusted Wt (AdjBW 0.4)</span>
                <span className="font-mono text-lg font-semibold text-fg">{wtRes.adjBwKg} kg</span>
                <span className="text-[10px] text-muted block mt-0.5">40% extracellular adipose factor</span>
              </div>
              <div className="rounded-md bg-surface p-3">
                <span className="text-[11px] text-muted block">Dosing Weight Selected</span>
                <span className="font-mono text-lg font-semibold text-accent">{wtRes.dosingWeightKg} kg</span>
                <span className="text-[10px] text-muted block mt-0.5 uppercase font-medium">{wtRes.recommendedWeightType} ({wtRes.weightCategory})</span>
              </div>
            </div>

            <p className="rounded bg-surface p-2.5 text-xs leading-relaxed text-muted font-mono">{wtRes.rationale}</p>
          </div>
        ) : null}
      </article>

      {/* Section 2: Hartford Nomogram */}
      <article className="rounded-md bg-bg-sunken p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h4 className="font-serif text-base tracking-tight text-fg">Hartford Extended-Interval Nomogram (Nicolau 1995)</h4>
            <p className="mt-0.5 text-xs text-muted">
              Random timed serum concentration drawn between 6 and 14 hours following start of 60-minute infusion.
            </p>
          </div>
          {nomoRes ? (
            <Badge tone={nomoRes.interval === "off-nomogram" ? "danger" : nomoRes.interval === "q48h" || nomoRes.interval === "too-early" || nomoRes.interval === "too-late" ? "warn" : "ok"}>
              {nomoRes.label}
            </Badge>
          ) : null}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted">
            Hours Post-Infusion Start (6.0–14.0 h)
            <Input className="mt-1" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            Measured Serum Level (µg/mL)
            <Input className="mt-1" inputMode="decimal" value={level} onChange={(e) => setLevel(e.target.value)} />
          </label>
        </div>

        {nomoRes ? (
          <div className="mt-4 space-y-3">
            <div className={cn("rounded-md p-3", toneClass(nomoRes.interval === "off-nomogram" ? "danger" : nomoRes.interval === "q48h" || nomoRes.interval === "too-early" || nomoRes.interval === "too-late" ? "warn" : "ok"))}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-fg">{nomoRes.label}</span>
                {nomoRes.q24CutoffUgMl ? (
                  <span className="font-mono text-xs">
                    Cutoffs at {nomoRes.hoursPostStart}h: Q24 ≤{nomoRes.q24CutoffUgMl} | Q36 ≤{nomoRes.q36CutoffUgMl} | Q48 ≤{nomoRes.q48CutoffUgMl} µg/mL
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-fg">{nomoRes.clinicalGuidance}</p>
              {nomoRes.safetyAlert ? (
                <p className="mt-1 font-mono text-xs font-semibold text-danger">{nomoRes.safetyAlert}</p>
              ) : null}
            </div>

            <p className="text-xs leading-relaxed text-muted font-mono">{nomoRes.exclusionCriteriaNote}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Enter valid draw time (6–14 hours) and concentration.</p>
        )}
      </article>

      {/* Section 3: Traditional Targets & Synergy */}
      <article className="rounded-md bg-bg-sunken p-4">
        <h4 className="font-serif text-base tracking-tight text-fg">Conventional Dosing & Synergy Reference Matrix</h4>
        <p className="mt-1 text-xs text-muted">
          Target peaks (Cmax:MIC ≥8–10) and troughs for conventional multi-dose regimens and enterococcal endocarditis synergy.
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-subtle text-muted">
                <th className="py-2 pr-3">Indication</th>
                <th className="py-2 px-2 text-right">Target Peak</th>
                <th className="py-2 px-2 text-right">Target Trough</th>
                <th className="py-2 pl-3">Clinical Pharmacodynamic Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle/50">
              {(["severe-sepsis-pneumonia", "urinary-tract", "synergy-endocarditis"] as const).map((indKey) => {
                const row = TRADITIONAL_AG_TARGETS[agent][indKey];
                return (
                  <tr key={indKey} className="hover:bg-surface/50">
                    <td className="py-2 pr-3 font-sans font-medium text-fg">
                      {indKey === "severe-sepsis-pneumonia"
                        ? "Gram-Negative Bacteremia / Pneumonia"
                        : indKey === "urinary-tract"
                        ? "Urinary Tract Infection (UTI)"
                        : "Enterococcal / Strep Endocarditis Synergy"}
                    </td>
                    <td className="py-2 px-2 text-right font-semibold text-accent">{row.peakTargetUgMl}</td>
                    <td className="py-2 px-2 text-right font-semibold text-ok">{row.troughTargetUgMl}</td>
                    <td className="py-2 pl-3 text-muted">{row.rationale}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>

      <p className="text-[11px] leading-relaxed text-subtle">
        Educational reference only. Hartford nomogram requires normal extracellular distribution. Prescribing Information and hospital antimicrobial stewardship guidelines govern individual patient dosing.
      </p>
    </div>
  );
}

function LithiumPanel({ ids }: { ids: string[]; host: HostContext }) {
  // Section 1: Serum Level & Target Band
  const [level, setLevel] = useState("1.1");
  const [targetBand, setTargetBand] = useState<LithiumTargetBand>("maintenance");

  // Section 2: Proximal Tubule Clearance & Interactions
  const [crcl, setCrcl] = useState("75");
  const [wt, setWt] = useState("70");
  const [takingThiazide, setTakingThiazide] = useState(false);
  const [takingNsaid, setTakingNsaid] = useState(false);
  const [takingAceiArb, setTakingAceiArb] = useState(false);
  const [takingLoopDiuretic, setTakingLoopDiuretic] = useState(false);
  const [isDehydrated, setIsDehydrated] = useState(false);

  // Section 3: EXTRIP Consensus & Rebound Protocol
  const [severeNeuro, setSevereNeuro] = useState(false);
  const [confusedOrStupor, setConfusedOrStupor] = useState(false);
  const [acuteOverdose, setAcuteOverdose] = useState(false);

  const report = lithiumReportOnDesk(ids);

  useEffect(() => {
    if (report.interactingDrugs.length > 0) {
      if (ids.some((id) => ["hctz", "chlorthalidone", "chlorothiazide", "lisinopril-hctz", "losartan-hctz", "valsartan-hctz"].includes(id))) {
        setTakingThiazide(true);
      }
      if (ids.some((id) => ["ibuprofen", "naproxen", "celecoxib", "meloxicam", "ketorolac", "indomethacin", "diclofenac"].includes(id))) {
        setTakingNsaid(true);
      }
      if (ids.some((id) => ["lisinopril", "losartan", "valsartan", "enalapril", "ramipril"].includes(id))) {
        setTakingAceiArb(true);
      }
      if (ids.some((id) => ["furosemide", "bumetanide", "torsemide"].includes(id))) {
        setTakingLoopDiuretic(true);
      }
    }
  }, [ids.join("|")]);

  const numLevel = Number(level);
  const numCrcl = Number(crcl);
  const numWt = Number(wt);

  const levelRes = useMemo(() => {
    if (!Number.isFinite(numLevel) || numLevel < 0 || numLevel > 15) return null;
    return classifyLithiumLevel(numLevel, targetBand);
  }, [numLevel, targetBand]);

  const clRes = useMemo(() => {
    if (!Number.isFinite(numCrcl) || numCrcl <= 0 || !Number.isFinite(numWt) || numWt <= 0) return null;
    return calculateLithiumClearance({
      crclMlMin: numCrcl,
      weightKg: numWt,
      takingThiazide,
      takingNsaid,
      takingAceiArb,
      takingLoopDiuretic,
      isDehydrated,
    });
  }, [numCrcl, numWt, takingThiazide, takingNsaid, takingAceiArb, takingLoopDiuretic, isDehydrated]);

  const extripRes = useMemo(() => {
    if (!Number.isFinite(numLevel) || numLevel < 0) return null;
    return evaluateExtripLithiumCriteria({
      serumLithiumMeqL: numLevel,
      crclMlMin: Number.isFinite(numCrcl) ? numCrcl : undefined,
      hasSevereNeurologicSigns: severeNeuro,
      hasDecreasedConsciousnessOrConfusion: confusedOrStupor,
      isAcuteIngestion: acuteOverdose,
    });
  }, [numLevel, numCrcl, severeNeuro, confusedOrStupor, acuteOverdose]);

  const severityTone: "ok" | "warn" | "danger" =
    levelRes?.severity === "severe-life-threatening" || levelRes?.severity === "moderate"
      ? "danger"
      : levelRes?.severity === "mild" || levelRes?.severity === "borderline-elevated"
      ? "warn"
      : "ok";

  const extripTone: "ok" | "warn" | "danger" =
    extripRes?.indication === "recommended"
      ? "danger"
      : extripRes?.indication === "suggested"
      ? "warn"
      : "ok";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-serif text-lg tracking-tight text-fg">Lithium Pharmacokinetics & EXTRIP Consensus Station</h3>
          <p className="mt-1 text-xs text-muted">
            Proximal tubular NHE3 reabsorption dynamics, 12-hour steady-state trough targeting, drug-induced clearance collapse, and international EXTRIP hemodialysis rebound protocols.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {report.hasLithium ? <Badge tone="info">Lithium active on tray</Badge> : null}
          {report.interactingDrugs.map((d) => (
            <Badge key={d} tone="warn">{d} on tray</Badge>
          ))}
        </div>
      </div>

      {report.warnings.length > 0 ? (
        <div className="space-y-2">
          {report.warnings.map((w, i) => (
            <div key={i} className="rounded-md border border-warn/30 bg-warn-soft/40 p-3 text-xs leading-relaxed text-fg">
              <span className="font-semibold block text-fg">Active Tray Clearance Warning:</span>
              {w}
            </div>
          ))}
        </div>
      ) : null}

      {/* Section 1: Serum Level & Target Stratification */}
      <article className="rounded-md bg-bg-sunken p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h4 className="font-serif text-base tracking-tight text-fg">12-Hour Serum Trough & Clinical Toxicity Stratification</h4>
            <p className="mt-0.5 text-xs text-muted">
              Standard 12-hour steady-state trough monitoring (drawn 12 hours post-dose at steady state, ~4–5 days after initiation/titration).
            </p>
          </div>
          {levelRes ? (
            <Badge tone={severityTone}>
              {levelRes.headline}
            </Badge>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {(["acute-mania", "maintenance", "geriatric"] as const).map((b) => (
            <button
              key={b}
              type="button"
              aria-pressed={targetBand === b}
              onClick={() => setTargetBand(b)}
              className={cn(
                "h-8 rounded px-3 text-xs font-medium",
                targetBand === b ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
              )}
            >
              {LITHIUM_TARGET_RANGES[b].label}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted">
            Measured 12-Hour Serum Lithium (mEq/L)
            <Input className="mt-1" inputMode="decimal" value={level} onChange={(e) => setLevel(e.target.value)} />
          </label>
          <div className="rounded bg-surface p-2.5 text-xs text-muted">
            <span className="font-medium text-fg block">Target Band Rationale:</span>
            {LITHIUM_TARGET_RANGES[targetBand].rationale}
          </div>
        </div>

        {levelRes ? (
          <div className="mt-4 space-y-3">
            <div className={cn("rounded-md p-3", toneClass(severityTone))}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-fg">{levelRes.headline}</span>
                <span className="font-mono text-xs">
                  {levelRes.inTargetRange ? "IN THERAPEUTIC WINDOW" : "OUTSIDE TARGET WINDOW"}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-fg">{levelRes.clinicalNote}</p>

              <div className="mt-2.5">
                <span className="text-[11px] font-semibold text-fg block">Expected Clinical Signs / Symptoms:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {levelRes.symptoms.map((s, idx) => (
                    <span key={idx} className="rounded bg-surface/80 px-2 py-0.5 text-[11px] font-medium text-fg">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Enter a valid serum lithium concentration (0–15 mEq/L).</p>
        )}
      </article>

      {/* Section 2: Proximal Tubule NHE3 Reabsorption & Interaction Simulator */}
      <article className="rounded-md bg-bg-sunken p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h4 className="font-serif text-base tracking-tight text-fg">Proximal Tubule NHE3 Handling & Drug-Drug Clearance Simulator</h4>
            <p className="mt-0.5 text-xs text-muted">
              Lithium is reabsorbed ~80% in the proximal tubule via NHE3 (baseline Cl_Li ≈ 20% of CrCl). Distal diuretics, NSAIDs, and volume contraction force avid proximal retention.
            </p>
          </div>
          {clRes ? (
            <span className="font-mono text-sm font-bold text-accent">
              Cl_Li: {clRes.estimatedLithiumClearanceMlMin} mL/min ({clRes.percentReduction > 0 ? `-${clRes.percentReduction}%` : "Baseline"})
            </span>
          ) : null}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted">
            Creatinine Clearance CrCl (mL/min)
            <Input className="mt-1" inputMode="decimal" value={crcl} onChange={(e) => setCrcl(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            Actual Weight (kg)
            <Input className="mt-1" inputMode="decimal" value={wt} onChange={(e) => setWt(e.target.value)} />
          </label>
        </div>

        <div className="mt-3">
          <span className="text-xs font-medium text-fg block mb-1.5">Concomitant Clearance-Altering Risk Factors:</span>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <button
              type="button"
              aria-pressed={takingThiazide}
              onClick={() => setTakingThiazide((v) => !v)}
              className={cn(
                "flex h-auto min-h-10 items-center justify-between rounded p-2 text-left text-xs font-medium",
                takingThiazide ? "bg-danger-soft text-fg" : "bg-surface text-muted hover:text-fg",
              )}
            >
              <span>Thiazide Diuretic (-40% Cl)</span>
              {takingThiazide ? <CheckSquare className="size-4 shrink-0 text-danger" /> : <Square className="size-4 shrink-0 text-muted" />}
            </button>

            <button
              type="button"
              aria-pressed={takingNsaid}
              onClick={() => setTakingNsaid((v) => !v)}
              className={cn(
                "flex h-auto min-h-10 items-center justify-between rounded p-2 text-left text-xs font-medium",
                takingNsaid ? "bg-warn-soft text-fg" : "bg-surface text-muted hover:text-fg",
              )}
            >
              <span>NSAID Therapy (-25% Cl)</span>
              {takingNsaid ? <CheckSquare className="size-4 shrink-0 text-warn" /> : <Square className="size-4 shrink-0 text-muted" />}
            </button>

            <button
              type="button"
              aria-pressed={takingAceiArb}
              onClick={() => setTakingAceiArb((v) => !v)}
              className={cn(
                "flex h-auto min-h-10 items-center justify-between rounded p-2 text-left text-xs font-medium",
                takingAceiArb ? "bg-warn-soft text-fg" : "bg-surface text-muted hover:text-fg",
              )}
            >
              <span>ACEi / ARB (-20% Cl)</span>
              {takingAceiArb ? <CheckSquare className="size-4 shrink-0 text-warn" /> : <Square className="size-4 shrink-0 text-muted" />}
            </button>

            <button
              type="button"
              aria-pressed={isDehydrated}
              onClick={() => setIsDehydrated((v) => !v)}
              className={cn(
                "flex h-auto min-h-10 items-center justify-between rounded p-2 text-left text-xs font-medium",
                isDehydrated ? "bg-warn-soft text-fg" : "bg-surface text-muted hover:text-fg",
              )}
            >
              <span>Volume Depletion (-30% Cl)</span>
              {isDehydrated ? <CheckSquare className="size-4 shrink-0 text-warn" /> : <Square className="size-4 shrink-0 text-muted" />}
            </button>

            <button
              type="button"
              aria-pressed={takingLoopDiuretic}
              onClick={() => setTakingLoopDiuretic((v) => !v)}
              className={cn(
                "flex h-auto min-h-10 items-center justify-between rounded p-2 text-left text-xs font-medium",
                takingLoopDiuretic ? "bg-warn-soft text-fg" : "bg-surface text-muted hover:text-fg",
              )}
            >
              <span>Loop Diuretic (-15% Cl)</span>
              {takingLoopDiuretic ? <CheckSquare className="size-4 shrink-0 text-warn" /> : <Square className="size-4 shrink-0 text-muted" />}
            </button>
          </div>
        </div>

        {clRes ? (
          <div className="mt-4 space-y-3">
            <div className="grid gap-2 sm:grid-cols-4">
              <div className="rounded-md bg-surface p-3">
                <span className="text-[11px] text-muted block">Baseline Cl_Li (20% CrCl)</span>
                <span className="font-mono text-lg font-semibold text-fg">{clRes.baselineLithiumClearanceMlMin} mL/min</span>
                <span className="text-[10px] text-muted block mt-0.5">Uninhibited nephron</span>
              </div>
              <div className="rounded-md bg-surface p-3">
                <span className="text-[11px] text-muted block">Estimated Cl_Li</span>
                <span className="font-mono text-lg font-semibold text-accent">{clRes.estimatedLithiumClearanceMlMin} mL/min</span>
                <span className="text-[10px] text-muted block mt-0.5">
                  {clRes.percentReduction > 0 ? `-${clRes.percentReduction}% reduction` : "No drug interactions"}
                </span>
              </div>
              <div className="rounded-md bg-surface p-3">
                <span className="text-[11px] text-muted block">Elimination Half-Life</span>
                <span className="font-mono text-lg font-semibold text-fg">~{clRes.halfLifeHours} h</span>
                <span className="text-[10px] text-muted block mt-0.5">Normal: 18–24 h</span>
              </div>
              <div className="rounded-md bg-surface p-3">
                <span className="text-[11px] text-muted block">Volume of Dist (Vd)</span>
                <span className="font-mono text-lg font-semibold text-fg">{clRes.volumeOfDistributionLiters} L</span>
                <span className="text-[10px] text-muted block mt-0.5">~0.8 L/kg total body water</span>
              </div>
            </div>

            {clRes.interactingFactors.length > 0 ? (
              <div className="rounded-md bg-surface p-3 space-y-1.5 text-xs text-fg">
                <span className="font-semibold block text-fg">Active Interaction Mechanisms:</span>
                {clRes.interactingFactors.map((f, idx) => (
                  <p key={idx} className="leading-relaxed text-muted font-mono text-[11px]">• {f}</p>
                ))}
              </div>
            ) : null}

            <p className="rounded bg-surface p-2.5 text-xs leading-relaxed text-muted font-mono">{clRes.physiologicExplanation}</p>
          </div>
        ) : null}
      </article>

      {/* Section 3: EXTRIP Consensus & Redistribution Rebound Protocol */}
      <article className="rounded-md bg-bg-sunken p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h4 className="font-serif text-base tracking-tight text-fg">EXTRIP Consensus Extracorporeal Elimination & Rebound Station</h4>
            <p className="mt-0.5 text-xs text-muted">
              International EXTRIP Workgroup guidelines (Decker et al. 2015) for hemodialysis triage in severe poisoning.
            </p>
          </div>
          {extripRes ? (
            <Badge tone={extripTone}>
              {extripRes.indication === "recommended" ? "DIALYSIS RECOMMENDED" : extripRes.indication === "suggested" ? "DIALYSIS SUGGESTED" : "DIALYSIS NOT INDICATED"}
            </Badge>
          ) : null}
        </div>

        <div className="mt-3">
          <span className="text-xs font-medium text-fg block mb-1.5">EXTRIP Clinical Status & Ingestion Chronicity:</span>
          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              aria-pressed={severeNeuro}
              onClick={() => setSevereNeuro((v) => !v)}
              className={cn(
                "flex h-auto min-h-10 items-center justify-between rounded p-2 text-left text-xs font-medium",
                severeNeuro ? "bg-danger-soft text-fg" : "bg-surface text-muted hover:text-fg",
              )}
            >
              <span>Severe Neuro (Coma, Seizures)</span>
              {severeNeuro ? <CheckSquare className="size-4 shrink-0 text-danger" /> : <Square className="size-4 shrink-0 text-muted" />}
            </button>

            <button
              type="button"
              aria-pressed={confusedOrStupor}
              onClick={() => setConfusedOrStupor((v) => !v)}
              className={cn(
                "flex h-auto min-h-10 items-center justify-between rounded p-2 text-left text-xs font-medium",
                confusedOrStupor ? "bg-warn-soft text-fg" : "bg-surface text-muted hover:text-fg",
              )}
            >
              <span>Decreased Consciousness / Confusion</span>
              {confusedOrStupor ? <CheckSquare className="size-4 shrink-0 text-warn" /> : <Square className="size-4 shrink-0 text-muted" />}
            </button>

            <div className="flex rounded bg-surface p-1">
              <button
                type="button"
                aria-pressed={!acuteOverdose}
                onClick={() => setAcuteOverdose(false)}
                className={cn(
                  "flex-1 rounded text-xs font-medium py-1.5",
                  !acuteOverdose ? "bg-ink text-bg" : "text-muted hover:text-fg",
                )}
              >
                Chronic Toxicity
              </button>
              <button
                type="button"
                aria-pressed={acuteOverdose}
                onClick={() => setAcuteOverdose(true)}
                className={cn(
                  "flex-1 rounded text-xs font-medium py-1.5",
                  acuteOverdose ? "bg-ink text-bg" : "text-muted hover:text-fg",
                )}
              >
                Acute Ingestion
              </button>
            </div>
          </div>
        </div>

        {extripRes ? (
          <div className="mt-4 space-y-3">
            <div className={cn("rounded-md p-3", toneClass(extripTone))}>
              <span className="text-sm font-semibold text-fg block">{extripRes.summary}</span>
              {extripRes.criteriaMet.length > 0 ? (
                <div className="mt-2 space-y-1">
                  <span className="text-[11px] font-semibold text-fg">Consensus Criteria Met:</span>
                  {extripRes.criteriaMet.map((c, idx) => (
                    <p key={idx} className="font-mono text-xs text-fg leading-relaxed">• {c}</p>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-xs text-fg">Current concentration and renal function do not satisfy EXTRIP threshold criteria. Continue volume resuscitation with 0.9% NaCl and serial monitoring.</p>
              )}
              <p className="mt-2 text-xs leading-relaxed text-muted">{extripRes.modalityRecommendation}</p>
            </div>

            {/* Rebound Warning Box */}
            <div className={cn("rounded-md border p-3.5 space-y-2", extripRes.reboundWarning.isHighRisk ? "border-danger/30 bg-danger-soft/30" : "border-subtle bg-surface")}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-danger uppercase tracking-wide">
                  CRITICAL REBOUND TRAP: Intracellular Redistribution Protocol
                </span>
              </div>
              <p className="text-xs leading-relaxed text-fg">{extripRes.reboundWarning.rationale}</p>
              <div className="rounded bg-surface/90 p-2.5 text-xs text-fg font-medium">
                <span className="text-danger font-bold block mb-0.5">Mandatory Clinical Monitoring Protocol:</span>
                {extripRes.reboundWarning.mitigation}
              </div>
            </div>

            <p className="text-xs leading-relaxed text-muted font-mono">{extripRes.monitoringGuidance}</p>
          </div>
        ) : null}
      </article>

      <p className="text-[11px] leading-relaxed text-subtle">
        Educational clinical pharmacology reference only (non-device CDS). Lithium clearance is governed by proximal tubule sodium handling. EXTRIP guidelines require integration of bedside hemodynamics, renal clearance, and continuous toxicologic consultation (Poison Center 1-800-222-1222).
      </p>
    </div>
  );
}

function DoacPanel({ ids, host }: { ids: string[]; host: HostContext }) {
  const [age, setAge] = useState(host.age === "geriatric" ? "82" : "68");
  const [weight, setWeight] = useState("70");
  const [scr, setScr] = useState(host.kidney === "ckd" ? "1.6" : "1.0");
  const [sex, setSex] = useState<Sex>("male");
  const [indication, setIndication] = useState<DoacIndication>("nvaf");
  const [procRisk, setProcRisk] = useState<ProcedureBleedRisk>("low");
  const [bleedSev, setBleedSev] = useState<BleedSeverity>("major");
  const [andexxaMg, setAndexxaMg] = useState("5");
  const [andexxaHrs, setAndexxaHrs] = useState("4");

  const numAge = Number(age) || 68;
  const numWt = Number(weight) || 70;
  const numScr = Number(scr) || 1.0;

  const crclCalc = crclOf({ age: numAge, weightKg: numWt, scr: numScr, sex });
  const crcl = crclCalc?.crcl ?? 75;

  const report = doacReportOnDesk(ids, host, {
    age: numAge,
    weightKg: numWt,
    scr: numScr,
    sex,
    indication,
    procedureRisk: procRisk,
    bleedSeverity: bleedSev,
  });

  const apixabanAbc = report.apixabanAbc ?? evaluateApixabanAbc({ age: numAge, weightKg: numWt, scr: numScr, indication });

  const activeDrugForAndexxa: "apixaban" | "rivaroxaban" = report.anticoagulantsOnDesk.includes("rivaroxaban") ? "rivaroxaban" : "apixaban";
  const andexxaCalc = calculateAndexxaDose(activeDrugForAndexxa, Number(andexxaMg) || 5, Number(andexxaHrs) || 4);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-serif text-lg tracking-tight text-fg">DOAC & Bleed Management Desk</h3>
          <p className="mt-1 text-xs text-muted">
            Apixaban ABC criteria, renal rails, Edoxaban Black Box alert, Dabigatran capsule integrity, perioperative hold schedules, and reversal nomograms (Andexxa, Praxbind, 4F-PCC).
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {report.anticoagulantsOnDesk.map((id) => (
            <Badge key={id} tone="warn">
              {DRUG_BY_ID[id]?.name ?? id}
            </Badge>
          ))}
          {report.reversalsOnDesk.map((id) => (
            <Badge key={id} tone="info">
              {DRUG_BY_ID[id]?.name ?? id}
            </Badge>
          ))}
          {!report.anticoagulantsOnDesk.length && !report.reversalsOnDesk.length && (
            <Badge tone="default">Reference Mode</Badge>
          )}
        </div>
      </div>

      {/* Patient Physiology & Indication Bar */}
      <article className="rounded-md bg-bg-sunken p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-serif text-sm font-semibold text-fg">1. Patient Physiology & Indication</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Cockcroft–Gault CrCl:</span>
            <span className={cn(
              "font-mono text-sm font-bold px-2 py-0.5 rounded",
              crcl < 30 ? "bg-danger-soft text-danger" : crcl <= 50 ? "bg-warn-soft text-warn" : "bg-accent-soft text-accent"
            )}>
              {crcl} mL/min
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-muted">
            Age (years)
            <Input className="mt-1" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            Total Body Weight (kg)
            <Input className="mt-1" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </label>
          <label className="text-xs text-muted">
            Serum Creatinine (mg/dL)
            <Input className="mt-1" inputMode="decimal" value={scr} onChange={(e) => setScr(e.target.value)} />
          </label>
          <div className="text-xs text-muted">
            Biological Sex
            <div className="mt-1 flex gap-1">
              {(["male", "female"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={sex === s}
                  onClick={() => setSex(s)}
                  className={cn(
                    "h-9 flex-1 rounded text-xs font-medium",
                    sex === s ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
                  )}
                >
                  {s === "male" ? "Male" : "Female"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-border/50">
          <span className="text-[11px] font-medium text-muted block mb-1.5">Clinical Indication:</span>
          <div className="flex flex-wrap gap-1.5">
            {([
              { id: "nvaf", label: "Non-Valvular AF (Stroke Prevention)" },
              { id: "vte-treatment", label: "Acute DVT / PE Treatment" },
              { id: "vte-secondary", label: "Extended VTE Secondary Prevention" },
              { id: "vte-prophylaxis", label: "Orthopedic VTE Prophylaxis" },
            ] as const).map((ind) => (
              <button
                key={ind.id}
                type="button"
                aria-pressed={indication === ind.id}
                onClick={() => setIndication(ind.id)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  indication === ind.id ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
                )}
              >
                {ind.label}
              </button>
            ))}
          </div>
        </div>
      </article>

      {/* Section 2: Apixaban ABC Dose Reduction Criteria */}
      <article className="rounded-md border border-border bg-surface p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="font-serif text-base font-semibold text-fg">Apixaban (Eliquis) ABC Dose Reduction Rule</h4>
            <p className="text-xs text-muted mt-0.5">
              In Non-Valvular AF, reduce dose from 5 mg BID to 2.5 mg BID ONLY when patient meets ≥2 of 3 criteria.
            </p>
          </div>
          <span className={cn(
            "font-mono text-xs font-bold px-2.5 py-1 rounded",
            apixabanAbc.reductionIndicated ? "bg-warn-soft text-warn border border-warn/40" : "bg-accent-soft text-accent"
          )}>
            {apixabanAbc.criteriaMetCount}/3 Met: {apixabanAbc.recommendedDose}
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className={cn("rounded-md border p-2.5 text-xs", apixabanAbc.ageMet ? "border-warn/50 bg-warn-soft/30" : "border-border bg-bg-sunken")}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-fg">[A] Age ≥ 80 years</span>
              <span className="font-mono text-[11px]">{apixabanAbc.ageMet ? "MET (≥80)" : "NO (<80)"}</span>
            </div>
            <p className="mt-1 text-muted text-[11px]">Current age: {numAge} years</p>
          </div>

          <div className={cn("rounded-md border p-2.5 text-xs", apixabanAbc.weightMet ? "border-warn/50 bg-warn-soft/30" : "border-border bg-bg-sunken")}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-fg">[B] Weight ≤ 60 kg</span>
              <span className="font-mono text-[11px]">{apixabanAbc.weightMet ? "MET (≤60)" : "NO (>60)"}</span>
            </div>
            <p className="mt-1 text-muted text-[11px]">Current weight: {numWt} kg</p>
          </div>

          <div className={cn("rounded-md border p-2.5 text-xs", apixabanAbc.scrMet ? "border-warn/50 bg-warn-soft/30" : "border-border bg-bg-sunken")}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-fg">[C] SCr ≥ 1.5 mg/dL</span>
              <span className="font-mono text-[11px]">{apixabanAbc.scrMet ? "MET (≥1.5)" : "NO (<1.5)"}</span>
            </div>
            <p className="mt-1 text-muted text-[11px]">Current SCr: {numScr} mg/dL</p>
          </div>
        </div>

        <div className="rounded bg-bg-sunken p-3 text-xs space-y-1">
          <p className="font-medium text-fg">{apixabanAbc.rationale}</p>
          <p className="text-[11px] text-muted">{apixabanAbc.indicationNote}</p>
          <p className="text-[11px] text-subtle italic">{apixabanAbc.esrdDialysisNote}</p>
        </div>
      </article>

      {/* Section 3: Renal Rails & Critical Administration Safety */}
      <article className="rounded-md bg-bg-sunken p-4 space-y-3">
        <div>
          <h4 className="font-serif text-base font-semibold text-fg">DOAC Renal Dose Rails & Administration Safety</h4>
          <p className="text-xs text-muted mt-0.5">
            Organ clearance parameters, food bioequivalence rules, capsule integrity requirements, and hemodialysis clearance.
          </p>
        </div>

        <div className="space-y-3">
          {report.renalRails.map((rail) => (
            <div
              key={rail.agentId}
              className={cn(
                "rounded-md border p-3 text-xs space-y-1.5",
                rail.status === "black-box"
                  ? "border-danger bg-danger-soft/40"
                  : rail.status === "avoid"
                  ? "border-danger/40 bg-danger-soft/20"
                  : rail.status === "reduced"
                  ? "border-warn/40 bg-warn-soft/30"
                  : "border-border bg-surface",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-fg text-sm">{rail.agentName} {rail.brandName ? `(${rail.brandName})` : ""}</span>
                  <span className={cn(
                    "font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                    rail.status === "black-box" ? "bg-danger text-bg" : rail.status === "avoid" ? "bg-danger-soft text-danger" : rail.status === "reduced" ? "bg-warn-soft text-warn" : "bg-accent-soft text-accent"
                  )}>
                    {rail.status}
                  </span>
                </div>
                <span className="font-mono text-xs font-semibold text-fg">{rail.doseRecommendation}</span>
              </div>

              <p className="text-fg leading-relaxed font-medium">{rail.headline}</p>
              <p className="text-muted leading-relaxed">{rail.explanation}</p>

              {rail.foodRequirement && (
                <div className="rounded bg-warn-soft/60 border border-warn/30 p-2 text-[11px] text-fg font-medium">
                  {rail.foodRequirement}
                </div>
              )}

              {rail.capsuleIntegrityWarning && (
                <div className="rounded bg-danger-soft/50 border border-danger/30 p-2 text-[11px] text-fg font-medium">
                  {rail.capsuleIntegrityWarning}
                </div>
              )}

              {rail.dialysisRole && (
                <p className="text-[11px] text-subtle font-mono">{rail.dialysisRole}</p>
              )}
            </div>
          ))}
        </div>
      </article>

      {/* Section 4: Perioperative Interruption & Neuraxial Schedule */}
      <article className="rounded-md border border-border bg-surface p-4 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h4 className="font-serif text-base font-semibold text-fg">Perioperative Interruption & Neuraxial Schedule</h4>
            <p className="text-xs text-muted mt-0.5">
              Stratified by procedural bleed risk and CrCl (CHEST 2024 / ASRA 2022 guidelines). Rapid DOAC kinetics obviate heparin bridging.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {([
            { id: "minimal", label: "Minimal Risk (0–24h)" },
            { id: "low", label: "Low Bleed Risk (24–36h)" },
            { id: "high", label: "High Bleed Risk (48–72h)" },
            { id: "neuraxial", label: "Neuraxial / Spinal (ASRA 72–120h)" },
          ] as const).map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={procRisk === r.id}
              onClick={() => setProcRisk(r.id)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                procRisk === r.id ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="space-y-2.5">
          {report.perioperativeHolds.map((h) => (
            <div key={h.agentId} className="rounded-md bg-bg-sunken p-3 text-xs space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="font-bold text-fg">{h.agentName}</span>
                <span className="font-mono text-xs font-bold text-warn">Hold: {h.holdDurationDisplay}</span>
              </div>
              <p className="text-fg">{h.preOpTimingSummary}</p>
              <p className="text-muted"><span className="font-medium text-fg">Post-op Resumption:</span> {h.postOpResumptionSummary}</p>
              <p className="text-muted"><span className="font-medium text-fg">Bridging:</span> {h.bridgingRecommendation}</p>
              {h.neuraxialSpecificGuidance && (
                <div className="rounded bg-accent-soft/40 p-2 text-[11px] text-fg font-medium">
                  {h.neuraxialSpecificGuidance}
                </div>
              )}
            </div>
          ))}
        </div>
      </article>

      {/* Section 5: Acute Bleed Management & Reversal Nomogram */}
      <article className="rounded-md bg-bg-sunken p-4 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h4 className="font-serif text-base font-semibold text-fg">Acute Bleed Management & Reversal Nomogram</h4>
            <p className="text-xs text-muted mt-0.5">
              Specific antidotes (Andexxa, Praxbind), 4F-PCC rescue, dialysis role, and laboratory assays.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {([
            { id: "minor", label: "Minor Bleed (Local Measures)" },
            { id: "major", label: "Major / Life-Threatening Bleed" },
            { id: "urgent-procedure", label: "Urgent Procedure / Surgery" },
          ] as const).map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={bleedSev === s.id}
              onClick={() => setBleedSev(s.id)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                bleedSev === s.id ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Andexxa Dosing Calculator Sub-card */}
        {(report.anticoagulantsOnDesk.includes("apixaban") || report.anticoagulantsOnDesk.includes("rivaroxaban")) && bleedSev !== "minor" && (
          <div className="rounded-md border border-accent/40 bg-surface p-3 text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="font-serif font-bold text-fg">
                Andexanet alfa (Andexxa) Sizing Calculator — {activeDrugForAndexxa === "apixaban" ? "Apixaban" : "Rivaroxaban"}
              </span>
              <span className={cn(
                "font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded",
                andexxaCalc.isHighDose ? "bg-danger text-bg" : "bg-accent text-bg"
              )}>
                {andexxaCalc.isHighDose ? "High-Dose Protocol" : "Low-Dose Protocol"}
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-muted text-[11px]">
                Last Ingested Dose (mg)
                <Input className="mt-1" inputMode="numeric" value={andexxaMg} onChange={(e) => setAndexxaMg(e.target.value)} />
              </label>
              <label className="text-muted text-[11px]">
                Hours Since Last Dose (hrs)
                <Input className="mt-1" inputMode="numeric" value={andexxaHrs} onChange={(e) => setAndexxaHrs(e.target.value)} />
              </label>
            </div>

            <div className="rounded bg-bg-sunken p-2.5 space-y-1 text-[11px]">
              <p className="text-fg font-medium">{andexxaCalc.rationale}</p>
              <p className="font-mono text-fg"><span className="font-semibold text-accent">IV Bolus:</span> {andexxaCalc.ivBolus}</p>
              <p className="font-mono text-fg"><span className="font-semibold text-accent">Continuous Infusion:</span> {andexxaCalc.continuousInfusion}</p>
              <p className="text-subtle font-mono">Vial preparation: {andexxaCalc.totalVials100mg} × 100 mg vials (or {andexxaCalc.totalVials200mg} × 200 mg vials).</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {report.reversals.map((rev) => (
            <div key={rev.agentId} className="rounded-md border border-border bg-surface p-3 text-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="font-bold text-fg text-sm">{rev.agentName}: {rev.headline}</span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-fg">Immediate Hemostatic Actions:</span>
                {rev.immediateActions.map((act, idx) => (
                  <p key={idx} className="text-muted leading-relaxed">• {act}</p>
                ))}
              </div>

              {rev.specificAntidote && (
                <div className="rounded bg-accent-soft/30 p-2.5 border border-accent/30 space-y-0.5">
                  <span className="font-bold text-accent block">Specific Antidote: {rev.specificAntidote.name} ({rev.specificAntidote.brand})</span>
                  <p className="text-fg">{rev.specificAntidote.regimen}</p>
                  <p className="text-[11px] text-muted">{rev.specificAntidote.mechanism}</p>
                </div>
              )}

              <div className="rounded bg-bg-sunken p-2.5 space-y-0.5 text-[11px]">
                <span className="font-semibold text-fg block">Non-Specific Alternative: {rev.nonSpecificAlternative.agent}</span>
                <p className="text-fg font-mono">{rev.nonSpecificAlternative.dosing}</p>
                <p className="text-muted">{rev.nonSpecificAlternative.caution}</p>
              </div>

              {rev.hemodialysisRole.isDialyzable && (
                <div className="rounded bg-warn-soft/40 border border-warn/30 p-2 text-[11px] text-fg">
                  <span className="font-bold text-warn block">Hemodialysis Clearance: {rev.hemodialysisRole.clearancePct}</span>
                  {rev.hemodialysisRole.note}
                </div>
              )}

              <div className="text-[11px] text-subtle">
                <span className="font-medium text-fg">Target Labs: </span>
                {rev.monitoringLabs.join(" · ")}
              </div>
            </div>
          ))}
        </div>
      </article>

      {/* Section 6: Pharmacological Collisions & Bleed Synergy */}
      {report.collisions.length > 0 && (
        <article className="rounded-md border border-warn/40 bg-warn-soft/20 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-serif text-sm font-semibold text-fg">Anticoagulant Drug Collisions & Bleed Amplifiers</span>
            <span className="font-mono text-xs font-bold text-warn">{report.collisions.length} Collisions Flagged</span>
          </div>
          <div className="space-y-2">
            {report.collisions.map((col, idx) => (
              <div key={idx} className="rounded bg-surface p-2.5 text-xs border border-border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-fg">{col.headline}</span>
                  <span className={cn(
                    "font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded",
                    col.severity === "contraindicated" ? "bg-danger text-bg" : col.severity === "major" ? "bg-warn-soft text-warn" : "bg-accent-soft text-accent"
                  )}>
                    {col.severity}
                  </span>
                </div>
                <p className="text-muted">{col.mechanism}</p>
                <p className="text-fg font-medium">{col.clinicalAction}</p>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* Key Takeaways & Educational Disclaimer */}
      <div className="rounded-md bg-accent-soft/30 p-3 space-y-1 text-xs">
        <span className="font-semibold text-accent block">Core Anticoagulation Takeaways:</span>
        {report.clinicalTakeaways.map((tip, idx) => (
          <p key={idx} className="text-fg leading-relaxed">• {tip}</p>
        ))}
      </div>

      <p className="text-[11px] leading-relaxed text-subtle">
        Educational clinical pharmacology reference only (non-device CDS). Dosing rails paraphrase FDA Prescribing Information and CHEST/ACC/AHA/ASRA guidelines. Hemostatic intervention, procedural hold intervals, and antidote selection require independent clinical evaluation.
      </p>
    </div>
  );
}

function ValproatePanel({ ids, host }: { ids: string[]; host: HostContext }) {
  const [totalLevel, setTotalLevel] = useState("75");
  const [albumin, setAlbumin] = useState(host.kidney === "ckd" ? "3.0" : "4.0");
  const [ammonia, setAmmonia] = useState("35");
  const [weight, setWeight] = useState("70");
  const [hasSymptoms, setHasSymptoms] = useState(false);
  const [astAltElevated, setAstAltElevated] = useState(false);
  const [carnitineIndication, setCarnitineIndication] = useState<"hyperammonemic-encephalopathy" | "acute-severe-overdose" | "asymptomatic-mild">("hyperammonemic-encephalopathy");

  const numTotal = Number(totalLevel) || 75;
  const numAlbumin = Number(albumin) || 4.0;
  const numAmmonia = Number(ammonia) || 35;
  const numWeight = Number(weight) || 70;

  const levelEval = evaluateValproateLevel({ totalMcgMl: numTotal, albuminGDl: numAlbumin });
  const vheEval = evaluateVhe({
    ammoniaUmolL: numAmmonia,
    astAltElevated,
    hasEncephalopathySymptoms: hasSymptoms,
    hasTopiramate: ids.includes("topiramate"),
  });
  const carnitineDosing = calculateCarnitineDosing(numWeight, vheEval.carnitineIndicated ? "hyperammonemic-encephalopathy" : carnitineIndication);
  const collisions = findValproateCollisions(ids);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-serif text-lg tracking-tight text-fg">Valproate Pharmacokinetics & Hyperammonemia Station</h3>
          <p className="mt-1 text-xs text-muted">
            Saturable albumin binding (Hermida free level equation), hyperammonemic encephalopathy (VHE), normal LFT diagnostic trap, and IV L-Carnitine antidote sizing.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge tone="warn">Valproate (Depakote)</Badge>
          {ids.some((id) => CARBAPENEM_IDS.has(id)) && <Badge tone="danger">Carbapenem Crash</Badge>}
          {ids.includes("lamotrigine") && <Badge tone="danger">Lamotrigine UGT Collision</Badge>}
          {ids.includes("topiramate") && <Badge tone="warn">Topiramate VHE Synergy</Badge>}
        </div>
      </div>

      {/* Section 1: Saturable Protein Binding & Free Valproate Estimator */}
      <article className="rounded-md bg-bg-sunken p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="font-serif text-sm font-semibold text-fg">1. Saturable Protein Binding & Free Valproate Estimator</h4>
            <p className="text-xs text-muted mt-0.5">
              Albumin binding sites saturate above 75–100 mcg/mL or in hypoalbuminemia, causing unbound active drug to surge non-linearly.
            </p>
          </div>
          <span className={cn(
            "font-mono text-xs font-bold px-2 py-0.5 rounded",
            levelEval.freeBand === "toxic" ? "bg-danger text-bg" : levelEval.freeBand === "elevated" ? "bg-warn-soft text-warn" : "bg-accent-soft text-accent"
          )}>
            Est. Free: {levelEval.estimatedFreeMcgMl} mcg/mL ({levelEval.freeBand.toUpperCase()})
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-muted">
            Total Valproate (mcg/mL)
            <Input className="mt-1" inputMode="decimal" value={totalLevel} onChange={(e) => setTotalLevel(e.target.value)} />
            <span className="text-[10px] text-subtle block mt-0.5">Target: 50–100 (epilepsy), ≤125 (mania)</span>
          </label>
          <label className="text-xs text-muted">
            Serum Albumin (g/dL)
            <Input className="mt-1" inputMode="decimal" value={albumin} onChange={(e) => setAlbumin(e.target.value)} />
            <span className="text-[10px] text-subtle block mt-0.5">Normal: 3.5–5.0 g/dL</span>
          </label>
          <div className="rounded bg-surface p-2.5 border border-border text-xs space-y-0.5">
            <span className="text-muted block text-[11px]">Estimated Free Fraction:</span>
            <span className="font-mono text-base font-bold text-fg">{levelEval.estimatedFreeFractionPct}%</span>
            <span className="text-[10px] text-subtle block">Baseline: ~10% (expands to 25–40%+)</span>
          </div>
          <div className="rounded bg-surface p-2.5 border border-border text-xs space-y-0.5">
            <span className="text-muted block text-[11px]">Free Therapeutic Target:</span>
            <span className="font-mono text-base font-bold text-accent">5–15 mcg/mL</span>
            <span className="text-[10px] text-subtle block">Hermida normalization</span>
          </div>
        </div>

        {levelEval.saturationWarning && (
          <div className="rounded-md bg-warn-soft/60 border border-warn/40 p-2.5 text-xs text-fg space-y-1">
            <span className="font-bold text-warn block">BINDING SATURATION WARNING:</span>
            <p className="leading-relaxed">{levelEval.clinicalInterpretation}</p>
          </div>
        )}

        <div className="rounded bg-surface p-2.5 border border-border/70 text-[11px] text-muted space-y-0.5">
          <span className="font-semibold text-fg">Clinical Pharmacology Rule: </span>
          {levelEval.pearl}
        </div>
      </article>

      {/* Section 2: Hyperammonemic Encephalopathy & Normal LFT Trap */}
      <article className="rounded-md border border-border bg-surface p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="font-serif text-base font-semibold text-fg">2. Hyperammonemic Encephalopathy (VHE) Evaluator</h4>
            <p className="text-xs text-muted mt-0.5">
              Valproate metabolite inhibition of N-acetylglutamate synthase (NAGS) depletes urea cycle activation.
            </p>
          </div>
          <span className={cn(
            "font-mono text-xs font-bold px-2 py-0.5 rounded",
            vheEval.riskTier === "confirmed-vhe" ? "bg-danger text-bg" : vheEval.riskTier === "high-risk-vhe" ? "bg-warn-soft text-warn" : "bg-accent-soft text-accent"
          )}>
            {vheEval.headline}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-muted">
            Serum Ammonia (µmol/L)
            <Input className="mt-1" inputMode="numeric" value={ammonia} onChange={(e) => setAmmonia(e.target.value)} />
            <span className="text-[10px] text-subtle block mt-0.5">Normal: 15–45 µmol/L</span>
          </label>

          <div className="text-xs text-muted">
            Encephalopathy Symptoms
            <button
              type="button"
              aria-pressed={hasSymptoms}
              onClick={() => setHasSymptoms(!hasSymptoms)}
              className={cn(
                "mt-1 w-full h-9 rounded text-xs font-medium border transition-colors",
                hasSymptoms ? "bg-danger text-bg border-danger" : "bg-bg-sunken text-muted border-border hover:text-fg",
              )}
            >
              {hasSymptoms ? "Lethargy / Asterixis / Confusion PRESENT" : "No Acute Encephalopathy"}
            </button>
            <span className="text-[10px] text-subtle block mt-0.5">Ataxia, stupor, paradoxical seizures</span>
          </div>

          <div className="text-xs text-muted">
            Liver Transaminases (AST/ALT)
            <button
              type="button"
              aria-pressed={astAltElevated}
              onClick={() => setAstAltElevated(!astAltElevated)}
              className={cn(
                "mt-1 w-full h-9 rounded text-xs font-medium border transition-colors",
                astAltElevated ? "bg-warn-soft text-warn border-warn/40" : "bg-bg-sunken text-muted border-border hover:text-fg",
              )}
            >
              {astAltElevated ? "Elevated Transaminases (Hepatitis)" : "Completely Normal LFTs (Typical)"}
            </button>
            <span className="text-[10px] text-subtle block mt-0.5">VHE commonly presents with normal LFTs</span>
          </div>
        </div>

        {/* Normal LFT Trap Box */}
        <div className="rounded-md bg-danger-soft/40 border border-danger/40 p-3 text-xs space-y-1">
          <span className="font-bold text-danger block uppercase tracking-wide">NORMAL LFT DIAGNOSTIC TRAP:</span>
          <p className="text-fg leading-relaxed">{vheEval.normalLftTrapAlert}</p>
        </div>

        {vheEval.topiramateSynergyAlert && (
          <div className="rounded-md bg-warn-soft/60 border border-warn/40 p-3 text-xs space-y-1">
            <span className="font-bold text-warn block">TOPIRAMATE SYNERGY DETECTED:</span>
            <p className="text-fg leading-relaxed">{vheEval.topiramateSynergyAlert}</p>
          </div>
        )}

        {vheEval.recommendedActions.length > 0 && (
          <div className="rounded bg-bg-sunken p-3 text-xs space-y-1">
            <span className="font-semibold text-fg block">Urgent Clinical Management Actions:</span>
            {vheEval.recommendedActions.map((act, idx) => (
              <p key={idx} className="text-muted leading-relaxed font-mono text-[11px]">• {act}</p>
            ))}
          </div>
        )}
      </article>

      {/* Section 3: L-Carnitine Antidote Protocol */}
      <article className="rounded-md bg-bg-sunken p-4 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h4 className="font-serif text-base font-semibold text-fg">3. IV L-Carnitine (Levocarnitine / Carnitor) Antidote Protocol</h4>
            <p className="text-xs text-muted mt-0.5">
              Valproate depletes mitochondrial carnitine stores. High-dose IV levocarnitine restores beta-oxidation and clears ammonia.
            </p>
          </div>
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-accent text-bg">
            Loading Dose: {carnitineDosing.ivLoadingDoseMg} mg IV
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {([
            { id: "hyperammonemic-encephalopathy", label: "Hyperammonemic Encephalopathy (VHE)" },
            { id: "acute-severe-overdose", label: "Acute Massive Overdose (>100 mg/kg)" },
            { id: "asymptomatic-mild", label: "Mild / Maintenance Replenishment" },
          ] as const).map((ind) => (
            <button
              key={ind.id}
              type="button"
              aria-pressed={carnitineIndication === ind.id}
              onClick={() => setCarnitineIndication(ind.id)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                carnitineIndication === ind.id ? "bg-ink text-bg" : "bg-surface text-muted hover:text-fg",
              )}
            >
              {ind.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-muted">
            Patient Body Weight (kg)
            <Input className="mt-1" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </label>
          <div className="rounded bg-surface p-2.5 border border-border text-xs space-y-0.5">
            <span className="text-muted text-[11px] block">IV Loading Regimen (100 mg/kg):</span>
            <span className="font-mono text-base font-bold text-fg">{carnitineDosing.ivLoadingDoseMg} mg IV</span>
            <span className="text-[10px] text-subtle block">({carnitineDosing.ivLoadingDoseVials} × 1 g / 5 mL vials over 30 min, max 6 g)</span>
          </div>
          <div className="rounded bg-surface p-2.5 border border-border text-xs space-y-0.5">
            <span className="text-muted text-[11px] block">IV Maintenance Regimen (50 mg/kg):</span>
            <span className="font-mono text-base font-bold text-fg">{carnitineDosing.ivMaintenanceDoseMg} mg IV</span>
            <span className="text-[10px] text-subtle block">{carnitineDosing.ivMaintenanceFrequency}</span>
          </div>
        </div>

        <div className="rounded bg-surface p-2.5 border border-border/70 text-[11px] text-muted space-y-1">
          <p className="text-fg font-medium">{carnitineDosing.durationGuidance}</p>
          <p className="text-subtle">{carnitineDosing.administrationNote}</p>
        </div>
      </article>

      {/* Section 4: Severe Drug Collisions */}
      {collisions.length > 0 && (
        <article className="rounded-md border border-warn/40 bg-warn-soft/20 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-serif text-sm font-semibold text-fg">Valproate Drug Collisions on Active Tray</span>
            <span className="font-mono text-xs font-bold text-warn">{collisions.length} Collisions Flagged</span>
          </div>
          <div className="space-y-2">
            {collisions.map((col, idx) => (
              <div key={idx} className="rounded bg-surface p-3 text-xs border border-border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-fg">{col.headline}</span>
                  <span className={cn(
                    "font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded",
                    col.severity === "contraindicated" ? "bg-danger text-bg" : col.severity === "major" ? "bg-warn-soft text-warn" : "bg-accent-soft text-accent"
                  )}>
                    {col.severity}
                  </span>
                </div>
                <p className="text-muted leading-relaxed">{col.mechanism}</p>
                <p className="text-fg font-medium leading-relaxed">{col.clinicalAction}</p>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* Section 5: Black Box Warnings & Teratogenicity */}
      <article className="rounded-md bg-danger-soft/30 border border-danger/30 p-4 space-y-2 text-xs">
        <span className="font-serif font-bold text-danger block text-sm">FDA Boxed Warnings & Clinical Safety Rails</span>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded bg-surface p-2 border border-border">
            <span className="font-semibold text-fg block">Teratogenicity:</span>
            <p className="text-muted text-[11px] mt-0.5 leading-relaxed">
              Neural tube defects (spina bifida 1–2%), facial clefts, and permanent neurodevelopmental IQ drop. Contraindicated in pregnancy for migraine; avoid in epilepsy/bipolar.
            </p>
          </div>
          <div className="rounded bg-surface p-2 border border-border">
            <span className="font-semibold text-fg block">Hepatotoxicity:</span>
            <p className="text-muted text-[11px] mt-0.5 leading-relaxed">
              LiverTox Category A. Highest risk in children &lt;2 years and patients with hereditary mitochondrial POLG mutations.
            </p>
          </div>
          <div className="rounded bg-surface p-2 border border-border">
            <span className="font-semibold text-fg block">Pancreatitis:</span>
            <p className="text-muted text-[11px] mt-0.5 leading-relaxed">
              Hemorrhagic / necrotizing pancreatitis can occur rapidly regardless of duration of therapy. Discontinue if severe abdominal pain develops.
            </p>
          </div>
        </div>
      </article>

      <p className="text-[11px] leading-relaxed text-subtle">
        Educational clinical pharmacology reference only (non-device CDS). Valproic acid displays non-linear protein binding kinetics. Therapeutic drug monitoring, ammonia interpretation, and L-carnitine administration require individualized medical toxicologic evaluation.
      </p>
    </div>
  );
}

function PotassiumPanel({ ids, host }: { ids: string[]; host: HostContext }) {
  const potOn = useMemo(() => potassiumOnDesk(ids), [ids.join("|")]);

  // Initial defaults
  const initialK = potOn.perpetratorCount >= 3 ? "6.6" : potOn.perpetratorCount >= 2 ? "6.1" : potOn.hasPerpetrator ? "5.4" : "6.2";
  const initialEgfr = host.kidney === "ckd" ? "28" : "65";
  const initialUrine: UrineOutputStatus = host.kidney === "ckd" ? "oliguric" : "normal";

  const [potassiumInput, setPotassiumInput] = useState(initialK);
  const [egfrInput, setEgfrInput] = useState(initialEgfr);
  const [ecgFinding, setEcgFinding] = useState<EcgFinding>(Number(initialK) >= 6.0 ? "peaked-t" : "normal");
  const [urineOutput, setUrineOutput] = useState<UrineOutputStatus>(initialUrine);
  const [glucoseInput, setGlucoseInput] = useState("140");
  const [acidosisPresent, setAcidosisPresent] = useState(false);

  const numK = Number(potassiumInput) || 5.0;
  const numEgfr = Number(egfrInput) || 60;
  const numGlucose = Number(glucoseInput) || 140;

  const evaluation = useMemo(() => {
    const res = evaluatePotassium({
      potassiumMeqL: numK,
      egfrMlMin: numEgfr,
      ecgFinding,
      urineOutput,
      baselineGlucoseMgDl: numGlucose,
      regimenIds: ids,
    });
    if (acidosisPresent) {
      res.intracellularShifting.sodiumBicarbonateGuidance.indicated = true;
    }
    return res;
  }, [numK, numEgfr, ecgFinding, urineOutput, numGlucose, ids.join("|"), acidosisPresent]);

  const presets = [
    {
      label: "Severe HyperK with Peaked T",
      k: "6.8",
      egfr: "45",
      ecg: "peaked-t" as EcgFinding,
      urine: "normal" as UrineOutputStatus,
      bg: "150",
      acidosis: false,
    },
    {
      label: "CKD Triad (ACEi+MRA+Bactrim)",
      k: "6.4",
      egfr: "22",
      ecg: "pr-prolongation" as EcgFinding,
      urine: "oliguric" as UrineOutputStatus,
      bg: "125",
      acidosis: false,
    },
    {
      label: "Mild Outpatient on Lisinopril",
      k: "5.3",
      egfr: "65",
      ecg: "normal" as EcgFinding,
      urine: "normal" as UrineOutputStatus,
      bg: "140",
      acidosis: false,
    },
    {
      label: "Dialysis Anuric Crash",
      k: "7.4",
      egfr: "8",
      ecg: "sine-wave" as EcgFinding,
      urine: "anuric" as UrineOutputStatus,
      bg: "180",
      acidosis: true,
    },
    {
      label: "Digoxin Toxicity Collision",
      k: "6.1",
      egfr: "35",
      ecg: "normal" as EcgFinding,
      urine: "normal" as UrineOutputStatus,
      bg: "130",
      acidosis: false,
    },
  ];

  const ecgOptions: { value: EcgFinding; label: string }[] = [
    { value: "normal", label: "Normal Sinus" },
    { value: "peaked-t", label: "Peaked T Waves" },
    { value: "pr-prolongation", label: "PR Prolongation" },
    { value: "p-loss", label: "Loss of P Waves" },
    { value: "qrs-widening", label: "QRS Widening" },
    { value: "sine-wave", label: "Sine Wave Pattern" },
    { value: "none-documented", label: "Not Documented" },
  ];

  const urineOptions: { value: UrineOutputStatus; label: string }[] = [
    { value: "normal", label: "Normal (>0.5 mL/kg/h)" },
    { value: "oliguric", label: "Oliguric (<500 mL/24h)" },
    { value: "anuric", label: "Anuric (<50 mL/24h)" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-serif text-lg tracking-tight text-fg">
            Hyperkalemia, Potassium Homeostasis & Cardioprotective Shifting Station
          </h3>
          <p className="mt-1 text-xs text-muted">
            Membrane electrophysiology, EKG progression stages, 3-step stabilization nomogram (Calcium · Insulin/Dextrose/Albuterol · Diuretic/Binders/HD), and perpetrator triage.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge tone={evaluation.severityTier === "severe-emergency" ? "danger" : evaluation.severityTier === "moderate" ? "warn" : evaluation.severityTier === "mild" ? "info" : "ok"}>
            Tier: {evaluation.severityTier.toUpperCase()}
          </Badge>
          {potOn.hasRaas && <Badge tone="warn">RAASi on Desk</Badge>}
          {potOn.hasMra && <Badge tone="danger">MRA on Desk</Badge>}
          {potOn.hasEnac && <Badge tone="danger">ENaC / Bactrim</Badge>}
          {potOn.hasCni && <Badge tone="warn">Calcineurin Inhibitor</Badge>}
          {potOn.hasBinder && <Badge tone="info">Active GI Binder</Badge>}
        </div>
      </div>

      {/* Preset Scenarios */}
      <div className="rounded-md border border-border bg-surface p-3 space-y-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted font-bold block">
          Clinical Simulation Presets:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p, idx) => {
            const isMatch = potassiumInput === p.k && egfrInput === p.egfr && ecgFinding === p.ecg && urineOutput === p.urine;
            return (
              <button
                key={idx}
                type="button"
                aria-pressed={isMatch}
                onClick={() => {
                  setPotassiumInput(p.k);
                  setEgfrInput(p.egfr);
                  setEcgFinding(p.ecg);
                  setUrineOutput(p.urine);
                  setGlucoseInput(p.bg);
                  setAcidosisPresent(p.acidosis);
                }}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition",
                  isMatch ? "bg-ink text-bg font-semibold" : "bg-bg-sunken text-fg hover:bg-surface-elevated"
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Inputs Grid */}
      <article className="rounded-md bg-bg-sunken p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
          <h4 className="font-serif text-sm font-semibold text-fg">Patient Laboratory & Bedside Parameters</h4>
          <span className="font-mono text-xs text-muted">
            Modeled K+: <strong className="text-fg">{numK.toFixed(1)} mEq/L</strong> | eGFR: <strong className="text-fg">{numEgfr} mL/min</strong>
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-muted">
            Serum Potassium (mEq/L)
            <Input
              className="mt-1"
              inputMode="decimal"
              value={potassiumInput}
              onChange={(e) => setPotassiumInput(e.target.value)}
            />
            <span className="text-[10px] text-subtle block mt-0.5">Normal: 3.5–5.0 mEq/L | Critical: &ge;6.5</span>
          </label>

          <label className="text-xs text-muted">
            Estimated GFR (mL/min/1.73m²)
            <Input
              className="mt-1"
              inputMode="decimal"
              value={egfrInput}
              onChange={(e) => setEgfrInput(e.target.value)}
            />
            <span className="text-[10px] text-subtle block mt-0.5">CKD cutoff: &lt;30 mL/min halves insulin dose</span>
          </label>

          <label className="text-xs text-muted">
            Baseline Glucose (mg/dL)
            <Input
              className="mt-1"
              inputMode="decimal"
              value={glucoseInput}
              onChange={(e) => setGlucoseInput(e.target.value)}
            />
            <span className="text-[10px] text-subtle block mt-0.5">Omit D50W push if BG &ge; 250 mg/dL</span>
          </label>

          <div>
            <span className="text-xs text-muted block mb-1">Severe Metabolic Acidosis</span>
            <button
              type="button"
              aria-pressed={acidosisPresent}
              onClick={() => setAcidosisPresent(!acidosisPresent)}
              className={cn(
                "w-full rounded h-9 text-xs font-medium border text-center transition",
                acidosisPresent ? "bg-warn-soft text-warn border-warn/40 font-bold" : "bg-surface text-muted border-border hover:text-fg"
              )}
            >
              {acidosisPresent ? "pH < 7.20 / HCO3 < 15 (Present)" : "Non-Acidemic Baseline"}
            </button>
            <span className="text-[10px] text-subtle block mt-0.5">Only acidemic patients respond to NaHCO3</span>
          </div>
        </div>

        {/* EKG & Urine Output Selectors */}
        <div className="grid gap-3 md:grid-cols-2 pt-1">
          <div>
            <span className="text-xs text-muted block mb-1.5 font-medium">12-Lead EKG Finding:</span>
            <div className="flex flex-wrap gap-1">
              {ecgOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={ecgFinding === opt.value}
                  onClick={() => setEcgFinding(opt.value)}
                  className={cn(
                    "rounded px-2 py-1 text-[11px] font-medium border transition",
                    ecgFinding === opt.value
                      ? opt.value === "sine-wave" || opt.value === "qrs-widening" || opt.value === "peaked-t"
                        ? "bg-danger text-bg border-danger font-bold"
                        : "bg-ink text-bg border-ink font-semibold"
                      : "bg-surface text-muted border-border hover:text-fg"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs text-muted block mb-1.5 font-medium">Urine Output Status:</span>
            <div className="flex flex-wrap gap-1">
              {urineOptions.map((u) => (
                <button
                  key={u.value}
                  type="button"
                  aria-pressed={urineOutput === u.value}
                  onClick={() => setUrineOutput(u.value)}
                  className={cn(
                    "rounded px-2.5 py-1 text-[11px] font-medium border transition",
                    urineOutput === u.value ? "bg-ink text-bg border-ink font-bold" : "bg-surface text-muted border-border hover:text-fg"
                  )}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </article>

      {/* Severity Headline & EKG Dissociation Warning */}
      <article className={cn(
        "rounded-md p-4 border space-y-2",
        evaluation.severityTier === "severe-emergency"
          ? "bg-danger-soft/30 border-danger/40"
          : evaluation.severityTier === "moderate"
          ? "bg-warn-soft/20 border-warn/30"
          : "bg-bg-sunken border-border"
      )}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-serif text-sm font-bold text-fg">{evaluation.headline}</span>
          <span className="font-mono text-xs font-bold text-muted">EKG: {ecgFinding.toUpperCase()}</span>
        </div>
        <p className="text-xs text-fg leading-relaxed">
          <strong className="text-fg">Electrophysiology: </strong>
          {evaluation.ecgInterpretation}
        </p>

        {evaluation.dissociationTrapAlert.includes("CRITICAL EKG DISSOCIATION TRAP") && (
          <div className="mt-2 rounded bg-surface/90 p-3 border border-warn text-xs space-y-1">
            <span className="font-mono text-[11px] font-bold uppercase text-warn block">
              Diagnostic Trap: EKG Dissociation
            </span>
            <p className="text-fg leading-relaxed">
              {evaluation.dissociationTrapAlert}
            </p>
          </div>
        )}
      </article>

      {/* The 3-Step Acute Treatment Nomogram */}
      <div className="space-y-4">
        <h4 className="font-serif text-base font-semibold text-fg">
          Acute 3-Step Stabilization & Shifting Nomogram
        </h4>

        {/* STEP 1: Myocardial Membrane Stabilization */}
        <article className="rounded-md border border-border bg-surface p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-danger text-[11px] font-bold text-bg">
                1
              </span>
              <h5 className="font-serif text-sm font-semibold text-fg">
                Myocardial Membrane Stabilization (Cardiac Protective)
              </h5>
            </div>
            <Badge tone={evaluation.membraneStabilization.indicated ? "danger" : "default"}>
              {evaluation.membraneStabilization.indicated ? "INDICATED STAT" : "MONITOR / RESERVE"}
            </Badge>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            {evaluation.membraneStabilization.rationale}
          </p>

          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <div className="rounded bg-bg-sunken p-3 border border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-fg">{evaluation.membraneStabilization.primaryAgent.name}</span>
                <span className="font-mono text-[10px] text-accent font-semibold">Peripheral IV Preferred</span>
              </div>
              <p className="font-mono text-sm font-bold text-fg">{evaluation.membraneStabilization.primaryAgent.dose}</p>
              <p className="text-muted text-[11px]">{evaluation.membraneStabilization.primaryAgent.infusionTime}</p>
              <div className="flex flex-wrap gap-2 pt-1 font-mono text-[10px] text-subtle">
                <span>Onset: {evaluation.membraneStabilization.primaryAgent.onset}</span>
                <span>Duration: {evaluation.membraneStabilization.primaryAgent.duration}</span>
                <span>Ca2+: {evaluation.membraneStabilization.primaryAgent.elementalCalciumMeq} mEq</span>
              </div>
              <p className="text-[10px] text-muted pt-0.5">{evaluation.membraneStabilization.primaryAgent.repeatInterval}</p>
            </div>

            <div className="rounded bg-bg-sunken p-3 border border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-fg">{evaluation.membraneStabilization.alternativeAgent.name}</span>
                <span className="font-mono text-[10px] text-danger font-semibold">Central Line Preferred</span>
              </div>
              <p className="font-mono text-sm font-bold text-fg">{evaluation.membraneStabilization.alternativeAgent.dose}</p>
              <p className="text-muted text-[11px]">{evaluation.membraneStabilization.alternativeAgent.infusionTime}</p>
              <div className="flex flex-wrap gap-2 pt-1 font-mono text-[10px] text-subtle">
                <span>Ca2+: {evaluation.membraneStabilization.alternativeAgent.elementalCalciumMeq} mEq (3x higher)</span>
              </div>
              <p className="text-[10px] text-danger font-medium leading-relaxed">
                {evaluation.membraneStabilization.alternativeAgent.specialAlert}
              </p>
            </div>
          </div>

          {evaluation.membraneStabilization.digoxinPrecaution.includes("DIGOXIN ALERT") && (
            <div className="rounded bg-warn-soft/30 p-2.5 border border-warn/30 text-xs text-fg leading-relaxed">
              <span className="font-mono font-bold text-warn text-[11px] block">Digoxin Warning:</span>
              {evaluation.membraneStabilization.digoxinPrecaution}
            </div>
          )}
        </article>

        {/* STEP 2: Intracellular Shifting */}
        <article className="rounded-md border border-border bg-surface p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-bg">
                2
              </span>
              <h5 className="font-serif text-sm font-semibold text-fg">
                Intracellular Shifting (Temporizing K+ Redistribution)
              </h5>
            </div>
            <Badge tone={evaluation.intracellularShifting.indicated ? "accent" : "default"}>
              {evaluation.intracellularShifting.indicated ? "ACTIVE SHIFT" : "BASELINE"}
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 text-xs">
            {/* Insulin + Dextrose */}
            <div className="rounded bg-bg-sunken p-3 border border-border space-y-1 sm:col-span-1">
              <span className="font-bold text-fg block">A. Regular Insulin IV Push</span>
              <span className="font-mono text-base font-bold text-accent block">
                {evaluation.intracellularShifting.insulinDoseUnits} Units IV
              </span>
              <p className="text-muted text-[11px] leading-relaxed">
                {evaluation.intracellularShifting.insulinAdjustmentReason}
              </p>
              <div className="mt-2 pt-1.5 border-t border-border/70 space-y-0.5">
                <span className="font-semibold text-fg block text-[11px]">Co-administered Dextrose:</span>
                <span className="font-mono text-xs font-bold text-fg">
                  {evaluation.intracellularShifting.dextroseRequirement.administer
                    ? "D50W 25 g (50 mL) IV"
                    : "Deferred (BG &ge; 250 mg/dL)"}
                </span>
                <p className="text-[10px] text-subtle leading-relaxed">
                  {evaluation.intracellularShifting.dextroseRequirement.reason}
                </p>
              </div>
            </div>

            {/* High-Dose Nebulized Albuterol */}
            <div className="rounded bg-bg-sunken p-3 border border-border space-y-1 sm:col-span-1">
              <span className="font-bold text-fg block">B. High-Dose Albuterol Nebulizer</span>
              <span className="font-mono text-base font-bold text-fg block">
                {evaluation.intracellularShifting.albuterolDosing.doseMg} to 20 mg Nebulized
              </span>
              <p className="text-[11px] text-accent font-medium">
                {evaluation.intracellularShifting.albuterolDosing.asthmaComparison}
              </p>
              <p className="text-muted text-[11px] leading-relaxed">
                {evaluation.intracellularShifting.albuterolDosing.onsetAndDuration}
              </p>
              <p className="text-subtle text-[10px] leading-relaxed pt-1">
                {evaluation.intracellularShifting.albuterolDosing.caution}
              </p>
            </div>

            {/* Sodium Bicarbonate */}
            <div className="rounded bg-bg-sunken p-3 border border-border space-y-1 sm:col-span-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-fg">C. Sodium Bicarbonate IV</span>
                <Badge tone={evaluation.intracellularShifting.sodiumBicarbonateGuidance.indicated ? "warn" : "default"}>
                  {evaluation.intracellularShifting.sodiumBicarbonateGuidance.indicated ? "INDICATED" : "NOT BENEFICIAL"}
                </Badge>
              </div>
              <p className="font-mono text-xs font-bold text-fg pt-1">
                {evaluation.intracellularShifting.sodiumBicarbonateGuidance.dose}
              </p>
              <p className="text-[11px] text-muted leading-relaxed">
                {evaluation.intracellularShifting.sodiumBicarbonateGuidance.acidosisRequirement}
              </p>
              <p className="text-[10px] text-subtle leading-relaxed pt-1">
                {evaluation.intracellularShifting.sodiumBicarbonateGuidance.ineffectiveWarning}
              </p>
            </div>
          </div>

          <div className="rounded bg-surface p-2.5 border border-border text-[11px] text-muted">
            <strong className="text-fg">Monitoring Cadence: </strong>
            {evaluation.intracellularShifting.glucoseMonitoringCadence}
          </div>
        </article>

        {/* STEP 3: Potassium Elimination */}
        <article className="rounded-md border border-border bg-surface p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-ok text-[11px] font-bold text-bg">
                3
              </span>
              <h5 className="font-serif text-sm font-semibold text-fg">
                Total Body Potassium Elimination (Actual Removal)
              </h5>
            </div>
            {evaluation.elimination.hemodialysis.emergentIndicated && (
              <Badge tone="danger">EMERGENT HD REQUIRED</Badge>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3 text-xs">
            {/* Loop Diuretic */}
            <div className="rounded bg-bg-sunken p-3 border border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-fg">A. Loop Diuretic</span>
                <Badge tone={evaluation.elimination.loopDiuretic.candidate ? "ok" : "default"}>
                  {evaluation.elimination.loopDiuretic.candidate ? "CANDIDATE" : "INEFFECTIVE"}
                </Badge>
              </div>
              <p className="font-mono text-sm font-bold text-fg">
                {evaluation.elimination.loopDiuretic.recommendedDose}
              </p>
              <p className="text-[11px] text-muted leading-relaxed">
                {evaluation.elimination.loopDiuretic.feasibilityNote}
              </p>
            </div>

            {/* Modern GI Binders */}
            <div className="rounded bg-bg-sunken p-3 border border-border space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-fg">B. Gastrointestinal Potassium Binders</span>
                <span className="font-mono text-[10px] text-muted">SZC vs Patiromer vs SPS</span>
              </div>

              <div className="grid gap-2 sm:grid-cols-3 text-[11px]">
                {/* Lokelma */}
                <div className="rounded bg-surface p-2 border border-border space-y-1">
                  <span className="font-bold text-fg block">SZC (Lokelma)</span>
                  <span className="font-mono text-[10px] font-bold text-ok block">Onset: ~1 hour (Rapid)</span>
                  <p className="text-muted text-[10px]">{evaluation.elimination.giBinders.szcLokelma.dose}</p>
                  <p className="text-subtle text-[9px]">{evaluation.elimination.giBinders.szcLokelma.sodiumLoadWarning}</p>
                </div>

                {/* Patiromer */}
                <div className="rounded bg-surface p-2 border border-border space-y-1">
                  <span className="font-bold text-fg block">Patiromer (Veltassa)</span>
                  <span className="font-mono text-[10px] font-bold text-accent block">Onset: 4–7 hours (Subacute)</span>
                  <p className="text-muted text-[10px]">{evaluation.elimination.giBinders.patiromerVeltassa.dose}</p>
                  <p className="text-warn text-[9px] font-medium">{evaluation.elimination.giBinders.patiromerVeltassa.drugSeparationWindow}</p>
                </div>

                {/* SPS */}
                <div className="rounded bg-surface p-2 border border-border space-y-1">
                  <span className="font-bold text-fg block">SPS (Kayexalate)</span>
                  <span className="font-mono text-[10px] font-bold text-danger block">Delayed & Erratic</span>
                  <p className="text-muted text-[10px]">{evaluation.elimination.giBinders.spsKayexalate.dose}</p>
                  <p className="text-danger text-[9px] font-semibold">{evaluation.elimination.giBinders.spsKayexalate.boxedWarningBowelNecrosis}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Emergent Hemodialysis Card */}
          <div className={cn(
            "rounded p-3 border text-xs space-y-1",
            evaluation.elimination.hemodialysis.emergentIndicated
              ? "bg-danger-soft/40 border-danger text-fg"
              : "bg-bg-sunken border-border text-muted"
          )}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-fg">C. Emergent Hemodialysis (Definitive Clearance)</span>
              <span className="font-mono text-[11px] font-semibold">
                {evaluation.elimination.hemodialysis.clearanceRateMeqPerHour}
              </span>
            </div>
            <p className="leading-relaxed">{evaluation.elimination.hemodialysis.summary}</p>
            {evaluation.elimination.hemodialysis.triggersPresent.length > 0 && (
              <div className="pt-1 flex flex-wrap gap-1 font-mono text-[10px]">
                {evaluation.elimination.hemodialysis.triggersPresent.map((trig, i) => (
                  <span key={i} className="rounded bg-surface px-1.5 py-0.5 border border-border">
                    • {trig}
                  </span>
                ))}
              </div>
            )}
          </div>
        </article>
      </div>

      {/* Perpetrator Audit on Regimen */}
      {evaluation.perpetrators.length > 0 ? (
        <article className="rounded-md border border-warn/40 bg-warn-soft/20 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-serif text-sm font-semibold text-fg">
              Active Hyperkalemic Perpetrators on Tray ({evaluation.perpetrators.length})
            </span>
            <span className="font-mono text-xs font-bold text-warn">Audit & Hold Actions</span>
          </div>
          <div className="space-y-2">
            {evaluation.perpetrators.map((perp, idx) => (
              <div key={idx} className="rounded bg-surface p-3 text-xs border border-border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-fg">{perp.name}</span>
                  <span className={cn(
                    "font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded",
                    perp.potency === "high" ? "bg-danger text-bg" : perp.potency === "moderate" ? "bg-warn-soft text-warn" : "bg-accent-soft text-accent"
                  )}>
                    {perp.category} ({perp.potency})
                  </span>
                </div>
                <p className="text-muted leading-relaxed">
                  <strong className="text-fg">Mechanism ({perp.nephronSite}): </strong>
                  {perp.mechanism}
                </p>
                <p className="text-fg font-medium leading-relaxed pt-0.5">
                  <strong className="text-accent">Recommended Hold Action: </strong>
                  {perp.recommendedHoldAction}
                </p>
              </div>
            ))}
          </div>
        </article>
      ) : (
        <article className="rounded-md bg-bg-sunken p-3 text-xs text-muted border border-border">
          No potassium-sparing diuretics, RAAS inhibitors, MRAs, or supplements detected on the current active desk tray. Add lisinopril, spironolactone, triamterene, Bactrim, or potassium supplements to model interactions.
        </article>
      )}

      {/* Clinical Pearls */}
      <article className="rounded-md bg-accent-soft/20 border border-accent/30 p-4 space-y-2 text-xs">
        <span className="font-serif font-bold text-accent block text-sm">
          High-Yield Clinical Pharmacology Pearls
        </span>
        <ul className="space-y-1.5 list-disc list-inside text-fg leading-relaxed">
          {evaluation.clinicalPearls.map((pearl, i) => (
            <li key={i}>{pearl}</li>
          ))}
        </ul>
      </article>

      <p className="text-[11px] leading-relaxed text-subtle">
        Educational clinical pharmacology reference only (non-device CDS). Cardioprotective shifting and potassium binder selection require institutional emergency protocols and individualized clinical judgment.
      </p>
    </div>
  );
}

function Sglt2Panel({ ids, host }: { ids: string[]; host: HostContext }) {
  const onDesk = useMemo(() => sglt2OnDesk(ids), [ids.join("|")]);

  // Initial inputs
  const [glucoseInput, setGlucoseInput] = useState("175");
  const [bicarbonateInput, setBicarbonateInput] = useState("13");
  const [anionGapInput, setAnionGapInput] = useState("17");
  const [betaOhbInput, setBetaOhbInput] = useState("3.8");
  const [arterialPhInput, setArterialPhInput] = useState("7.25");
  const [egfrInput, setEgfrInput] = useState(host.kidney === "ckd" ? "28" : "65");

  const numGlucose = Number(glucoseInput) || 100;
  const numBicarb = Number(bicarbonateInput) || 24;
  const numAnionGap = Number(anionGapInput) || 10;
  const numBetaOhb = Number(betaOhbInput) || 0.4;
  const numPh = Number(arterialPhInput) || 7.38;
  const numEgfr = Number(egfrInput) || 60;

  const euDkaEval = useMemo(() => {
    return evaluateEuDka({
      glucoseMgDl: numGlucose,
      bicarbonateMeqL: numBicarb,
      arterialPh: numPh,
      betaHydroxybutyrateMmolL: numBetaOhb,
      anionGap: numAnionGap,
    });
  }, [numGlucose, numBicarb, numPh, numBetaOhb, numAnionGap]);

  const preopSchedule = useMemo(() => calculatePreopHold(onDesk.sglt2Ids), [onDesk.sglt2Ids.join("|")]);
  const renalRails = useMemo(() => evaluateSglt2RenalRails(onDesk.sglt2Ids, numEgfr), [onDesk.sglt2Ids.join("|"), numEgfr]);
  const collisions = useMemo(() => findSglt2Collisions(ids), [ids.join("|")]);

  const presets = [
    {
      label: "Severe euDKA (Normal Glucose)",
      bg: "175",
      bicarb: "12",
      ag: "18",
      bohb: "4.2",
      ph: "7.24",
      egfr: "55",
    },
    {
      label: "Pre-Op Hold (Empagliflozin 3d)",
      bg: "135",
      bicarb: "24",
      ag: "10",
      bohb: "0.4",
      ph: "7.40",
      egfr: "65",
    },
    {
      label: "CKD Cardiorenal Rail (eGFR 26)",
      bg: "145",
      bicarb: "22",
      ag: "11",
      bohb: "0.5",
      ph: "7.36",
      egfr: "26",
    },
    {
      label: "Quadruple AKI Whammy",
      bg: "160",
      bicarb: "19",
      ag: "13",
      bohb: "1.2",
      ph: "7.32",
      egfr: "22",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-serif text-lg tracking-tight text-fg">
            SGLT2 Inhibitor Homeostasis, Euglycemic DKA & Perioperative Rails
          </h3>
          <p className="mt-1 text-xs text-muted">
            Euglycemic DKA diagnostic trap (glucose &lt; 250 mg/dL), Dextrose+Insulin resuscitation protocol, FDA 3-to-4 day surgical hold schedules, and cardiorenal eGFR rails.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge tone={euDkaEval.isEuDkaSuspected ? "danger" : "ok"}>
            {euDkaEval.isEuDkaSuspected ? "HIGH SUSPICION: euDKA" : "euDKA Unlikely"}
          </Badge>
          {onDesk.hasLoopDiuretic && <Badge tone="warn">Loop Diuretic Co-prescribed</Badge>}
          {onDesk.hasRaas && onDesk.hasNsaid && <Badge tone="danger">Quadruple AKI Risk</Badge>}
          {onDesk.hasSecretagogue && <Badge tone="warn">Secretagogue Stack</Badge>}
        </div>
      </div>

      {/* Preset Scenarios */}
      <div className="rounded-md border border-border bg-surface p-3 space-y-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted font-bold block">
          Clinical Simulation Presets:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p, idx) => {
            const isMatch =
              glucoseInput === p.bg &&
              bicarbonateInput === p.bicarb &&
              anionGapInput === p.ag &&
              betaOhbInput === p.bohb;
            return (
              <button
                key={idx}
                type="button"
                aria-pressed={isMatch}
                onClick={() => {
                  setGlucoseInput(p.bg);
                  setBicarbonateInput(p.bicarb);
                  setAnionGapInput(p.ag);
                  setBetaOhbInput(p.bohb);
                  setArterialPhInput(p.ph);
                  setEgfrInput(p.egfr);
                }}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition",
                  isMatch ? "bg-ink text-bg font-semibold" : "bg-bg-sunken text-fg hover:bg-surface-elevated"
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 1: Laboratory Parameters & euDKA Evaluator */}
      <article className="rounded-md bg-bg-sunken p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
          <h4 className="font-serif text-sm font-semibold text-fg">
            1. Acid-Base & Metabolic Parameters (euDKA Evaluator)
          </h4>
          <span className="font-mono text-xs text-muted">
            Glucose: <strong className="text-fg">{numGlucose} mg/dL</strong> | Anion Gap: <strong className="text-fg">{numAnionGap}</strong> | Bicarb: <strong className="text-fg">{numBicarb} mEq/L</strong>
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="text-xs text-muted">
            Blood Glucose (mg/dL)
            <Input
              className="mt-1"
              inputMode="decimal"
              value={glucoseInput}
              onChange={(e) => setGlucoseInput(e.target.value)}
            />
            <span className="text-[10px] text-subtle block mt-0.5">&lt;250 mg/dL in euDKA</span>
          </label>

          <label className="text-xs text-muted">
            Bicarbonate (mEq/L)
            <Input
              className="mt-1"
              inputMode="decimal"
              value={bicarbonateInput}
              onChange={(e) => setBicarbonateInput(e.target.value)}
            />
            <span className="text-[10px] text-subtle block mt-0.5">Critical: &lt;18 mEq/L</span>
          </label>

          <label className="text-xs text-muted">
            Serum Anion Gap
            <Input
              className="mt-1"
              inputMode="decimal"
              value={anionGapInput}
              onChange={(e) => setAnionGapInput(e.target.value)}
            />
            <span className="text-[10px] text-subtle block mt-0.5">Elevated: &gt;12 mEq/L</span>
          </label>

          <label className="text-xs text-muted">
            &beta;-Hydroxybutyrate (mmol/L)
            <Input
              className="mt-1"
              inputMode="decimal"
              value={betaOhbInput}
              onChange={(e) => setBetaOhbInput(e.target.value)}
            />
            <span className="text-[10px] text-subtle block mt-0.5">DKA Threshold: &ge;3.0</span>
          </label>

          <label className="text-xs text-muted">
            Arterial / Venous pH
            <Input
              className="mt-1"
              inputMode="decimal"
              value={arterialPhInput}
              onChange={(e) => setArterialPhInput(e.target.value)}
            />
            <span className="text-[10px] text-subtle block mt-0.5">Acidemia: &lt;7.30</span>
          </label>

          <label className="text-xs text-muted">
            eGFR (mL/min/1.73m²)
            <Input
              className="mt-1"
              inputMode="decimal"
              value={egfrInput}
              onChange={(e) => setEgfrInput(e.target.value)}
            />
            <span className="text-[10px] text-subtle block mt-0.5">CKD cutoffs: 20–45</span>
          </label>
        </div>

        {/* Diagnostic Trap Alert Box */}
        <div className={cn(
          "rounded p-3 border text-xs space-y-1.5",
          euDkaEval.isEuDkaSuspected
            ? "bg-danger-soft/30 border-danger text-fg"
            : "bg-surface border-border text-muted"
        )}>
          <div className="flex items-center justify-between">
            <span className="font-serif font-bold text-sm text-fg">
              {euDkaEval.headline}
            </span>
            <Badge tone={euDkaEval.isEuDkaSuspected ? "danger" : "default"}>
              {euDkaEval.isEuDkaSuspected ? "EMERGENCY PROTOCOL" : "BASELINE"}
            </Badge>
          </div>
          <p className="leading-relaxed text-fg">
            {euDkaEval.diagnosticTrapAlert}
          </p>
        </div>

        {/* Emergency euDKA Resuscitation Cards */}
        {euDkaEval.isEuDkaSuspected && (
          <div className="rounded bg-surface p-3 border border-border space-y-2 text-xs">
            <span className="font-serif font-bold text-danger block text-sm">
              Emergency Resuscitation & Treatment Mandate
            </span>
            <div className="grid gap-2 sm:grid-cols-2 text-[11px]">
              <div className="rounded bg-bg-sunken p-2.5 border border-border space-y-1">
                <span className="font-mono font-bold text-accent block">
                  Simultaneous IV Dextrose + Insulin Infusion:
                </span>
                <p className="text-fg leading-relaxed">
                  {euDkaEval.resuscitationGuidance.dextroseInsulinCoadministration}
                </p>
              </div>
              <div className="rounded bg-bg-sunken p-2.5 border border-border space-y-1">
                <span className="font-mono font-bold text-fg block">
                  Volume Resuscitation & Drug Hold:
                </span>
                <p className="text-muted leading-relaxed">
                  {euDkaEval.resuscitationGuidance.fluidResuscitation}
                </p>
                <p className="text-danger font-medium pt-1">
                  {euDkaEval.resuscitationGuidance.sglt2Discontinuation}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-subtle">
              Endpoint: {euDkaEval.resuscitationGuidance.ketoneClearanceTarget}
            </p>
          </div>
        )}
      </article>

      {/* Section 2: FDA Perioperative Hold Schedule */}
      <article className="rounded-md border border-border bg-surface p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="font-serif text-sm font-semibold text-fg">
              2. FDA Perioperative Hold Schedule ({preopSchedule.length} Agent{preopSchedule.length !== 1 ? "s" : ""})
            </h4>
            <p className="text-xs text-muted mt-0.5">
              FDA mandates holding SGLT2 inhibitors 3 to 4 days prior to scheduled surgery to prevent postoperative ketoacidosis.
            </p>
          </div>
          <Badge tone="warn">Surgical Safety Rail</Badge>
        </div>

        <div className="space-y-2 text-xs">
          {preopSchedule.map((sched, idx) => (
            <div key={idx} className="rounded bg-bg-sunken p-3 border border-border space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-fg">{sched.agentName}</span>
                <span className="font-mono text-xs font-bold text-danger">
                  Hold &ge; {sched.recommendedHoldDays} Days Prior
                </span>
              </div>
              <p className="text-muted">{sched.surgeryTimingNote}</p>
              <p className="text-fg font-medium">{sched.resumptionCriteria}</p>
              <p className="text-[11px] text-subtle pt-0.5">{sched.urgentSurgeryProtocol}</p>
            </div>
          ))}
        </div>
      </article>

      {/* Section 3: Glycemic Efficacy vs Cardiorenal Protection eGFR Rails */}
      <article className="rounded-md border border-border bg-surface p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="font-serif text-sm font-semibold text-fg">
              3. Cardiorenal Protection vs Glycemic eGFR Thresholds
            </h4>
            <p className="text-xs text-muted mt-0.5">
              Glycemic lowering diminishes in renal impairment, but cardiac (HFrEF/HFpEF) and renal protection persist down to eGFR 20–25 mL/min.
            </p>
          </div>
          <span className="font-mono text-xs text-muted">
            Current eGFR: <strong className="text-fg">{numEgfr} mL/min</strong>
          </span>
        </div>

        <div className="space-y-2 text-xs">
          {renalRails.map((rail, idx) => (
            <div key={idx} className="rounded bg-bg-sunken p-3 border border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-fg">{rail.agentName}</span>
                <div className="flex gap-1">
                  <Badge tone={rail.glycemicStatus === "effective" ? "ok" : rail.glycemicStatus === "blunted" ? "warn" : "default"}>
                    Glycemic: {rail.glycemicStatus.toUpperCase()}
                  </Badge>
                  <Badge tone={rail.cardiorenalStatus === "indicated" ? "ok" : rail.cardiorenalStatus === "caution-dose-reduce" ? "warn" : "danger"}>
                    Cardiorenal: {rail.cardiorenalStatus.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                {rail.initialEgfrDipReassurance}
              </p>
            </div>
          ))}
        </div>
      </article>

      {/* Section 4: Severe Collisions & Multi-Drug Cascades */}
      {collisions.length > 0 && (
        <article className="rounded-md border border-warn/40 bg-warn-soft/20 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-serif text-sm font-semibold text-fg">
              Active SGLT2 Drug Collisions on Tray ({collisions.length})
            </span>
            <span className="font-mono text-xs font-bold text-warn">Hemodynamic & Glycemic Collisions</span>
          </div>
          <div className="space-y-2">
            {collisions.map((col, idx) => (
              <div key={idx} className="rounded bg-surface p-3 text-xs border border-border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-fg">{col.headline}</span>
                  <span className={cn(
                    "font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded",
                    col.severity === "major" ? "bg-danger text-bg" : "bg-warn-soft text-warn"
                  )}>
                    {col.severity}
                  </span>
                </div>
                <p className="text-muted leading-relaxed">{col.mechanism}</p>
                <p className="text-fg font-medium leading-relaxed">{col.clinicalAction}</p>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* Section 5: Fournier's Gangrene Warning */}
      <article className="rounded-md bg-danger-soft/30 border border-danger/30 p-4 space-y-1.5 text-xs">
        <span className="font-serif font-bold text-danger block text-sm">
          Fournier's Gangrene (Necrotizing Fasciitis of the Perineum) Alert
        </span>
        <p className="text-fg leading-relaxed">
          Rare but fatal necrotizing soft-tissue infection of the perineum and genitalia associated with SGLT2 inhibitors. Evaluate urgently for any localized pain, erythema, tenderness, or swelling in genital/perineal area accompanied by fever or chills. Discontinue SGLT2 inhibitor immediately and initiate emergent broad-spectrum IV antibiotics and surgical consultation.
        </p>
      </article>

      {/* Clinical Pearls */}
      <article className="rounded-md bg-accent-soft/20 border border-accent/30 p-4 space-y-2 text-xs">
        <span className="font-serif font-bold text-accent block text-sm">
          High-Yield Clinical Pharmacology Pearls
        </span>
        <ul className="space-y-1.5 list-disc list-inside text-fg leading-relaxed">
          <li>Euglycemic DKA presents with blood glucose &lt; 250 mg/dL (frequently normal or mildly elevated) because persistent renal glycosuria clears circulating glucose while insulinopenia and glucagon excess drive ketoacidosis.</li>
          <li>When treating euDKA, IV Dextrose (D5W or D10W) MUST be co-administered with IV insulin infusion — without dextrose, blood glucose will drop before adequate insulin can be given to halt lipolysis and clear ketonemia.</li>
          <li>FDA requires holding SGLT2 inhibitors at least 3 days prior to surgery (4 days for ertugliflozin); resume only when oral intake is fully re-established and catabolic stress resolves.</li>
          <li>The acute 2–4 mL/min dip in eGFR upon SGLT2i initiation is an expected hemodynamic effect of restored tubuloglomerular feedback, not structural nephrotoxicity, and predicts long-term renal preservation.</li>
          <li>Fournier's gangrene (necrotizing fasciitis of the perineum) is a rare medical emergency associated with SGLT2 inhibitors requiring immediate surgical debridement and broad-spectrum antibiotics.</li>
          <li>Stacking SGLT2 inhibitors with loop diuretics, ACEi/ARBs, and NSAIDs produces a severe Quadruple Collision resulting in acute prerenal azotemia and tubular necrosis.</li>
        </ul>
      </article>

      {/* Regulatory Footer */}
      <p className="text-[11px] leading-relaxed text-subtle">
        Educational clinical pharmacology reference only (non-device CDS). SGLT2 inhibitor perioperative hold timing, cardiorenal thresholds, and euDKA resuscitation require institutional protocols and clinical judgment.
      </p>
    </div>
  );
}




