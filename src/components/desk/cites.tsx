import { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import {
  CITE_TAGS,
  CITES,
  pubmedSearchUrl,
  pubmedUrl,
  searchCites,
  type Cite,
  type CiteTag,
} from "@/lib/drugs/pubmed";
import { useDesk } from "@/lib/drugs/store";
import { cn } from "@/lib/utils";
import { Plate } from "./plate";

/** Everyday tag labels — ids/order stay in CITE_TAGS. */
const TAG_PLAIN: Record<CiteTag | "all", string> = {
  all: "All",
  cyp: "Enzymes",
  pgx: "Gene guides",
  mat: "Addiction care",
  food: "Food",
  herb: "Herbs",
  clinic: "Clinic",
  serotonin: "Serotonin",
  qt: "Heart rhythm",
  review: "Reviews",
};

const HOW_STEPS = [
  {
    n: "1",
    title: "Browse or filter",
    body: "Pick a topic chip, or search by drug, PMID, enzyme, or why-it-matters blurb.",
  },
  {
    n: "2",
    title: "Read the why",
    body: "Each card is a curated paper this desk cites — open PubMed for the full text.",
  },
  {
    n: "3",
    title: "Put drugs on the desk",
    body: "Tap a drug chip to load it, then check the Sources card once a pair is up.",
  },
] as const;

/** Suggested topic chips when a filter returns nothing (UI-only). */
const EMPTY_TAG_HINTS: CiteTag[] = ["cyp", "food", "herb", "pgx"];

export function CitesPage() {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<CiteTag | "all">("all");
  const add = useDesk((s) => s.add);
  const selected = useDesk((s) => s.selected);
  const setView = useDesk((s) => s.setView);

  const rows = useMemo(() => {
    const found = searchCites(q);
    if (tag === "all") return found;
    return found.filter((c) => c.tags.includes(tag));
  }, [q, tag]);

  const hasFilter = tag !== "all" || q.trim().length > 0;
  const pubmedQuery = q.trim() || "drug interaction CYP";

  function clearFilter() {
    setQ("");
    setTag("all");
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
        <div className="grid sm:grid-cols-[220px_minmax(0,1fr)]">
          <Plate src="/plates/heme.jpg" alt="" className="h-36 w-full min-h-36 sm:h-full" />
          <div className="px-5 py-5 sm:px-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Sources coach</p>
            <h2 className="mt-2 font-serif text-2xl tracking-tight text-fg">
              {CITES.length} papers this desk actually cites
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              A curated shelf for the collisions on this formulary — food and herb stories, gene guides,
              clinic classics, and enzyme reviews. Filter by topic or search, then open PubMed for the
              paper itself. Live NCBI, PubChem, DailyMed, and related links also show on the Sources card
              once a pair is on the desk.
            </p>
            <p className="mt-3 max-w-xl text-xs leading-relaxed text-subtle">
              Educational only — not a complete PubMed crawl, not dosing advice, not a prescription. The
              Prescribing Information and the primary paper still win.
            </p>
          </div>
        </div>
      </section>

      <section
        aria-label="How this works"
        className="rounded-xl bg-surface px-5 py-4 shadow-[var(--shadow-border)] sm:px-6"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">How this works</p>
        <ol className="mt-3 grid gap-3 sm:grid-cols-3">
          {HOW_STEPS.map((step) => (
            <li key={step.n} className="flex gap-3">
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-bg-sunken font-mono text-[11px] text-muted"
                aria-hidden
              >
                {step.n}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-fg">{step.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">{step.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by drug, PMID, enzyme, or story…"
          aria-label="Filter the sources shelf"
          className="h-12 w-full rounded-lg bg-surface-2 pl-10 pr-4 text-sm text-fg shadow-[var(--shadow-border)] placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        />
      </div>

      <div className="flex flex-wrap gap-1" role="group" aria-label="Source topics">
        {CITE_TAGS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTag(t.id)}
            aria-pressed={tag === t.id}
            className={cn(
              "h-10 rounded-full px-3 text-xs font-medium",
              tag === t.id ? "bg-ink text-bg" : "bg-bg-sunken text-muted hover:text-fg",
            )}
          >
            {TAG_PLAIN[t.id]}
          </button>
        ))}
      </div>

      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-2 bg-bg/95 px-1 py-2 backdrop-blur-sm">
        <p className="text-xs text-muted">
          <span className="font-mono tabular-nums">{rows.length}</span> shown
          {hasFilter ? (
            <>
              {" "}
              of <span className="font-mono tabular-nums">{CITES.length}</span>
              {tag !== "all" ? ` · ${TAG_PLAIN[tag]}` : ""}
              {q.trim() ? ` · “${q.trim()}”` : ""}
            </>
          ) : null}
        </p>
        {selected.length > 0 ? (
          <button
            type="button"
            onClick={() => setView("desk")}
            className="ml-auto h-8 rounded-full bg-ink px-3 text-[11px] font-medium text-bg sm:ml-0"
          >
            Open desk
          </button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <CitesEmptyCoach
          hasFilter={hasFilter}
          tag={tag}
          query={q.trim()}
          pubmedQuery={pubmedQuery}
          onClear={clearFilter}
          onTag={(id) => {
            setQ("");
            setTag(id);
          }}
          onView={setView}
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((c) => (
            <CiteCard
              key={c.pmid}
              cite={c}
              selected={selected}
              onAdd={(id) => {
                const ok = add(id);
                if (ok) setView("desk");
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CitesEmptyCoach({
  hasFilter,
  tag,
  query,
  pubmedQuery,
  onClear,
  onTag,
  onView,
}: {
  hasFilter: boolean;
  tag: CiteTag | "all";
  query: string;
  pubmedQuery: string;
  onClear: () => void;
  onTag: (id: CiteTag | "all") => void;
  onView: (view: "desk" | "library" | "rounds") => void;
}) {
  const headline = hasFilter ? "Nothing on this shelf matches" : "Nothing on this shelf";
  const body = hasFilter
    ? "Try clearing the search or topic chip, browse another topic, or open PubMed for a wider look — this shelf is curated for the formulary, not every paper ever indexed."
    : "That should not happen on an empty filter. Browse all to reset, or jump to the desk and library.";

  return (
    <div role="status" className="rounded-xl bg-surface px-5 py-8 shadow-[var(--shadow-border)] sm:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Sources coach</p>
      <p className="mt-2 text-sm font-medium text-fg">{headline}</p>
      <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">{body}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {hasFilter ? (
          <button
            type="button"
            onClick={onClear}
            className="h-9 rounded-full bg-ink px-3 text-xs font-medium text-bg"
          >
            Clear filter
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onTag("all")}
          className="h-9 rounded-full bg-bg-sunken px-3 text-xs font-medium text-muted hover:text-fg"
        >
          Browse all
        </button>
        {EMPTY_TAG_HINTS.filter((id) => id !== tag).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onTag(id)}
            className="h-9 rounded-full bg-bg-sunken px-3 text-xs font-medium text-muted hover:text-fg"
          >
            Try {TAG_PLAIN[id]}
          </button>
        ))}
        <a
          href={pubmedSearchUrl(pubmedQuery)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-bg-sunken px-3 text-xs font-medium text-muted hover:text-fg"
        >
          Search PubMed{query ? ` for “${query}”` : ""}
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
        <button
          type="button"
          onClick={() => onView("desk")}
          className="h-9 rounded-full bg-bg-sunken px-3 text-xs font-medium text-muted hover:text-fg"
        >
          Open desk
        </button>
        <button
          type="button"
          onClick={() => onView("library")}
          className="h-9 rounded-full bg-bg-sunken px-3 text-xs font-medium text-muted hover:text-fg"
        >
          Browse library
        </button>
        <button
          type="button"
          onClick={() => onView("rounds")}
          className="h-9 rounded-full bg-bg-sunken px-3 text-xs font-medium text-muted hover:text-fg"
        >
          Open rounds
        </button>
      </div>
    </div>
  );
}

function CiteCard({
  cite,
  selected,
  onAdd,
}: {
  cite: Cite;
  selected: string[];
  onAdd: (id: string) => void;
}) {
  return (
    <li className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-xs text-accent">PMID {cite.pmid}</span>
        <span className="font-mono text-[11px] text-muted">
          {cite.year} · {cite.journal}
        </span>
      </div>
      <h3 className="mt-2 font-serif text-lg leading-snug tracking-tight text-fg">{cite.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{cite.why}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {cite.drugIds.map((id) => {
          const name = DRUG_BY_ID[id]?.name ?? id;
          const on = selected.includes(id);
          return (
            <button
              key={id}
              type="button"
              disabled={on || !DRUG_BY_ID[id]}
              onClick={() => onAdd(id)}
              aria-label={on ? `${name}, already on the desk` : `Add ${name} to the desk`}
              className={cn(
                "h-9 rounded-full px-3 text-xs font-medium",
                on ? "bg-accent-soft text-accent" : "bg-bg-sunken text-muted hover:text-fg",
              )}
            >
              {name}
            </button>
          );
        })}
        {cite.tags.map((t) => (
          <span key={t} className="h-9 rounded-full bg-bg px-3 text-xs leading-9 text-subtle">
            {TAG_PLAIN[t]}
          </span>
        ))}
      </div>
      <a
        href={pubmedUrl(cite.pmid)}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex h-10 items-center gap-1.5 text-sm text-accent underline-offset-2 hover:underline"
      >
        Open PubMed
        <ExternalLink className="size-3.5" />
      </a>
    </li>
  );
}
