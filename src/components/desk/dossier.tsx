import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { DRUGBANK, drugbankSearchUrl, drugbankUrl } from "@/lib/drugs/drugbank";
import { lookupCpicGuideline, lookupLiveSources, searchTrials } from "@/lib/drugs/live-rpc";
import type { DailyMedHit, FdaLabel, FaersHit, NdcHit, PubchemCard, RecallHit, RxnormCard, ShortageHit, TrialHit } from "@/lib/drugs/live";
import { LIVERTOX_CAT_TONE, livertoxFor, livertoxUrl } from "@/lib/drugs/livertox";
import { lactFor, lactmedHomeUrl, lactmedSearchUrl, lactOnDesk, type LactCard } from "@/lib/drugs/lactmed";
import { pgxFor, type PgxCard } from "@/lib/drugs/pgx";
import { citesFor, pubmedSearchUrl, pubmedUrl, type Cite, type LiveCite } from "@/lib/drugs/pubmed";
import { searchPubmed } from "@/lib/drugs/pubmed-rpc";
import { stahlFor, type Occupancy, type StahlCard } from "@/lib/drugs/stahl";
import { PHENOTYPE_ENZYMES, type HostContext, type PhenotypeEnzyme } from "@/lib/drugs/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Tab = "drugbank" | "pgx" | "stahl" | "pubmed" | "fda" | "rxnorm" | "liver" | "pubchem" | "trials" | "lactmed";

/** Everyday shelf labels — tab ids/order unchanged. */
const TAB_PLAIN: Record<Tab, string> = {
  stahl: "Receptors",
  pgx: "Genes",
  drugbank: "Targets",
  fda: "Label",
  rxnorm: "Names",
  pubchem: "Molecule",
  liver: "Liver",
  lactmed: "Nursing",
  pubmed: "Papers",
  trials: "Trials",
};

type LivePack = {
  ok: boolean;
  query: string;
  label: FdaLabel | null;
  faers: FaersHit[];
  rxnorm: RxnormCard | null;
  pubchem: PubchemCard | null;
  dailymed: DailyMedHit[];
  shortage: ShortageHit[];
  ndc: NdcHit[];
  recalls: RecallHit[];
  reason?: string;
};

export function Dossier({ ids, host }: { ids: string[]; host: HostContext }) {
  const present = ids.filter((id) => DRUG_BY_ID[id]);
  const [drugId, setDrugId] = useState(present[0] ?? "");
  const id = present.includes(drugId) ? drugId : (present[0] ?? "");
  const drug = DRUG_BY_ID[id];
  const bank = id ? DRUGBANK[id] : undefined;
  const pgx = id ? pgxFor(id) : [];
  const stahl = id ? stahlFor(id) : null;
  const liver = id ? livertoxFor(id) : undefined;
  const lact = id ? lactFor(id) : undefined;
  const curated = useMemo(() => citesFor(present), [present.join("|")]);
  const [tab, setTab] = useState<Tab>("stahl");

  const tabs = useMemo(() => {
    const t: { id: Tab; label: string; on: boolean }[] = [
      { id: "stahl", label: TAB_PLAIN.stahl, on: Boolean(stahl) },
      { id: "pgx", label: TAB_PLAIN.pgx, on: pgx.length > 0 },
      { id: "drugbank", label: TAB_PLAIN.drugbank, on: Boolean(bank) },
      { id: "fda", label: TAB_PLAIN.fda, on: Boolean(drug && drug.kind === "drug") },
      { id: "rxnorm", label: TAB_PLAIN.rxnorm, on: Boolean(drug && drug.kind === "drug") },
      { id: "pubchem", label: TAB_PLAIN.pubchem, on: Boolean(drug) },
      { id: "liver", label: TAB_PLAIN.liver, on: Boolean(liver) },
      { id: "lactmed", label: TAB_PLAIN.lactmed, on: Boolean(lact) || Boolean(drug) },
      { id: "pubmed", label: TAB_PLAIN.pubmed, on: true },
      { id: "trials", label: TAB_PLAIN.trials, on: Boolean(drug && drug.kind === "drug") },
    ];
    return t;
  }, [stahl, pgx.length, bank, drug, liver, lact]);

  const liveTab = tabs.some((t) => t.id === tab && t.on)
    ? tab
    : (tabs.find((t) => t.on)?.id ?? "drugbank");

  if (!drug) return null;

  return (
    <section className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
      <div className="rounded-lg border border-accent/15 bg-accent-soft/30 p-3 sm:p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Dossier coach</p>
        <p className="mt-1.5 text-sm leading-relaxed text-fg">
          Pick a name on this tray, then open a shelf — receptors, genes, label language, liver notes,
          nursing, papers, and trials. Soft chips use everyday words; the live APIs behind them are unchanged.
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          A quiet or empty shelf is not a green light. This desk can miss risks; the Prescribing Information
          and the clinician still win. Educational only — not a complete literature search, not dosing advice.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg tracking-tight text-fg">Drug dossier</h2>
          <p className="text-xs leading-relaxed text-muted">
            Receptors · genes · targets · label · names · molecule · liver · nursing · papers · trials
          </p>
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Dossier shelves">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              disabled={!t.on}
              title={t.on ? t.label : `${t.label} — nothing mapped for this name yet`}
              className={cn(
                "h-10 rounded-full px-3 text-xs font-medium",
                liveTab === t.id ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
                !t.on && "opacity-40",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {present.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {present.map((pid) => (
            <button
              key={pid}
              type="button"
              onClick={() => setDrugId(pid)}
              className={cn(
                "h-10 rounded-full px-3 text-xs font-medium",
                pid === id ? "bg-accent text-accent-fg" : "bg-bg-sunken text-muted hover:text-fg",
              )}
            >
              {DRUG_BY_ID[pid]?.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-4">
        {liveTab === "stahl" ? (
          stahl ? (
            <StahlPanel name={drug.name} card={stahl} />
          ) : (
            <EmptySource>
              No receptor sketch mapped for {drug.name} yet. Mood, MAT, and ketamine-class names often
              get one; many clinic staples are enzyme-only on this shelf. Empty here is not “safe” —
              try Genes, Label, or Papers.
            </EmptySource>
          )
        ) : null}
        {liveTab === "pgx" ? (
          pgx.length ? (
            <PgxPanel cards={pgx} host={host} name={drug.name} />
          ) : (
            <div className="space-y-4">
              <EmptySource>
                No gene-guide row mapped for {drug.name} on this shelf. Search{" "}
                <Out href={`https://www.clinpgx.org/search?query=${encodeURIComponent(drug.name)}`}>
                  ClinPGx
                </Out>{" "}
                if a gene still belongs on the chart — empty here is not a green light.
              </EmptySource>
              <LiveCpic name={drug.name} />
            </div>
          )
        ) : null}
        {liveTab === "drugbank" ? (
          bank ? (
            <BankPanel id={id} />
          ) : (
            <EmptySource>
              No target card on this shelf
              {drug.kind !== "drug" ? " — food, herb, or host factor." : " yet."}{" "}
              <Out href={drugbankSearchUrl(drug.name)}>Search DrugBank</Out>
              {" "}Empty targets is not the same as safe.
            </EmptySource>
          )
        ) : null}
        {liveTab === "fda" ? <FdaPanel id={id} /> : null}
        {liveTab === "rxnorm" ? <RxnormPanel id={id} /> : null}
        {liveTab === "pubchem" ? <PubchemPanel id={id} /> : null}
        {liveTab === "liver" ? (
          liver ? (
            <LiverSource id={id} />
          ) : (
            <EmptySource>
              No liver note mapped for {drug.name} on this shelf. Search{" "}
              <Out href={livertoxUrl(id, drug.name)}>NIDDK LiverTox</Out>
              {" "}— missing chapter ≠ cleared for the liver.
            </EmptySource>
          )
        ) : null}
        {liveTab === "lactmed" ? <LactPanel id={id} ids={present} /> : null}
        {liveTab === "pubmed" ? <PubmedPanel ids={present} curated={curated} /> : null}
        {liveTab === "trials" ? <TrialsPanel ids={present} /> : null}
      </div>
    </section>
  );
}

function useLive(id: string, want: boolean) {
  const [pack, setPack] = useState<LivePack | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!want || !id) return;
    let live = true;
    setBusy(true);
    setErr(null);
    void lookupLiveSources({ data: { id } })
      .then((res) => {
        if (!live) return;
        setPack(res);
        if (!res.ok) setErr(res.reason ?? "Did not answer.");
      })
      .catch(() => {
        if (!live) return;
        setErr("Did not answer.");
        setPack(null);
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [id, want]);
  return { pack, busy, err };
}

function FdaPanel({ id }: { id: string }) {
  const drug = DRUG_BY_ID[id];
  const { pack, busy, err } = useLive(id, true);
  if (!drug) return null;
  const label = pack?.label;
  return (
    <div className="space-y-4">
      {busy && !pack ? <p className="text-sm text-muted">Asking OpenFDA…</p> : null}
      {err ? <p className="text-sm text-danger">{err}</p> : null}
      {pack?.reason && !label ? <p className="text-sm text-muted">{pack.reason}</p> : null}
      {label ? (
        <>
          <div className="flex flex-wrap gap-1.5">
            {label.brands.map((b) => (
              <Badge key={b} tone="info">
                {b}
              </Badge>
            ))}
            {label.classes.map((c) => (
              <Badge key={c}>{c}</Badge>
            ))}
            {label.unii[0] ? <span className="font-mono text-[11px] text-muted">UNII {label.unii[0]}</span> : null}
          </div>
          {label.boxed ? (
            <div className="rounded-md bg-danger-soft px-3 py-3">
              <p className="font-mono text-[10px] uppercase tracking-wide text-danger">Boxed warning</p>
              <p className="mt-1 text-sm leading-relaxed text-fg">{label.boxed}</p>
            </div>
          ) : (
            <p className="text-sm text-muted">No boxed warning on the OpenFDA SPL we pulled.</p>
          )}
          {label.indications ? (
            <p className="text-sm leading-relaxed text-fg">
              <span className="font-medium">Indications. </span>
              {label.indications}
            </p>
          ) : null}
          {label.contraindications ? (
            <p className="text-sm leading-relaxed text-fg">
              <span className="font-medium">Contraindications. </span>
              {label.contraindications}
            </p>
          ) : null}
          {label.warnings ? (
            <p className="text-sm leading-relaxed text-muted">
              <span className="font-medium text-fg">Warnings. </span>
              {label.warnings}
            </p>
          ) : null}
          {label.interactions ? (
            <p className="text-sm leading-relaxed text-fg">
              <span className="font-medium">Label interactions. </span>
              {label.interactions}
            </p>
          ) : null}
          {label.pregnancy ? (
            <p className="text-sm leading-relaxed text-muted">
              <span className="font-medium text-fg">Pregnancy excerpt. </span>
              {label.pregnancy}
            </p>
          ) : null}
          {label.setId ? (
            <Out href={`https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${encodeURIComponent(label.setId)}`}>
              Open DailyMed
            </Out>
          ) : (
            <Out href={`https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${encodeURIComponent(drug.name)}`}>
              Search DailyMed
            </Out>
          )}
        </>
      ) : null}
      {pack?.dailymed?.length ? (
        <div>
          <h3 className="font-mono text-[11px] uppercase tracking-wide text-muted">DailyMed SPL</h3>
          <ul className="mt-2 space-y-2">
            {pack.dailymed.map((d) => (
              <li key={d.setId} className="rounded-md bg-bg-sunken px-3 py-2">
                <p className="text-sm text-fg">{d.title}</p>
                {d.published ? <p className="font-mono text-[11px] text-muted">{d.published}</p> : null}
                <Out href={`https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${encodeURIComponent(d.setId)}`}>
                  Open SPL
                </Out>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {pack?.shortage?.length ? (
        <div>
          <h3 className="font-mono text-[11px] uppercase tracking-wide text-muted">FDA shortage</h3>
          <ul className="mt-2 space-y-2">
            {pack.shortage.map((s, i) => (
              <li key={`${s.name}-${i}`} className="flex flex-wrap items-baseline justify-between gap-2 rounded-md bg-warn-soft px-3 py-2">
                <span className="text-sm text-fg">{s.name}</span>
                <span className="font-mono text-[11px] uppercase text-warn">
                  {s.status}
                  {s.updated ? ` · ${s.updated}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {pack?.ndc?.length ? (
        <div>
          <h3 className="font-mono text-[11px] uppercase tracking-wide text-muted">OpenFDA NDC</h3>
          <ul className="mt-2 space-y-2">
            {pack.ndc.map((n) => (
              <li key={n.ndc || n.brand} className="rounded-md bg-bg-sunken px-3 py-2">
                <p className="text-sm text-fg">{n.brand || n.generic}</p>
                <p className="font-mono text-[11px] text-muted">
                  {n.ndc}
                  {n.form ? ` · ${n.form}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {pack?.recalls?.length ? (
        <div>
          <h3 className="font-mono text-[11px] uppercase tracking-wide text-muted">FDA enforcement</h3>
          <ul className="mt-2 space-y-2">
            {pack.recalls.map((r, i) => (
              <li key={`${r.date}-${i}`} className="rounded-md bg-warn-soft px-3 py-2">
                <div className="flex flex-wrap items-baseline gap-2">
                  {r.classification ? <Badge tone="warn">{r.classification}</Badge> : null}
                  {r.status ? <span className="font-mono text-[11px] text-muted">{r.status}</span> : null}
                  {r.date ? <span className="font-mono text-[11px] text-muted">{r.date}</span> : null}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-fg">{r.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {pack?.faers.length ? (
        <div>
          <h3 className="font-mono text-[11px] uppercase tracking-wide text-muted">FAERS reactions (counts, not rates)</h3>
          <ul className="mt-2 divide-y divide-border rounded-md bg-bg-sunken">
            {pack.faers.map((f) => (
              <li key={f.term} className="flex items-baseline justify-between gap-3 px-3 py-2">
                <span className="text-sm text-fg">{titleCase(f.term)}</span>
                <span className="font-mono text-xs tabular-nums text-muted">{f.count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="text-[11px] leading-relaxed text-subtle">
        Live FDA label language plus shortage, NDC, and enforcement pulls. Boxed text is the label’s,
        truncated. FAERS counts are raw reports — not incidence, not causation. Educational — not a
        complete label, and a quiet pull is not a green light.
      </p>
    </div>
  );
}

function RxnormPanel({ id }: { id: string }) {
  const drug = DRUG_BY_ID[id];
  const { pack, busy, err } = useLive(id, true);
  if (!drug) return null;
  const rx = pack?.rxnorm;
  const rxcui = rx?.rxcui || pack?.label?.rxcui[0];
  return (
    <div className="space-y-4">
      {busy && !pack ? <p className="text-sm text-muted">Asking RxNorm…</p> : null}
      {err ? <p className="text-sm text-danger">{err}</p> : null}
      {rxcui ? (
        <>
          <p className="font-mono text-sm text-fg">RxCUI {rxcui}</p>
          {rx?.brands.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {rx.brands.map((b) => (
                <li key={b}>
                  <Badge tone="info">{b}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No brand names returned for this ingredient.</p>
          )}
          <div className="flex flex-wrap gap-3">
            <Out href={`https://mor.nlm.nih.gov/RxNav/search?searchBy=RXCUI&searchTerm=${encodeURIComponent(rxcui)}`}>
              Open RxNav
            </Out>
            <Out href={`https://rxnav.nlm.nih.gov/REST/rxcui/${encodeURIComponent(rxcui)}/allrelated.json`}>
              Related JSON
            </Out>
          </div>
        </>
      ) : !busy ? (
        <EmptySource>
          No drug-name id returned for {drug.name} yet.{" "}
          <Out href={`https://mor.nlm.nih.gov/RxNav/search?searchBy=String&searchTerm=${encodeURIComponent(drug.name)}`}>
            Search RxNav
          </Out>
          {" "}Empty names is not the same as safe.
        </EmptySource>
      ) : null}
      <p className="text-[11px] leading-relaxed text-subtle">
        NLM RxNorm ingredient identifier and brand names (TTY=BN). Identity only — CYP scoring stays
        on this desk.
      </p>
    </div>
  );
}

function PubchemPanel({ id }: { id: string }) {
  const drug = DRUG_BY_ID[id];
  const { pack, busy, err } = useLive(id, true);
  if (!drug) return null;
  const chem = pack?.pubchem;
  return (
    <div className="space-y-4">
      {busy && !pack ? <p className="text-sm text-muted">Asking PubChem…</p> : null}
      {err ? <p className="text-sm text-danger">{err}</p> : null}
      {chem ? (
        <>
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-wide text-muted">CID</dt>
              <dd className="font-mono text-sm text-fg">{chem.cid}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-wide text-muted">Formula</dt>
              <dd className="font-mono text-sm text-fg">{chem.formula || "—"}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-wide text-muted">MW</dt>
              <dd className="font-mono text-sm text-fg">{chem.mw || "—"}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-wide text-muted">InChIKey</dt>
              <dd className="break-all font-mono text-xs text-fg">{chem.inchikey || "—"}</dd>
            </div>
          </dl>
          {chem.iupac ? <p className="text-sm leading-relaxed text-muted">{chem.iupac}</p> : null}
          <div className="flex flex-wrap gap-3">
            <Out href={`https://pubchem.ncbi.nlm.nih.gov/compound/${encodeURIComponent(chem.cid)}`}>Open CID {chem.cid}</Out>
            <Out href={`https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(drug.name)}`}>Search PubChem</Out>
          </div>
        </>
      ) : !busy ? (
        <EmptySource>
          No molecule card returned for {drug.name} yet.{" "}
          <Out href={`https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(drug.name)}`}>Search PubChem</Out>
          {" "}Empty here is not a green light.
        </EmptySource>
      ) : null}
      <p className="text-[11px] leading-relaxed text-subtle">
        NCBI PubChem PUG REST. Identity only — formula and InChIKey, not a docking score. Street
        items often still resolve here when OpenFDA does not.
      </p>
    </div>
  );
}

function TrialsPanel({ ids }: { ids: string[] }) {
  const [hits, setHits] = useState<TrialHit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const names = ids.map((id) => DRUG_BY_ID[id]?.name).filter(Boolean);

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const res = await searchTrials({ data: { query: "", ids } });
      if (!res.ok) setErr(res.reason ?? "ClinicalTrials.gov did not answer.");
      setHits(res.hits);
    } catch {
      setErr("ClinicalTrials.gov did not answer.");
      setHits([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted">
        Live NLM ClinicalTrials.gov v2 for {names.join(" + ") || "this desk"}. Status and phase only —
        not eligibility and not a protocol.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" disabled={busy || ids.length === 0} onClick={() => void run()}>
          {busy ? "Searching…" : "Search ClinicalTrials.gov"}
        </Button>
        {names.length ? (
          <Out href={`https://clinicaltrials.gov/search?term=${encodeURIComponent(names.join(" "))}`}>Open CT.gov</Out>
        ) : null}
      </div>
      {err ? <p className="text-sm text-danger">{err}</p> : null}
      {hits && hits.length === 0 && !err ? (
        <p className="text-sm text-muted">No studies returned for this query.</p>
      ) : null}
      {hits && hits.length > 0 ? (
        <ul className="space-y-3">
          {hits.map((h) => (
            <li key={h.nctId} className="rounded-md bg-bg-sunken px-3 py-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-[11px] text-accent">{h.nctId}</span>
                {h.status ? <Badge tone="info">{h.status}</Badge> : null}
                {h.phase ? <span className="font-mono text-[11px] text-muted">{h.phase}</span> : null}
              </div>
              <p className="mt-1 text-sm font-medium leading-snug text-fg">{h.title}</p>
              <Out href={`https://clinicaltrials.gov/study/${encodeURIComponent(h.nctId)}`}>Open {h.nctId}</Out>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-[11px] leading-relaxed text-subtle">
        ClinicalTrials.gov API v2. A hit is a study listing — not an indication and not a green light. Educational.
      </p>
    </div>
  );
}

function LiverSource({ id }: { id: string }) {
  const drug = DRUG_BY_ID[id];
  const card = livertoxFor(id);
  if (!drug || !card) return null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-serif text-xl tracking-tight text-fg">{drug.name}</h3>
        <Badge tone={LIVERTOX_CAT_TONE[card.cat]}>
          {card.cat} · {card.label}
        </Badge>
      </div>
      <p className="text-sm leading-relaxed text-fg">{card.pearl}</p>
      <Out href={livertoxUrl(id, drug.name)}>Open LiverTox chapter</Out>
      <p className="text-[11px] leading-relaxed text-subtle">
        Likelihood paraphrases NIDDK LiverTox. Open the chapter for the official category, latency,
        and cases.
      </p>
    </div>
  );
}

function LactPanel({ id, ids }: { id: string; ids: string[] }) {
  const drug = DRUG_BY_ID[id];
  const card = lactFor(id);
  const others = lactOnDesk(ids).filter((c) => c.id !== id);
  const tone = (level: LactCard["level"]): "ok" | "warn" | "danger" =>
    level === "compatible" ? "ok" : level === "caution" ? "warn" : "danger";
  if (!drug) return null;
  return (
    <div className="space-y-4">
      {card ? (
        <article>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif text-xl tracking-tight text-fg">{drug.name}</h3>
            <Badge tone={tone(card.level)}>{card.level}</Badge>
            <span className="font-mono text-[11px] text-muted">RID {card.rid}</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-fg">{card.pearl}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            <span className="font-medium text-fg">Milk. </span>
            {card.milk}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            <span className="font-medium text-fg">Infant. </span>
            {card.infant}
          </p>
        </article>
      ) : (
        <EmptySource>
          No nursing note mapped for {drug.name} on this shelf. Search{" "}
          <Out href={lactmedSearchUrl(drug.name)}>NCBI LactMed</Out>
          {" "}— empty here is not clearance for breastfeeding.
        </EmptySource>
      )}
      {others.length ? (
        <ul className="space-y-2">
          {others.map((c) => (
            <li key={c.id} className="rounded-md bg-bg-sunken px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-fg">{DRUG_BY_ID[c.id]?.name ?? c.id}</span>
                <Badge tone={tone(c.level)}>{c.level}</Badge>
                <span className="font-mono text-[11px] text-muted">RID {c.rid}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted">{c.pearl}</p>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Out href={lactmedSearchUrl(drug.name)}>Search LactMed for {drug.name}</Out>
        <Out href={lactmedHomeUrl()}>LactMed home</Out>
      </div>
      <p className="text-[11px] leading-relaxed text-subtle">
        Relative infant dose is a teaching range, paraphrasing NIH LactMed. Not a measurement, not a
        pump-and-dump protocol, and not a reason to stop addiction-care medicines on its own.
      </p>
    </div>
  );
}

function BankPanel({ id }: { id: string }) {
  const drug = DRUG_BY_ID[id];
  const bank = DRUGBANK[id];
  if (!bank || !drug) return null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-sm text-fg">{bank.accession}</span>
        {bank.extra?.map((x) => (
          <span key={x} className="font-mono text-xs text-muted">
            {x}
          </span>
        ))}
        <Badge tone="info">{bank.group}</Badge>
      </div>
      <p className="text-sm leading-relaxed text-muted">
        What this medicine is known to aim at, as indexed on DrugBank. The collision map on this desk
        is FirstPass’s own teaching chart — not a dump of DrugBank’s interaction engine.
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {bank.targets.map((t) => (
          <li key={t}>
            <Badge>{t}</Badge>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3 pt-1">
        <Out href={drugbankUrl(bank.accession)}>Open {bank.accession}</Out>
        {bank.extra?.map((x) => (
          <Out key={x} href={drugbankUrl(x)}>
            Open {x}
          </Out>
        ))}
        <Out href={drugbankSearchUrl(drug.name)}>Search DrugBank</Out>
      </div>
    </div>
  );
}

function PgxPanel({ cards, host, name }: { cards: PgxCard[]; host: HostContext; name: string }) {
  return (
    <div className="space-y-5">
      {cards.map((card) => (
        <article key={card.gene}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-mono text-sm text-fg">{card.gene}</h3>
            <Badge tone={card.cpic === "A" ? "accent" : card.cpic === "B" ? "warn" : "default"}>
              CPIC {card.cpic}
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-fg">{card.pearl}</p>
          <ul className="mt-3 divide-y divide-border rounded-md bg-bg-sunken">
            {card.rows.map((row) => {
              const on = phenoMatches(card.gene, row.pheno, host);
              return (
                <li
                  key={row.pheno}
                  className={cn("grid gap-1 px-3 py-2.5 sm:grid-cols-[140px_minmax(0,1fr)]", on && "bg-accent-soft")}
                >
                  <span className="font-mono text-xs uppercase tracking-wide text-muted">{row.pheno}</span>
                  <span className="text-sm text-fg">
                    {row.action}
                    {on ? <span className="ml-2 font-mono text-[10px] uppercase text-accent">this host</span> : null}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex flex-wrap gap-3">
            <Out href={card.guideline}>CPIC guideline</Out>
            <Out href={card.clinpgx}>ClinPGx / PharmGKB</Out>
          </div>
        </article>
      ))}
      <LiveCpic name={name} />
      <p className="text-[11px] leading-relaxed text-subtle">
        Plain-language paraphrase of published gene guides (CPIC / DPWG). Open the guideline for the
        official algorithm. Not a test order, not a dose, and not a green light if a row is quiet.
      </p>
    </div>
  );
}

function LiveCpic({ name }: { name: string }) {
  const [hits, setHits] = useState<Array<{ drug: string; guideline: string; url: string; drugid: string }> | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const res = await lookupCpicGuideline({ data: { name } });
      if (!res.ok) setErr(res.reason ?? "CPIC did not answer.");
      setHits(res.hits);
      if (res.ok && res.hits.length === 0) setErr(res.reason ?? "No guideline row.");
    } catch {
      setErr("CPIC did not answer.");
      setHits([]);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rounded-md bg-bg-sunken px-3 py-3">
      <p className="font-mono text-[11px] uppercase tracking-wide text-muted">Ask the gene guides</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Live lookup at api.cpicpgx.org for {name}. A hit is a published guideline to read — not a dose
        and not a test order.
      </p>
      <div className="mt-2">
        <Button variant="secondary" size="sm" disabled={busy || !name} onClick={() => void run()}>
          {busy ? "Asking CPIC…" : "Ask CPIC"}
        </Button>
      </div>
      {err ? <p className="mt-2 text-sm text-danger">{err}</p> : null}
      {hits && hits.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {hits.map((h) => (
            <li key={`${h.drugid}-${h.guideline}`}>
              <p className="text-sm font-medium text-fg">{h.guideline}</p>
              <p className="font-mono text-[11px] text-muted">{h.drug}</p>
              <Out href={h.url}>Open guideline</Out>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function StahlPanel({ name, card }: { name: string; card: StahlCard }) {
  if (!card) return null;
  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">{name}</p>
        <p className="mt-1 font-serif text-xl tracking-tight text-fg">{card.spectrum}</p>
      </div>
      {card.occupancy.length > 0 ? (
        <ul className="space-y-2">
          {card.occupancy.map((o) => (
            <li key={o.r}>
              <ReceptorBar o={o} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-relaxed text-muted">
          No single-receptor bars for this one — the ion channel or enzyme is the teaching point.
        </p>
      )}
      <p className="text-sm leading-relaxed text-fg">{card.pearl}</p>
      <p className="text-sm leading-relaxed text-muted">{card.sides}</p>
      <p className="text-[11px] leading-relaxed text-subtle">
        Educational receptor sketch (spectrum first, then how hard it sits on each target, then side
        effects that follow). Original language — not a quotation of Stahl’s Essential
        Psychopharmacology. Not a dose and not a prescription.
      </p>
    </div>
  );
}

function ReceptorBar({ o }: { o: Occupancy }) {
  const width = { 1: "w-1/4", 2: "w-1/2", 3: "w-3/4", 4: "w-full" }[o.n];
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-xs text-fg">{o.r}</span>
        <span className="font-mono text-[10px] uppercase tracking-wide text-subtle">{tick(o.n)}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-bg-sunken">
        <div className={cn("h-full rounded-full bg-accent", width)} />
      </div>
    </div>
  );
}

function tick(n: 1 | 2 | 3 | 4) {
  return "+".repeat(n);
}

function PubmedPanel({ ids, curated }: { ids: string[]; curated: Cite[] }) {
  const [live, setLive] = useState<LiveCite[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const names = ids.map((id) => DRUG_BY_ID[id]?.name).filter(Boolean);

  async function runLive() {
    setBusy(true);
    setErr(null);
    try {
      const res = await searchPubmed({ data: { query: "", ids } });
      if (!res.ok) setErr(res.reason ?? "PubMed did not answer.");
      setLive(res.hits);
    } catch {
      setErr("PubMed did not answer.");
      setLive([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {curated.length ? (
        <ul className="space-y-3">
          {curated.map((c) => (
            <li key={c.pmid} className="rounded-md bg-bg-sunken px-3 py-3">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-mono text-[11px] text-accent">PMID {c.pmid}</span>
                <span className="font-mono text-[11px] text-muted">
                  {c.year} · {c.journal}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium leading-snug text-fg">{c.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{c.why}</p>
              <Out href={pubmedUrl(c.pmid)}>Open {c.pmid}</Out>
            </li>
          ))}
        </ul>
      ) : (
        <EmptySource>
          No curated paper on this tray yet. Search Papers live, or browse the Sources shelf — empty here is not “nothing to know.”
        </EmptySource>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" disabled={busy || ids.length === 0} onClick={() => void runLive()}>
          {busy ? "Searching…" : "Search PubMed for this desk"}
        </Button>
        {names.length ? (
          <Out href={pubmedSearchUrl(`${names.join(" ")} drug interaction`)}>Open NCBI</Out>
        ) : null}
      </div>
      {err ? <p className="text-sm text-danger">{err}</p> : null}
      {live && live.length === 0 && !err ? (
        <p className="text-sm text-muted">NCBI returned no hits for this query.</p>
      ) : null}
      {live && live.length > 0 ? (
        <ul className="space-y-3">
          {live.map((c) => (
            <li key={c.pmid} className="rounded-md bg-bg-sunken px-3 py-3">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-mono text-[11px] text-accent">PMID {c.pmid}</span>
                <span className="font-mono text-[11px] text-muted">
                  {c.year} · {c.journal}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium leading-snug text-fg">{c.title}</p>
              {c.authors ? <p className="mt-1 text-xs text-muted">{c.authors}</p> : null}
              <Out href={pubmedUrl(c.pmid)}>Open {c.pmid}</Out>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-[11px] leading-relaxed text-subtle">
        Curated titles come from NCBI esummary. Live hits are E-utilities, not a dump of MEDLINE.
        Educational — not a complete literature search. A quiet Papers shelf is not a green light.
      </p>
    </div>
  );
}

function EmptySource({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-muted">{children}</p>;
}

function Out({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-10 items-center gap-1.5 text-sm text-accent underline-offset-2 hover:underline"
    >
      {children}
      <ExternalLink className="size-3.5" />
    </a>
  );
}

function titleCase(s: string) {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function phenoMatches(gene: string, row: string, host: HostContext): boolean {
  const key = gene.split("/")[0]?.trim() as PhenotypeEnzyme | string;
  if (!PHENOTYPE_ENZYMES.includes(key as PhenotypeEnzyme)) return false;
  const p = host.phenotypes[key as PhenotypeEnzyme];
  if (!p) return false;
  const token = row.toUpperCase();
  if (p === "PM") return token.includes("PM");
  if (p === "IM") return token.includes("IM") && !token.includes("PM");
  if (p === "UM") return token.includes("UM");
  if (p === "NM") return token.includes("NM") && !token.includes("UM");
  return false;
}
