import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Copy, Check, RotateCcw, Download, Share2 } from "lucide-react";
import { DRUG_BY_ID, DRUGS } from "@/lib/drugs/catalog";
import { analyze } from "@/lib/drugs/engine";
import { plainLanguageSummary } from "@/lib/drugs/interaction-summary";
import { plainWordsReport } from "@/lib/drugs/quick-chips";
import { parseDoses } from "@/lib/drugs/dosing";
import { applyHost, FIRST_PASS_NMDA } from "@/lib/drugs/host";
import { treesFor } from "@/lib/drugs/metabolites";
import {
  SAMPLE_LANES,
  SAMPLE_REGIMENS,
  sampleNeedsPro,
  samplesInLane,
  type SampleLane,
} from "@/lib/drugs/samples";
import {
  PACKS,
  applyPermalink,
  buildCaseUrl,
  buildPackUrl,
  parsePermalink,
  type PackId,
} from "@/lib/drugs/permalinks";
import { CLASS_TILES, PLATES, plateForDrug, plateForSample } from "@/lib/drugs/visuals";
import {
  ALCOHOL_LABEL,
  CANNABIS_ROUTE_LABEL,
  ITEM_KIND_LABEL,
  KETAMINE_ROUTE_LABEL,
  METABOLIZER_LABEL,
  PHENOTYPE_ENZYMES,
  SEVERITY_LABEL,
  type Enzyme,
  type HostContext,
  type Severity,
} from "@/lib/drugs/types";
import { useDesk, usePlan, type LoadExtras } from "@/lib/drugs/store";
import {
  labelForIds,
  popUndo,
  readHistory,
} from "@/lib/drugs/tray-history";
import { PLAN_BY_ID } from "@/lib/billing/plans";
import { OPERATOR, SITE, tweetFor } from "@/lib/billing/commerce";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DrugSearch } from "./search";
import { FindingList } from "./findings";
import { DeskCoach } from "./coach";
import { CheckBoard } from "./check";
import { CypHeatmap } from "./heatmap";
import { EnzymeAtlas } from "./atlas";
import { HemeMark } from "./mark";
import { KetamineRouteCard, PhenotypeCard } from "./phenotype";
import { StackMeters } from "./stacks";
import { MetaboliteCard } from "./metabolites";
import { Paywall } from "./paywall";
import { foundingGateCopy } from "@/lib/billing/founding-gate";
import { CheckoutDrawer, PlansPage } from "./plans";
import { Foundry } from "./foundry";
import { RoundsPage } from "./rounds";
import { HostDelta } from "./delta";
import { DeskFooter } from "./operator";
import { severitySurface } from "./severity";
import { Plate } from "./plate";
import { FirstPassMap } from "./first-pass";
import { CollisionMap } from "./constellation";
import { Formulary } from "./library";
import { WashoutCard } from "./washout";
import { PkExplorer } from "./pk";
import { StripeReturn } from "./stripe-return";
import { Dossier } from "./dossier";
import { ClinicPanel } from "./clinic";
import { CitesPage } from "./cites";
import { WindowBriefing } from "./window";
import { WindowExtras } from "./tray";
import { ClinicalBoard } from "./clinical";
import { StudyPage } from "./study";
import { CaseCompare } from "./compare";
import { MedicationReview } from "./medication-review";
import { RxnavBoard } from "./rxnav";
import { LabelPage } from "./label";
import { PrescribingStrip } from "./pi";
import { NOT_CLEARED, PI_FOOTER, SOFTWARE } from "@/lib/regulatory";

export function DeskApp() {
  const view = useDesk((s) => s.view);
  const setView = useDesk((s) => s.setView);
  const selectedRaw = useDesk((s) => s.selected);
  const [hydrated, setHydrated] = useState(false);
  const [activePackId, setActivePackId] = useState<PackId | null>(null);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const permalinkApplied = useRef(false);
  useEffect(() => {
    let live = true;
    const done = () => {
      if (live) setHydrated(true);
    };
    void Promise.resolve(useDesk.persist.rehydrate()).then(done, done);
    const t = window.setTimeout(done, 300);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, []);
  const selected = hydrated ? selectedRaw : [];
  const remove = useDesk((s) => s.remove);
  const clearRaw = useDesk((s) => s.clear);
  const load = useDesk((s) => s.load);
  const [trayTick, setTrayTick] = useState(0);
  const bumpTray = () => setTrayTick((n) => n + 1);
  const clear = () => {
    clearRaw();
    bumpTray();
  };
  const undoTray = () => {
    const snap = popUndo();
    if (!snap?.ids.length) return;
    load(snap.ids, snap.ketamineRoute ? { ketamineRoute: snap.ketamineRoute } : undefined);
    bumpTray();
  };
  const trayHistory = useMemo(() => readHistory(), [trayTick, hydrated]);
  useEffect(() => {
    if (!hydrated || permalinkApplied.current) return;
    permalinkApplied.current = true;
    const resolved = applyPermalink(load, window.location.search);
    if (resolved.kind === "none") return;
    setActiveCaseId(resolved.caseId);
    setActivePackId(resolved.packId);
    if (resolved.kind === "lab") {
      useDesk.getState().setView("study");
    }
    // Keep query string so shared ?case= / ?pack= / ?lab= links stay copyable.
  }, [hydrated, load]);

  // Rounds (and other surfaces) may set ?pack= / ?case= after boot — resync strip state.
  useEffect(() => {
    if (!hydrated || view !== "desk") return;
    const resolved = parsePermalink(window.location.search);
    setActivePackId(resolved.packId);
    if (resolved.caseId) setActiveCaseId(resolved.caseId);
  }, [hydrated, view]);

  function loadSample(sampleId: string, packId: PackId | null = activePackId) {
    const sample = SAMPLE_REGIMENS.find((item) => item.id === sampleId);
    if (!sample) return;
    load(sample.drugIds, {
      phenotypes: sample.phenotypes,
      smoking: sample.smoking,
      ketamineRoute: sample.ketamineRoute,
      cannabisRoute: sample.cannabisRoute,
      alcohol: sample.alcohol,
      doses: sample.doses,
    });
    setActiveCaseId(sample.id);
    setActivePackId(packId);
    const url = new URL(window.location.href);
    url.searchParams.set("case", sample.id);
    url.searchParams.delete("sample");
    if (packId) url.searchParams.set("pack", packId);
    else url.searchParams.delete("pack");
    // Preserve flip if present for share fidelity; do not invent it.
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function loadPackCase(packId: PackId, caseId: string) {
    loadSample(caseId, packId);
  }
  const phenotypes = useDesk((s) => s.phenotypes);
  const smoking = useDesk((s) => s.smoking);
  const ketamineRoute = useDesk((s) => s.ketamineRoute);
  const cannabisRoute = useDesk((s) => s.cannabisRoute);
  const alcohol = useDesk((s) => s.alcohol);
  const age = useDesk((s) => s.age);
  const kidney = useDesk((s) => s.kidney);
  const preg = useDesk((s) => s.preg);
  const doses = useDesk((s) => s.doses);
  const host = useMemo<HostContext>(
    () => ({ phenotypes, smoking, ketamineRoute, cannabisRoute, alcohol, age, kidney, preg }),
    [phenotypes, smoking, ketamineRoute, cannabisRoute, alcohol, age, kidney, preg],
  );
  const report = useMemo(
    () => analyze(selected, host, parseDoses(doses)),
    [selected, host, doses],
  );
  const hostDrugs = useMemo(
    () => applyHost(selected.map((id) => DRUG_BY_ID[id]).filter(Boolean), host),
    [selected, host],
  );
  const colliding = useMemo(
    () => new Set(report.burden.filter((b) => b.collisions > 0).map((b) => b.enzyme as Enzyme)),
    [report],
  );
  const plan = usePlan();
  const pro = plan !== "free";
  const license = useDesk((s) => s.license);
  const lifetime = useDesk((s) => s.lifetime);
  const previewUntil = useDesk((s) => s.previewUntil);
  const justActivated = useDesk((s) => s.justActivated);
  const dismissActivated = useDesk((s) => s.dismissActivated);
  const hcpAck = useDesk((s) => s.hcpAck);
  const ackHcp = useDesk((s) => s.ackHcp);
  const openCheckout = useDesk((s) => s.openCheckout);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view, justActivated]);

  const secretTaps = useRef(0);
  const secretTimer = useRef(0);
  function openFoundry() {
    secretTaps.current += 1;
    window.clearTimeout(secretTimer.current);
    secretTimer.current = window.setTimeout(() => {
      secretTaps.current = 0;
    }, 4000);
    if (secretTaps.current >= 7) {
      secretTaps.current = 0;
      setView("foundry");
    }
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <StripeReturn ready={hydrated} />
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
            <button type="button" className="shrink-0" onClick={openFoundry} aria-label="FirstPass">
              <HemeMark className="size-8" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg leading-none tracking-tight">FirstPass</span>
                {hydrated && plan !== "free" ? (
                  <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-accent-fg">
                    {lifetime ? "founding" : plan}
                  </span>
                ) : null}
              </div>
              <div className="mt-1 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                Liver enzymes (CYP) · not FDA-cleared
              </div>
            </div>
            </div>
            {hydrated && !pro ? (
              <Button size="sm" className="sm:hidden" onClick={() => openCheckout("lab", foundingGateCopy("host").reason, "life")}>
                Unlock
              </Button>
            ) : null}
          </div>
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 xl:w-auto">
            <nav aria-label="Main navigation" className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-1 rounded-xl bg-bg-sunken p-1 xl:w-auto xl:flex-nowrap xl:justify-start xl:rounded-full">
              {(
                [
                  ["desk", "Desk"],
                  ["library", "Library"],
                  ["cites", "Sources"],
                  ["atlas", "Enzyme map"],
                  ["study", "Learn"],
                  ["rounds", "Cases"],
                  ["compare", "Compare"],
                  ["label", "Safety"],
                  ["plans", "Plans"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  aria-current={view === id ? "page" : undefined}
                  className={cn(
                    "h-11 shrink-0 rounded-full px-2 text-xs font-medium sm:h-9 sm:px-4 sm:text-sm",
                    view === id ? "bg-surface-2 text-fg shadow-[var(--shadow-border)]" : "text-muted hover:text-fg",
                  )}
                >
                  {label}
                </button>
              ))}
            </nav>
            {hydrated && !pro ? (
              <Button size="sm" className="hidden sm:inline-flex" onClick={() => openCheckout("lab", foundingGateCopy("host").reason, "life")}>
                Unlock
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {hydrated && !hcpAck ? (
        <div className="border-b border-border bg-warn-soft">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="max-w-3xl text-sm leading-relaxed text-fg">
              <span className="font-medium">For clinicians and supervised learning.</span> Not for
              personal treatment, dose changes, or deciding whether to combine substances. This
              educational checker can miss risks and cannot test what is in a product. If someone is
              seriously unwell or may be overdosing, contact local emergency services or a poison
              center now; do not wait for this checker.
            </p>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setView("label")}>
                Safety notes
              </Button>
              <Button size="sm" onClick={ackHcp}>
                Continue
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {justActivated ? (
        <div className="border-b border-border bg-ok-soft">
          <div className="mx-auto flex max-w-6xl items-start justify-between gap-3 px-4 py-3 sm:items-center sm:px-6">
            <p className="text-sm leading-relaxed text-ok">
              You're in. Host factors, the enzyme atlas, and export are open on this desk.
              {license ? (
                <>
                  {" "}
                  Keep key <span className="font-mono">{license}</span> for another machine.
                </>
              ) : null}
            </p>
            <button type="button" className="shrink-0 text-sm text-ok underline" onClick={dismissActivated}>
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
        {view === "plans" ? (
          <PlansPage />
        ) : view === "foundry" ? (
          <Foundry />
        ) : view === "rounds" ? (
          <RoundsPage />
        ) : view === "study" ? (
          <StudyPage />
        ) : view === "compare" ? (
          <CaseCompare
            pro={pro}
            onUnlock={() => openCheckout("lab", foundingGateCopy("host").reason, "life")}
            onOpenCase={(sample) => loadSample(sample.id, null)}
          />
        ) : view === "cites" ? (
          <CitesPage />
        ) : view === "label" ? (
          <LabelPage />
        ) : view === "atlas" ? (
          pro ? (
            <EnzymeAtlas />
          ) : (
            <Paywall gate="atlas">
              <EnzymeAtlas />
            </Paywall>
          )
        ) : view === "library" ? (
          <Formulary />
        ) : (
          <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-4">
              <DrugSearch />
              {selected.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {selected.map((id) => {
                    const drug = DRUG_BY_ID[id];
                    if (!drug) return null;
                    const entered = doses[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => remove(id)}
                        className="group flex h-10 items-center gap-2 rounded-full bg-surface pl-3 pr-2 text-sm shadow-[var(--shadow-border)] hover:bg-danger-soft"
                        title="Remove from regimen"
                      >
                        <span className="font-medium">{drug.name}</span>
                        {entered ? (
                          <span
                            className="font-mono text-[11px] text-muted"
                            title="Desk-entered value only; verify the dose, units, formulation, and source."
                          >
                            Desk entry: {entered}
                          </span>
                        ) : null}
                        {drug.kind !== "drug" ? (
                          <span className="font-mono text-[10px] uppercase tracking-wide text-muted">
                            {ITEM_KIND_LABEL[drug.kind]}
                          </span>
                        ) : null}
                        <span className="flex size-6 items-center justify-center rounded-full text-subtle group-hover:text-danger">
                          ×
                        </span>
                      </button>
                    );
                  })}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted"
                    onClick={() => {
                      clear();
                      setActiveCaseId(null);
                      setActivePackId(null);
                      const url = new URL(window.location.href);
                      url.searchParams.delete("case");
                      url.searchParams.delete("sample");
                      url.searchParams.delete("pack");
                      url.searchParams.delete("flip");
                      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
                    }}
                  >
                    <RotateCcw className="size-3.5" />
                    Clear
                  </Button>
                </div>
              ) : null}

              {activePackId ? (
                <PackStrip
                  packId={activePackId}
                  activeCaseId={activeCaseId}
                  onSelect={(caseId) => loadPackCase(activePackId, caseId)}
                />
              ) : null}

              {selected.length > 0 ? <WindowExtras /> : null}

              {selected.length > 0 ? (
                <CheckBoard
                  ids={selected}
                  findings={report.findings}
                  counts={report.counts}
                  host={host}
                />
              ) : null}
              {selected.length > 0 ? (
                <MedicationReview
                  key={`${selected.join("|")}:${JSON.stringify(host)}:${JSON.stringify(doses)}`}
                  ids={selected}
                  host={host}
                  findings={report.findings}
                  doses={doses}
                />
              ) : null}

              {selected.length === 0 ? (
                <EmptyState
                  onLoad={load}
                  onLoadSample={(id) => loadSample(id, null)}
                  ready={hydrated}
                  undo={trayHistory.undo}
                  recent={trayHistory.recent}
                  onUndo={undoTray}
                  onTrayBump={bumpTray}
                />
              ) : selected.length === 1 ? (
                <>
                  <SingleDrug id={selected[0]} />
                  <WindowBriefing ids={selected} host={host} report={report} />
                  <PrescribingStrip ids={selected} />
                  <ClinicPanel ids={selected} host={host} />
                  <ClinicalBoard ids={selected} host={host} />
                  <Dossier ids={selected} host={host} />
                  {report.findings.length > 0 ? (
                    <>
                      <RiskBanner report={report} selected={selected} host={host} plan={plan} caseId={activeCaseId} packId={activePackId} />
                      {pro ? (
                        <StackMeters stacks={report.stacks} />
                      ) : report.stacks.some((s) => s.score > 0) ? (
                        <Paywall gate="stacks">
                          <StackMeters stacks={report.stacks} />
                        </Paywall>
                      ) : null}
                      <FindingList findings={report.findings} />
                    </>
                  ) : (
                    <DeskCoach ids={selected} findingsCount={report.findings.length} />
                  )}
                  <PkExplorer drugs={hostDrugs} host={host} />
                  <FirstPassMap
                    ketamineRoute={ketamineRoute}
                    cannabisRoute={cannabisRoute}
                    showKetamine={selected.some((id) =>
                      (FIRST_PASS_NMDA as readonly string[]).includes(id),
                    )}
                    showCannabis={selected.some((id) =>
                      ["dronabinol", "cannabidiol"].includes(id),
                    )}
                  />
                  {pro ? (
                    <MetaboliteCard ids={selected} />
                  ) : treesFor(selected).length > 0 ? (
                    <Paywall gate="metabolites">
                      <MetaboliteCard ids={selected} />
                    </Paywall>
                  ) : null}
                  <CypHeatmap drugs={hostDrugs} colliding={colliding} />
                </>
              ) : (
                <>
                  <RiskBanner report={report} selected={selected} host={host} plan={plan} caseId={activeCaseId} packId={activePackId} />
                  <WindowBriefing ids={selected} host={host} report={report} />
                  <PrescribingStrip ids={selected} />
                  <ClinicPanel ids={selected} host={host} />
                  <ClinicalBoard ids={selected} host={host} />
                  <button
                    type="button"
                    onClick={() => setView("study")}
                    className="flex w-full items-center justify-between rounded-xl bg-surface px-4 py-3 text-left shadow-[var(--shadow-border)]"
                  >
                    <span>
                      <span className="font-serif text-lg tracking-tight text-fg">Study this pair</span>
                      <span className="mt-0.5 block text-xs text-muted">
                        Mechanism cards from this pair. Rounds, named pairs, and the enzyme map (CYP) live on Study. Not a milligram.
                      </span>
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-wide text-muted">Study</span>
                  </button>
                  <RxnavBoard ids={selected} />
                  {pro ? (
                    <StackMeters stacks={report.stacks} />
                  ) : report.stacks.some((s) => s.score > 0) ? (
                    <Paywall gate="stacks">
                      <StackMeters stacks={report.stacks} />
                    </Paywall>
                  ) : null}
                  {report.findings.length > 0 ? (
                    <>
                      <CollisionMap selected={selected} findings={report.findings} />
                      <FindingList findings={report.findings} />
                    </>
                  ) : (
                    <DeskCoach ids={selected} findingsCount={report.findings.length} />
                  )}
                  <Dossier ids={selected} host={host} />
                  <PkExplorer drugs={hostDrugs} host={host} />
                  {pro ? (
                    <MetaboliteCard ids={selected} />
                  ) : treesFor(selected).length > 0 ? (
                    <Paywall gate="metabolites">
                      <MetaboliteCard ids={selected} />
                    </Paywall>
                  ) : null}
                  <FirstPassMap
                    ketamineRoute={ketamineRoute}
                    cannabisRoute={cannabisRoute}
                    showKetamine={selected.some((id) =>
                      (FIRST_PASS_NMDA as readonly string[]).includes(id),
                    )}
                    showCannabis={selected.some((id) =>
                      ["dronabinol", "cannabidiol"].includes(id),
                    )}
                  />
                  <CypHeatmap drugs={hostDrugs} colliding={colliding} />
                </>
              )}
            </div>

            <aside className="space-y-4 lg:pt-0">
              <StatsCard
                drugs={DRUGS.length}
                selected={selected.length}
                findings={report.findings.length}
                highest={report.highest}
                plan={plan}
                license={license}
                lifetime={lifetime}
                previewUntil={previewUntil}
                cap={pro ? 8 : 5}
              />
              {pro ? (
                <PhenotypeCard />
              ) : (
                <>
                  <KetamineRouteCard />
                  <Paywall gate="host">
                    <PhenotypeCard hideKetamineRoute />
                  </Paywall>
                </>
              )}
              {pro && selected.length > 0 ? <HostDelta selected={selected} host={host} report={report} /> : null}
              {selected.length > 0 ? <WashoutCard selected={selected} /> : null}
              {selected.length >= 2 ? <BurdenCard burden={report.burden} /> : <HowCard />}
              <Disclaimer />
            </aside>
          </div>
        )}
      </main>
      <DeskFooter />
      <CheckoutDrawer />
    </div>
  );
}

function EmptyState({
  onLoad,
  onLoadSample,
  ready,
  undo,
  recent,
  onUndo,
  onTrayBump,
}: {
  onLoad: (ids: string[], extras?: LoadExtras) => void;
  onLoadSample: (sampleId: string) => void;
  ready: boolean;
  undo: ReturnType<typeof readHistory>["undo"];
  recent: ReturnType<typeof readHistory>["recent"];
  onUndo: () => void;
  onTrayBump: () => void;
}) {
  const [lane, setLane] = useState<SampleLane | "all">("all");
  const plan = usePlan();
  const setView = useDesk((s) => s.setView);
  const shown = samplesInLane(lane);
  return (
    <section className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
      <div className="relative">
        <Plate src={PLATES.hero} alt="" className="h-48 w-full sm:h-64" />
        <div className="absolute inset-x-0 bottom-0 bg-ink px-5 py-4 sm:px-8 sm:py-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent-fg/70">
            Educational interaction checker
          </p>
          <h1 className="mt-2 max-w-xl font-serif text-3xl leading-tight tracking-tight text-accent-fg sm:text-4xl">
            Explore possible medicine and substance interactions.
          </h1>
        </div>
      </div>
      <div className="px-5 py-6 sm:px-8 sm:py-8">
        <p className="max-w-xl text-sm leading-relaxed text-muted">
          {lane === "mat"
            ? "Explore educational examples involving opioid-treatment medicines and other substances. These notes are not a treatment plan; a qualified clinician and current product labeling must guide care."
            : "Add two or more medicines, supplements, foods, or other substances to see possible concerns in everyday language, with clinical details and sources for review. This is a learning aid for clinicians and supervised education—not personal medical advice. It can miss interactions; no result does not mean a combination is safe."}
        </p>
        {undo || recent.length > 0 ? (
          <div className="mt-4 flex flex-col gap-3 rounded-lg bg-bg px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg">Your recent trays</p>
              <p className="mt-0.5 text-xs text-muted">
                Stored only on this browser — no account sync. Handy after Clear or when hopping between teaching pairs.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {undo ? (
                <Button variant="secondary" size="sm" disabled={!ready} onClick={onUndo}>
                  <RotateCcw className="size-3.5" />
                  Undo clear
                </Button>
              ) : null}
              {recent.slice(0, 4).map((snap) => (
                <Button
                  key={`${snap.ts}-${snap.ids.join("-")}`}
                  variant="ghost"
                  size="sm"
                  disabled={!ready}
                  className="max-w-[14rem] truncate text-muted"
                  title={labelForIds(snap.ids)}
                  onClick={() => {
                    onLoad(snap.ids, snap.ketamineRoute ? { ketamineRoute: snap.ketamineRoute } : undefined);
                    onTrayBump();
                  }}
                >
                  {labelForIds(snap.ids)}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        {lane !== "mat" ? (
          <ol className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ["1", "Search", "Use a generic name, brand, or common name."],
              ["2", "Add another", "Choose a second item to check the pair."],
              ["3", "Review", "Start with the everyday-language summary; open sources for context."],
            ].map(([step, title, detail]) => (
              <li key={step} className="flex gap-3 rounded-lg bg-bg px-3 py-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-xs text-accent">
                  {step}
                </span>
                <span>
                  <span className="block text-sm font-medium text-fg">{title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted">{detail}</span>
                </span>
              </li>
            ))}
          </ol>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {lane === "mat" ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                disabled={!ready}
                onClick={() => onLoad(["methadone"])}
              >
                Methadone window
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!ready}
                onClick={() => onLoad(["buprenorphine"])}
              >
                Suboxone film
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!ready}
                onClick={() => onLoad(["naltrexone"])}
              >
                Vivitrol
              </Button>
            </>
          ) : null}
          <Button variant="secondary" size="sm" onClick={() => setView("library")}>
            Browse drug library
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setLane("mat")}>
            Opioid treatment (MAT / OTP) board
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setLane("clinic")}>
            Clinic staples
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setLane("food")}>
            Kitchen & herbs
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setView("cites")}>
            PubMed shelf
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setView("rounds")}>
            Teaching rounds
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setView("study")}>
            Study drill
          </Button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CLASS_TILES.map((tile) => (
            <button
              key={tile.id}
              type="button"
              onClick={() => setLane(tile.id)}
              className={cn(
                "overflow-hidden rounded-lg text-left shadow-[var(--shadow-border)] transition-transform duration-150 hover:-translate-y-px",
                lane === tile.id ? "ring-2 ring-accent" : "",
              )}
            >
              <Plate src={tile.plate} alt="" className="h-20 w-full" />
              <span className="block bg-bg px-3 py-2">
                <span className="block text-sm font-medium text-fg">{tile.label}</span>
                <span className="block text-[11px] text-muted">{tile.hint}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-1">
          {SAMPLE_LANES.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLane(l.id)}
              className={cn(
                "h-10 rounded-full px-3 text-xs font-medium",
                lane === l.id ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="mt-6">
          <h2 className="font-serif text-lg tracking-tight text-fg">
            {lane === "all" ? "Try an example" : `Examples: ${SAMPLE_LANES.find((item) => item.id === lane)?.label ?? lane}`}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Examples load into the checker so you can see how its summaries and source links work.
          </p>
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {shown.map((s) => (
            <li key={s.id} className="relative">
              <button
                type="button"
                disabled={!ready}
                onClick={() => onLoadSample(s.id)}
                className="flex h-full w-full overflow-hidden rounded-lg bg-bg text-left shadow-[var(--shadow-border)] transition-transform duration-150 hover:-translate-y-px disabled:opacity-60"
              >
                <Plate src={plateForSample(s)} alt="" className="h-full w-20 shrink-0 min-h-24" />
                <span className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3 pr-12">
                  <span className="flex items-center gap-2 text-sm font-medium text-fg">
                    {s.title}
                    {plan === "free" && sampleNeedsPro(s) ? (
                      <span className="font-mono text-[10px] uppercase tracking-wide text-accent">Pro</span>
                    ) : null}
                  </span>
                  <span className="mt-1 text-xs text-muted">{s.blurb}</span>
                </span>
              </button>
              <CopyCaseLink sampleId={s.id} className="absolute right-2 top-2" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function SingleDrug({ id }: { id: string }) {
  const drug = DRUG_BY_ID[id];
  const route = useDesk((s) => s.ketamineRoute);
  const cannabisRoute = useDesk((s) => s.cannabisRoute);
  if (!drug) return null;
  const subs = drug.enzymes.filter((e) => e.kind === "substrate");
  const inhs = drug.enzymes.filter((e) => e.kind === "inhibitor");
  const inds = drug.enzymes.filter((e) => e.kind === "inducer");
  const nmda = (FIRST_PASS_NMDA as readonly string[]).includes(id);
  const thc = id === "dronabinol";
  return (
    <section className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
      <div className="grid sm:grid-cols-[220px_minmax(0,1fr)]">
        <Plate src={plateForDrug(drug)} alt="" className="h-40 w-full sm:h-full min-h-40" />
        <div className="px-5 py-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Monograph</p>
      <h2 className="mt-2 font-serif text-2xl tracking-tight text-fg">{drug.name}</h2>
      <p className="mt-1 text-sm text-muted">
        {drug.cls}
        {drug.brands.length ? ` · ${drug.brands.join(", ")}` : ""}
        {nmda ? ` · ${KETAMINE_ROUTE_LABEL[route]}` : ""}
        {thc ? ` · ${CANNABIS_ROUTE_LABEL[cannabisRoute]}` : ""}
      </p>
      {drug.note ? <p className="mt-3 text-sm leading-relaxed text-fg">{drug.note}</p> : null}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <RoleList title="Substrate of" rows={subs} empty="No mapped CYP substrate" />
        <RoleList title="Inhibits" rows={inhs} empty="Not a mapped inhibitor" />
        <RoleList title="Induces" rows={inds} empty="Not a mapped inducer" />
      </div>
      {drug.pd.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {drug.pd.map((p) => (
            <Badge key={p} tone="info">
              {p.replace(/-/g, " ")}
            </Badge>
          ))}
        </div>
      ) : null}
        </div>
      </div>
    </section>
  );
}

function RoleList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { enzyme: string; kind: string; strength?: string; sensitivity?: string; pathway?: string; nti?: boolean }[];
  empty: string;
}) {
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-subtle">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {rows.map((r) => (
            <li key={r.enzyme + r.kind} className="font-mono text-sm text-fg">
              {r.enzyme}
              <span className="ml-2 font-sans text-xs text-muted">
                {"strength" in r && r.strength ? r.strength : null}
                {"sensitivity" in r && r.sensitivity ? r.sensitivity : null}
                {r.pathway === "activation" ? " · prodrug" : ""}
                {r.nti ? " · NTI" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Local plain chips for the share strip — mirrors open #12 SEVERITY_PLAIN until it lands on main. */
const RISK_SEVERITY_PLAIN: Record<Severity | "none", string> = {
  contraindicated: "Avoid together",
  major: "Serious concern",
  moderate: "Use care",
  minor: "Mild note",
  none: "Unmapped",
};

function RiskBanner({
  report,
  selected,
  host,
  plan,
  caseId,
  packId,
}: {
  report: ReturnType<typeof analyze>;
  selected: string[];
  host: HostContext;
  plan: ReturnType<typeof usePlan>;
  caseId: string | null;
  packId: PackId | null;
}) {
  const [copied, setCopied] = useState<"full" | "share" | "plain" | "link" | null>(null);
  const openCheckout = useDesk((s) => s.openCheckout);
  const license = useDesk((s) => s.license);
  const highest = report.highest;
  const phenoLine = PHENOTYPE_ENZYMES.map(
    (e) => `${e} ${host.phenotypes[e]} (${METABOLIZER_LABEL[host.phenotypes[e]]})`,
  ).join(", ");
  const names = selected.map((id) => DRUG_BY_ID[id]?.name).filter(Boolean).join(" + ");

  async function write(kind: "full" | "share" | "plain" | "link", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard may be blocked */
    }
  }

  async function copySummary() {
    if (plan === "free") {
      openCheckout(
        "lab",
        foundingGateCopy("report").reason,
        "life",
      );
      return;
    }
    const lines = [
      `FirstPass regimen: ${names}`,
      `Metabolizer status: ${phenoLine}`,
      `Tobacco smoke: ${host.smoking ? "daily (CYP1A2 induction)" : "off"}`,
      `Alcohol pattern: ${ALCOHOL_LABEL[host.alcohol]}`,
      `Ketamine route: ${KETAMINE_ROUTE_LABEL[host.ketamineRoute]}`,
      `Cannabis route: ${CANNABIS_ROUTE_LABEL[host.cannabisRoute]}`,
      `Highest severity: ${SEVERITY_LABEL[highest]}`,
      "",
      ...report.findings.map(
        (f) =>
          `• ${SEVERITY_LABEL[f.severity]} — ${f.headline}: ${plainLanguageSummary(f)} ${f.mechanism}. ${f.clinical}`,
      ),
      "",
      "Educational model. Not a substitute for clinical decision support.",
    ];
    await write("full", lines.join("\n"));
  }

  async function shareLine() {
    const top = report.findings[0];
    let text = tweetFor(
      names,
      RISK_SEVERITY_PLAIN[highest],
      top ? `${top.headline}: ${top.mechanism}` : "",
    );
    // Keep an educational / not-CDS footer even if tweetFor ever drops it.
    if (!/educational|not cds|not personal advice/i.test(text)) {
      text += "\nEducational only — not CDS / not personal advice.";
    }
    await write("share", text);
  }

  async function copyPlain() {
    await write(
      "plain",
      plainWordsReport(
        names,
        report.findings.map((f) => ({
          severity: SEVERITY_LABEL[f.severity],
          headline: f.headline,
          plain: plainLanguageSummary(f),
        })),
        SEVERITY_LABEL[highest],
      ),
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface p-3 shadow-[var(--shadow-border)] sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "inline-flex min-w-28 items-center justify-center rounded-md px-2.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wider",
            severitySurface(highest),
          )}
        >
          {RISK_SEVERITY_PLAIN[highest]}
        </span>
        <div>
          <div className="text-sm font-medium text-fg">
            {report.findings.length} possible concern{report.findings.length === 1 ? "" : "s"} across{" "}
            {selected.length} item{selected.length === 1 ? "" : "s"}
          </div>
          <div className="text-xs text-muted">
            {report.counts.contraindicated} avoid · {report.counts.major} serious ·{" "}
            {report.counts.moderate} care · {report.counts.minor} mild
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
      {caseId ? (
        <Button
          variant="secondary"
          size="sm"
          className="h-10 min-w-24 shrink-0"
          onClick={() =>
            void write(
              "link",
              packId ? buildPackUrl(packId, { caseId }) : buildCaseUrl(caseId),
            )
          }
        >
          {copied === "link" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied === "link" ? "Copied" : "Copy link"}
        </Button>
      ) : null}
      <Button variant="secondary" size="sm" onClick={() => void shareLine()} className="h-10 min-w-24 shrink-0">
        {copied === "share" ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
        {copied === "share" ? "Copied" : "Share"}
      </Button>
      <Button variant="secondary" size="sm" onClick={() => void copySummary()} className="h-10 min-w-24 shrink-0">
        {copied === "full" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied === "full" ? "Copied" : plan === "free" ? "Full report · Founding" : "Report"}
      </Button>
      {plan === "lab" ? (
        <Button
          variant="secondary"
          size="sm"
          className="h-10 shrink-0"
          onClick={() => exportDesk(report, selected, host, license)}
        >
          <Download className="size-3.5" />
          JSON
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          className="h-10 shrink-0"
          onClick={() => openCheckout("lab", foundingGateCopy("export").reason, "life")}
        >
          <Download className="size-3.5" />
          JSON · Founding
        </Button>
      )}
      {plan === "lab" ? (
        <Button
          variant="secondary"
          size="sm"
          className="h-10 shrink-0"
          onClick={() => exportCsv(report, selected)}
        >
          <Download className="size-3.5" />
          CSV
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          className="h-10 shrink-0"
          onClick={() => openCheckout("lab", foundingGateCopy("export").reason, "life")}
        >
          <Download className="size-3.5" />
          CSV · Founding
        </Button>
      )}
      </div>
    </div>
  );
}

function StatsCard({
  drugs,
  selected,
  findings,
  highest,
  plan,
  license,
  lifetime,
  previewUntil,
  cap,
}: {
  drugs: number;
  selected: number;
  findings: number;
  highest: string;
  plan: ReturnType<typeof usePlan>;
  license: string | null;
  lifetime: boolean;
  previewUntil: number | null;
  cap: number;
}) {
  const previewing = Boolean(previewUntil && Date.now() < previewUntil && plan === "pro" && !license);
  const previewDays = previewUntil ? Math.max(0, Math.ceil((previewUntil - Date.now()) / 86_400_000)) : 0;
  const licenseLabel = lifetime
    ? "Founding"
    : previewing
      ? `Preview · ${previewDays}d`
      : PLAN_BY_ID[plan].name;
  return (
    <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Desk</h2>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        <Stat k="Formulary" v={String(drugs)} />
        <Stat k="On desk" v={`${selected}/${cap}`} />
        <Stat k="Findings" v={String(findings)} />
        <Stat k="License" v={licenseLabel} />
      </dl>
      <div className="mt-3 text-[11px] text-muted">
        Ceiling {highest === "none" ? "—" : SEVERITY_LABEL[highest as never] ?? highest}
        {license
          ? ` · ${license}`
          : plan === "free"
            ? ` · free · founding $79 lifetime unlocks host factors / atlas / export`
            : previewing
              ? " · buy before the preview ends"
              : ""}
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[11px] text-muted">{k}</dt>
      <dd className="font-mono text-sm tabular-nums text-fg">{v}</dd>
    </div>
  );
}

function BurdenCard({ burden }: { burden: ReturnType<typeof analyze>["burden"] }) {
  const hot = [...burden].sort((a, b) => b.collisions - a.collisions);
  return (
    <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Pathway load</h2>
      <ul className="mt-3 space-y-2">
        {hot.map((b) => (
          <li key={b.enzyme} className="flex items-center justify-between gap-2 text-sm">
            <span className="font-mono text-xs text-fg">{b.enzyme}</span>
            <span className={cn("text-xs", b.collisions > 0 ? "text-danger" : "text-muted")}>
              {b.substrates.length}S {b.inhibitors.length}I {b.inducers.length}D
              {b.collisions > 0 ? ` · ${b.collisions} hit` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HowCard() {
  return (
    <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <h2 className="text-xs font-medium uppercase tracking-wide text-muted">How it scores</h2>
      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
        <li>
          <span className="text-fg">PK.</span> Strong inhibitors of sensitive or narrow-index
          substrates grade contraindicated; induction of clearance is loss of efficacy.
        </li>
        <li>
          <span className="text-fg">Curve.</span> Grey is this route, normal metabolizer, no
          blockers. Teal is this desk. q8h / q12h / q24h show how doses stack (build-up / Rac). Overlay IV vs
          oral on first-pass victims. Not a plasma level. Five-drug exposure (AUCR) stays free.
        </li>
        <li>
          <span className="text-fg">2D6.</span> Blockade of codeine or tamoxifen is lost
          activation; of DXM or MDMA it is stacked parent plus serotonin.
        </li>
        <li>
          <span className="text-fg">Phenotype.</span> Flip CYP2D6 / 2C19 / 2C9 / 2B6 to poor or
          ultrarapid — a poor metabolizer scores like a strong inhibitor of that enzyme. Poor 2C9
          metabolizers make warfarin and edible THC hotter.
        </li>
        <li>
          <span className="text-fg">Host.</span> Daily smoke induces CYP1A2. Chronic alcohol induces
          CYP2E1 (NAPQI from acetaminophen). Oral ketamine and edible THC are first-pass victims; IV
          and smoked mostly skip it.
        </li>
        <li>
          <span className="text-fg">Food.</span> Grapefruit knocks out intestinal 3A4. Tyramine
          plus an MAOI is a pressor crisis. Piperine and pomegranate are quieter 3A4 hits. Licorice
          drops potassium. Fat meals raise oral THC/CBD. Salt and urine pH move lithium and
          amphetamine.
        </li>
        <li>
          <span className="text-fg">Supplement.</span> Red yeast rice is lovastatin. Berberine is a
          3A4/P-gp bully plus a glucose drop. SAM-e and 5-HTP are serotonergic. Vitamin K dumps INR;
          nattokinase and fish oil bleed. Calcium/iron chelate Cipro and Synthroid. Charcoal and
          psyllium bind the morning dose. Niacin plus a statin is muscle. Search supplement /
          vitamin / otc.
        </li>
        <li>
          <span className="text-fg">Street.</span> Cocaine plus ethanol is cocaethylene. Stimulant
          plus opioid is a speedball — the stimulant masks apnea. Dirty 30s are pressed fentanyl ±
          xylazine, not oxycodone; naloxone will not reverse the α2. Percocet is oxy + APAP.
          HR tab: never use alone, recovery position, test-strip limits, GHB steep curve, MDMA
          heat/water, TripSit combo ratings, live PsychonautWiki intros with milligrams stripped.
          A wiki is not a label — independently review. Not a cooking guide.
        </li>
        <li>
          <span className="text-fg">MAT.</span> Put methadone or a film on the desk, then tap
          today's extra on the window tray. Buprenorphine on a fentanyl load is precipitated
          withdrawal, not stacked milligrams. Methadone lives on 3A4/2B6 — inducers look like a
          stolen dose; azoles, Vistaril, and Zofran are the QT traps. Paxlovid dumps methadone
          and raises fentanyl; cobicistat (Tybost) is the opposite arrow on methadone.
          Gabapentinoids are not free extras on an opioid airway. Lofexidine is α2 — naloxone
          will not reverse it. Epclusa next to methadone should stay quiet; rifampin should not.
          The window briefing is watch / counsel / hold — copy the huddle onto a note. Not a
          protocol.
        </li>
        <li>
          <span className="text-fg">CYP clock.</span> Strong / moderate / weak are FDA fold-change
          grades (Huang 2007 / 2020 guidance), not vibes. Mechanism-based inhibitors (clarithromycin,
          grapefruit, ritonavir, paroxetine, fluoxetine) destroy the enzyme — stopping yesterday
          does not restore it. Inducers take a week to land and two weeks to leave; the stop is
          rebound toxicity. Open the CYP tab. Plan the stop on the start day. Not a milligram.
        </li>
        <li>
          <span className="text-fg">Clinic.</span> Allopurinol × azathioprine is xanthine oxidase,
          not CYP — pancytopenia. Nitrates × PDE5 are labeled hypotension. Omeprazole blunts
          clopidogrel activation (2C19 prodrug); pantoprazole is the quieter switch. Oral
          budesonide and swallowed fluticasone are gut 3A4 first-pass victims — azoles and
          ritonavir make a 'local' steroid systemic. Terbinafine is a strong 2D6 inhibitor, not
          an azole. Ozempic next to a sulfonylurea is hypoglycemia; next to metformin it should
          stay quieter. Search clinic / primary / ozempic / imuran.
        </li>
        <li>
          <span className="text-fg">Host clinic.</span> Flip geriatric for Beers 2023. CKD scores
          renally cleared NTI drugs and NSAIDs. Pregnant flags ACEI/ARB, warfarin, valproate, MTX,
          mycophenolate. Teaching notes, not a label. Search beers / pregnant.
        </li>
        <li>
          <span className="text-fg">Sources.</span> DrugBank is identity and targets — open the
          accession. PharmGKB / CPIC is the gene table; flip a metabolizer on this desk and the matching
          row highlights. Stahl is a receptor sketch (spectrum, occupancy, side effects from those
          receptors) in original language, not a quotation of the book. PubMed is a curated PMID
          shelf plus a live NCBI search for the pair on the desk. Search pgx / stahl / drugbank /
          pubmed.
        </li>
      </ul>
    </div>
  );
}

function Disclaimer() {
  return (
    <div className="rounded-lg bg-bg-sunken/60 px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">About this desk</p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-subtle">
        Built for learning and clinical review — not a personal treatment guide.{" "}
        {SOFTWARE.name} {SOFTWARE.version} is an educational clinical decision-support aid for
        clinicians and supervised learning. {NOT_CLEARED} It can miss risks; an empty result is not
        proof that a combination is safe. It does not identify product contents, diagnose, or tell
        anyone what to start, stop, or change. For care decisions, consult a qualified clinician and
        current FDA-approved labeling. Street-supply entries are teaching examples, not product
        identification.
      </p>
    </div>
  );
}

function exportDesk(
  report: ReturnType<typeof analyze>,
  selected: string[],
  host: HostContext,
  license: string | null,
) {
  const body = {
    software: { name: SOFTWARE.name, version: SOFTWARE.version, buildId: SOFTWARE.buildId, notFdaCleared: true },
    intendedUse: "See IFU. Not a dose. Independent review of the Prescribing Information required.",
    license,
    generated: new Date().toISOString(),
    regimen: selected.map((id) => DRUG_BY_ID[id]?.name).filter(Boolean),
    host,
    highest: report.highest,
    findings: report.findings,
    footer: PI_FOOTER,
  };
  const blob = new Blob([JSON.stringify(body, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "firstpass-desk.json";
  a.click();
  URL.revokeObjectURL(url);
}

function exportCsv(report: ReturnType<typeof analyze>, selected: string[]) {
  const rows = [
    ["severity", "kind", "headline", "mechanism", "effect", "clinical", "enzymes", "drugs"].join(","),
    ...report.findings.map((f) =>
      [
        f.severity,
        f.kind,
        csv(f.headline),
        csv(f.mechanism),
        csv(f.effect),
        csv(f.clinical),
        csv(f.enzymes.join("|")),
        csv(f.drugIds.map((id) => DRUG_BY_ID[id]?.name ?? id).join("|")),
      ].join(","),
    ),
  ];
  const blob = new Blob(
    [`# FirstPass ${SOFTWARE.version} ${selected.map((id) => DRUG_BY_ID[id]?.name ?? id).join(" + ")}\n# ${PI_FOOTER}\n${rows.join("\n")}`],
    { type: "text/csv" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "firstpass-desk.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function csv(s: string) {
  const t = s.replace(/"/g, '""');
  return `"${t}"`;
}


function PackStrip({
  packId,
  activeCaseId,
  onSelect,
}: {
  packId: PackId;
  activeCaseId: string | null;
  onSelect: (caseId: string) => void;
}) {
  const pack = PACKS[packId];
  return (
    <section className="rounded-xl bg-surface px-4 py-3 shadow-[var(--shadow-border)] sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">Teaching pack</p>
          <h2 className="mt-1 font-serif text-lg tracking-tight text-fg">{pack.title}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{pack.blurb}</p>
        </div>
        <CopyCaseLink
          sampleId={activeCaseId ?? pack.caseIds[0]}
          packId={packId}
          label="Copy pack link"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {pack.caseIds.map((id) => {
          const sample = SAMPLE_REGIMENS.find((s) => s.id === id);
          const active = id === activeCaseId;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className={cn(
                "h-9 rounded-full px-3 text-xs font-medium transition-colors",
                active ? "bg-accent text-accent-fg" : "bg-bg-sunken text-muted hover:text-fg",
              )}
              title={sample?.blurb}
            >
              {sample?.title ?? id}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CopyCaseLink({
  sampleId,
  packId,
  label = "Copy link",
  className,
}: {
  sampleId: string;
  packId?: PackId | null;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copy(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const href = packId ? buildPackUrl(packId, { caseId: sampleId }) : buildCaseUrl(sampleId);
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard may be blocked */
    }
  }
  return (
    <button
      type="button"
      onClick={(e) => void copy(e)}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-full bg-accent-soft px-2.5 font-mono text-[10px] uppercase tracking-wide text-accent hover:bg-accent hover:text-accent-fg",
        className,
      )}
      title={`Copy ${SITE.url} link`}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copied" : label}
    </button>
  );
}
