import { useEffect, useState } from "react";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { citesFor, pubmedUrl, type PairEvidencePack } from "@/lib/drugs/pubmed";
import { lookupPairEvidence } from "@/lib/drugs/pubmed-rpc";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const LINK = `text-accent underline underline-offset-2 ${FOCUS}`;
const name = (id: string) => DRUG_BY_ID[id]?.name ?? id;

/** Presentational: one heading per pair, curated shelf papers first, then live hits, then why a search failed. */
export function PairEvidenceView({ pack }: { pack: PairEvidencePack }) {
  if (pack.pairs.length === 0) {
    return <p className="text-xs text-muted">No pairs to search. A quiet search is not a green light.</p>;
  }
  return (
    <div className="space-y-4">
      {pack.pairs.map((ev) => {
        const curated = citesFor(ev.pair).slice(0, 4);
        const known = new Set(curated.map((c) => c.pmid));
        const live = ev.hits.filter((h) => !known.has(h.pmid));
        return (
          <section key={ev.pair.join("|")} aria-label={`${name(ev.pair[0])} and ${name(ev.pair[1])}`}>
            <h3 className="text-sm font-medium text-fg">
              {name(ev.pair[0])} + {name(ev.pair[1])}
            </h3>
            {curated.length > 0 ? (
              <ul className="mt-1 space-y-1.5">
                {curated.map((c) => (
                  <li key={c.pmid} className="text-xs text-fg">
                    <a className={LINK} href={pubmedUrl(c.pmid)} target="_blank" rel="noreferrer">
                      {c.title}
                    </a>{" "}
                    <span className="text-muted">
                      {c.journal}, {c.year}. Curated shelf. {c.why}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {live.length > 0 ? (
              <ul className="mt-1 space-y-1.5">
                {live.map((h) => (
                  <li key={h.pmid} className="text-xs text-fg">
                    <a className={LINK} href={pubmedUrl(h.pmid)} target="_blank" rel="noreferrer">
                      {h.title}
                    </a>{" "}
                    <span className="text-muted">
                      {h.journal}, {h.year}. Live PubMed hit, not summarized or graded.
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {!ev.ok || (live.length === 0 && curated.length === 0) ? (
              <p className="mt-1 text-xs text-muted">
                {ev.reason ?? "Nothing found for this pair."} A quiet search is not a green light.
              </p>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

/** Fetches only when asked: a button, never on a tray change. */
export function EvidencePanel({ ids }: { ids: string[] }) {
  const key = ids.join("|");
  const [state, setState] = useState<
    { kind: "idle" } | { kind: "busy" } | { kind: "done"; pack: PairEvidencePack; key: string } | { kind: "err" }
  >({ kind: "idle" });
  // A tray change drops the old answer; it does not start a new search.
  useEffect(() => setState({ kind: "idle" }), [key]);
  if (ids.length < 2) return null;
  const ask = () => {
    setState({ kind: "busy" });
    lookupPairEvidence({ data: { ids } })
      .then((pack) => setState({ kind: "done", pack, key }))
      .catch(() => setState({ kind: "err" }));
  };
  return (
    <section
      aria-labelledby="pair-evidence-h"
      className="space-y-3 rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)] sm:px-5"
    >
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Evidence by pair</p>
        <h2 id="pair-evidence-h" className="mt-1 font-serif text-xl tracking-tight text-fg">
          Papers for each pair on this desk
        </h2>
        <p className="mt-1 text-xs text-muted">
          Curated shelf papers first, then live PubMed hits as links. A search runs only when you ask.
        </p>
      </div>
      <button
        type="button"
        onClick={ask}
        disabled={state.kind === "busy"}
        className={`inline-flex min-h-9 items-center rounded-md border border-border bg-surface px-3 text-xs text-fg hover:bg-surface-sunken disabled:opacity-60 ${FOCUS}`}
      >
        {state.kind === "busy" ? "Searching PubMed" : "Search PubMed for each pair"}
      </button>
      <div aria-live="polite">
        {state.kind === "done" && state.key === key ? <PairEvidenceView pack={state.pack} /> : null}
        {state.kind === "err" ? (
          <p className="text-xs text-muted">PubMed did not answer. A quiet search is not a green light.</p>
        ) : null}
      </div>
    </section>
  );
}
