import { Fragment, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { PairPage } from "@/lib/seo/pair-pages";
import { DISCLAIMER_ACTION, DRUG_HUB_INTRO_TEMPLATE, fillDrugTemplate, PAIR_CTA, PAIR_DISCLAIMER, PAIRS_INDEX_INTRO } from "@/lib/seo/pair-copy";
import { drugHubPath, drugHubs, type DrugHub } from "@/lib/seo/drug-hubs";
import { NOT_AFFILIATED_LINE, TRADEMARK_LINE } from "@/lib/seo/legal";
import { enzymeHubs, enzymePath } from "@/lib/seo/enzyme-hubs";
import { sourceLinkText, type GradeBasis } from "@/lib/drugs/grade-provenance";
import { LabelFreshnessLine } from "@/components/label-freshness";
import { EmbedSnippetDisclosure } from "@/components/seo/pair-embed";
import { PrintButton, PrintFooter } from "@/components/seo/print-handout";
import {
  PAIR_SEVERITIES, PAIR_SEVERITY_LABEL, PAIRS_Q_MAX, clearPairsPrefilter, hasPairsFilter, matchesPairKey, pairKey,
  pairsCountText, pairsSearch, searchTokens, severityKey, type PairSeverity, type PairsSearch,
} from "@/lib/seo/pairs-filter";

/** One "Why this grade" row: heading, verbatim detail, and the source link when one is on file. */
export function GradeBasisRow({ basis, context }: { basis: GradeBasis; context?: string }) {
  return (
    <div data-testid="grade-basis" data-basis-kind={basis.kind} className="mt-2">
      <p className="text-xs font-medium">{basis.title}</p>
      <p className="mt-0.5 text-xs text-muted">{basis.detail}</p>
      {basis.href ? (
        <a href={basis.href} rel="noopener" target="_blank" className="text-xs underline">
          {sourceLinkText(basis.title, basis.href)}
          {context ? <span className="sr-only">, for {context}</span> : null}
        </a>
      ) : null}
      <LabelFreshnessLine basis={basis} />
    </div>
  );
}

/** Privacy, Terms and Cookies links, shown under the disclaimer on every public page. */
export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Legal" className={className} data-testid="legal-links" data-print-hide="">
      <a href="/privacy" className="underline">Privacy</a> · <a href="/terms" className="underline">Terms</a> ·{" "}
      <a href="/cookies" className="underline">Cookies</a>
    </nav>
  );
}

export function PairDisclaimer() {
  return (
    <>
      <p data-testid="pair-disclaimer" className="mt-8 text-xs text-muted">
        {PAIR_DISCLAIMER} {DISCLAIMER_ACTION}
      </p>
      <LegalLinks className="mt-2 text-xs text-muted" />
      <p data-testid="trademark-line" className="mt-1 text-xs text-muted">{TRADEMARK_LINE}</p>
    </>
  );
}

export function PairPageView({ page }: { page: PairPage }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10" data-print-handout="pair">
      <p className="text-xs text-muted" data-print-hide="">
        <a href="/pairs" className="underline">All pairs</a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">
        {page.nameA} and {page.nameB}
      </h1>
      <p className="mt-3 text-sm">
        Desk tier: <strong data-testid="pair-severity">{page.severityLabel}</strong>
      </p>
      <p className="mt-2 text-sm">
        Mechanism: <span data-testid="pair-mechanism">{page.mechanism}</span>
      </p>
      {page.quote ? (
        <figure className="mt-6 rounded-xl border border-border bg-bg-sunken/40 p-5">
          <blockquote data-testid="pair-quote" className="text-sm">
            “{page.quote.quote}”
          </blockquote>
          <figcaption className="mt-3 text-xs text-muted">
            {page.quote.labelDrug}, section {page.quote.labelSection}.{" "}
            <a href={page.quote.url} rel="noopener" className="underline">
              DailyMed label
            </a>
          </figcaption>
        </figure>
      ) : null}
      {page.why.length ? (
        <details open data-print-open="" data-testid="pair-why" className="mt-6 rounded-xl border border-border p-4 text-sm">
          <summary className="cursor-pointer font-medium">Why this grade</summary>
          {page.why.map((b) => (
            <GradeBasisRow key={`${b.kind}-${b.title}`} basis={b} />
          ))}
        </details>
      ) : null}
      <p className="mt-6 flex flex-wrap items-center gap-3" data-print-hide="">
        <a href={page.deskUrl} className="inline-block rounded-lg border border-border px-4 py-2 text-sm font-medium">
          {PAIR_CTA}
        </a>
        <PrintButton />
      </p>
      <p className="mt-4 text-sm" data-testid="pair-hub-links" data-print-hide="">
        All pairs for{" "}
        <a href={drugHubPath(page.drugA)} className="underline">{page.nameA}</a> ·{" "}
        <a href={drugHubPath(page.drugB)} className="underline">{page.nameB}</a>
      </p>
      {page.enzymes.length ? (
        <p className="mt-2 text-sm" data-testid="pair-enzyme-links">
          {page.enzymes.length > 1 ? "Enzymes" : "Enzyme"} behind this pair:{" "}
          {page.enzymes.map((e, i) => (
            <Fragment key={e}>
              {i ? " · " : ""}
              <a href={enzymePath(e)} className="underline">{e}</a>
            </Fragment>
          ))}
        </p>
      ) : null}
      <EmbedSnippetDisclosure page={page} />
      <PairDisclaimer />
      <PrintFooter canonical={page.canonical} />
    </main>
  );
}

/** What the /pairs index draws per pair; its loader sends only these fields. */
export type PairIndexEntry = Pick<PairPage, "slug" | "nameA" | "nameB" | "severityLabel">;

const NO_PAIRS_SEARCH: PairsSearch = {};
const FILTER_CHOICE =
  "flex min-h-11 cursor-pointer items-center gap-2 rounded-md bg-surface-2 px-3 text-sm shadow-[var(--shadow-border)] has-[:checked]:bg-accent-soft";
const subscribeNever = () => () => {};
const searchKey = (s: PairsSearch) => `${s.q ?? ""}|${s.severity ?? ""}`;

/** False for the server render and the hydration render (so they match the static HTML), true after. */
function useHydrated(): boolean {
  return useSyncExternalStore(subscribeNever, () => true, () => false);
}

interface KeyedPair extends PairIndexEntry {
  k: string;
  s: PairSeverity | undefined;
}

/**
 * The full list, every link in the HTML, with rows the filters leave out marked hidden. Data attributes
 * let the prefilter script (pairs-filter.ts) hide the same rows before the page hydrates.
 */
export function PairsResults({ pages, filters, onClear }: { pages: readonly PairIndexEntry[]; filters: PairsSearch; onClear?: () => void }) {
  const keyed = useMemo<KeyedPair[]>(() => pages.map((p) => ({ ...p, k: pairKey(p.nameA, p.nameB), s: severityKey(p.severityLabel) })), [pages]);
  const active = hasPairsFilter(filters);
  const tokens = searchTokens(filters.q);
  const shows = (p: KeyedPair) => !active || matchesPairKey(p.k, p.s, tokens, filters.severity);
  const shown = active ? keyed.filter(shows).length : keyed.length;
  return (
    <>
      <p aria-live="polite" aria-atomic="true" data-testid="pairs-count" data-pairs-prehydrate="" className="mt-4 text-sm text-muted">
        {pairsCountText(shown, keyed.length)}
      </p>
      <p data-testid="pairs-empty" hidden={!(active && shown === 0)} className="mt-2 text-sm">
        No pairs match.{" "}
        <a
          href="/pairs"
          className="inline-flex min-h-11 items-center underline"
          onClick={(e) => {
            if (!onClear) return;
            e.preventDefault();
            onClear();
          }}
        >
          Clear filters
        </a>
      </p>
      <ul data-pairs-list="" data-testid="pairs-list" className="mt-2 space-y-1 text-sm">
        {keyed.map((p) => (
          <li key={p.slug} data-k={p.k} data-s={p.s} hidden={!shows(p)}>
            <a href={`/pair/${p.slug}`} className="underline">
              {p.nameA} and {p.nameB}
            </a>{" "}
            <span className="text-muted">· {p.severityLabel}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

export function PairsIndexView({ pages, search = NO_PAIRS_SEARCH, onSearch }: {
  pages: readonly PairIndexEntry[]; search?: PairsSearch; onSearch?: (search: PairsSearch) => void;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const hydrated = useHydrated();
  // Typed text stays local so the box never lags the router; the URL gets the trimmed copy.
  const [text, setText] = useState(search.q ?? "");
  const [severity, setSeverity] = useState(search.severity);
  const [seen, setSeen] = useState(searchKey(search));
  // Searches this view sent that the router has not echoed back yet.
  const [pending, setPending] = useState<string[]>([]);
  const key = searchKey(search);
  if (key !== seen) {
    setSeen(key);
    const echo = pending.indexOf(key);
    if (echo >= 0) setPending(pending.slice(echo + 1));
    else {
      // Changed from outside this view, e.g. a link to /pairs.
      setPending([]);
      setText(search.q ?? "");
      setSeverity(search.severity);
    }
  }
  useEffect(() => {
    if (hydrated) clearPairsPrefilter();
  }, [hydrated]);

  const tiers = useMemo(() => {
    const present = new Set(pages.map((p) => severityKey(p.severityLabel)));
    const picked = hydrated ? severity : undefined;
    return PAIR_SEVERITIES.filter((s) => present.has(s) || s === picked);
  }, [pages, severity, hydrated]);
  const update = (q: string, s: PairSeverity | undefined) => {
    setText(q);
    setSeverity(s);
    if (!onSearch) return;
    const next = pairsSearch(q, s);
    const nextKey = searchKey(next);
    // Same URL as the last one sent (e.g. a trailing space): nothing to send.
    if (nextKey === (pending.at(-1) ?? key)) return;
    setPending([...pending, nextKey]);
    onSearch(next);
  };
  const filters = hydrated ? pairsSearch(text, severity) : NO_PAIRS_SEARCH;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Drug pairs checked against FDA label text</h1>
      <p className="mt-3 text-sm text-muted">{PAIRS_INDEX_INTRO}</p>
      <p data-testid="not-affiliated" className="mt-2 text-xs text-muted">{NOT_AFFILIATED_LINE}</p>
      {/* A GET form, so Enter before the scripts load still opens the filtered URL. Hidden with scripting off (styles.css). */}
      <form
        role="search"
        aria-label="Filter pairs"
        action="/pairs"
        method="get"
        data-testid="pairs-filter"
        data-pairs-js=""
        data-pairs-prehydrate=""
        className="mt-6"
        onSubmit={(e) => e.preventDefault()}
      >
        <label htmlFor={`${id}-q`} className="block text-sm font-medium">Search by drug name</label>
        <input
          ref={inputRef}
          id={`${id}-q`}
          type="search"
          name="q"
          autoComplete="off"
          spellCheck={false}
          maxLength={PAIRS_Q_MAX}
          value={hydrated ? text : ""}
          onChange={(e) => update(e.target.value, severity)}
          className="mt-1 block h-11 w-full rounded-md bg-surface-2 px-3 text-sm text-fg"
        />
        <fieldset className="mt-4">
          <legend className="text-sm font-medium">Desk tier</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {[undefined, ...tiers].map((s) => (
              <label key={s ?? "all"} htmlFor={`${id}-s-${s ?? "all"}`} className={FILTER_CHOICE}>
                <input
                  type="radio"
                  id={`${id}-s-${s ?? "all"}`}
                  name="severity"
                  value={s ?? ""}
                  checked={(hydrated ? severity : undefined) === s}
                  onChange={() => update(text, s)}
                  className="accent-accent"
                />
                {s ? PAIR_SEVERITY_LABEL[s] : "All"}
              </label>
            ))}
          </div>
        </fieldset>
      </form>
      <PairsResults
        pages={pages}
        filters={filters}
        onClear={() => {
          update("", undefined);
          inputRef.current?.focus();
        }}
      />
      <h2 className="mt-8 text-lg font-semibold">By drug</h2>
      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm" data-testid="drug-hub-index">
        {drugHubs().map((h) => (
          <li key={h.slug}>
            <a href={`/drug/${h.slug}`} className="underline">{h.name}</a>
          </li>
        ))}
      </ul>
      <h2 className="mt-8 text-lg font-semibold">By enzyme</h2>
      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm" data-testid="enzyme-hub-index">
        {enzymeHubs().map((h) => (
          <li key={h.slug}>
            <a href={h.path} className="underline">{h.enzyme}</a>
          </li>
        ))}
        <li>
          <a href="/enzymes" className="underline">All enzymes</a>
        </li>
      </ul>
      <p className="mt-8 text-sm" data-testid="for-programs-link">
        Teaching or running a program? <a href="/for-programs" className="underline">Group and site licenses</a>.
        {" "}How FirstPass handles data: <a href="/trust" className="underline">Trust, privacy and validation</a>.
        {" "}Every label quote and FDA table row: <a href="/sources" className="underline">Sources and label library</a>.
      </p>
      <PairDisclaimer />
    </main>
  );
}

export const CITED_ONLY_HUB_INTRO = "Interaction notes for this supplement, quoted from FDA-approved labeling.";

export function DrugHubView({ hub, classLink }: { hub: DrugHub; classLink?: { name: string; path: string } }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10" data-print-handout="drug">
      <p className="text-xs text-muted" data-print-hide="">
        <a href="/pairs" className="underline">All pairs</a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{hub.name} interactions on FDA labels</h1>
      {classLink ? (
        <p data-testid="drug-hub-class" className="mt-1 text-xs text-muted">
          Class: <a href={classLink.path} className="underline">{classLink.name}</a>
        </p>
      ) : null}
      {hub.marketStatus ? (
        <p data-testid="drug-hub-market-status" className="mt-3 rounded-lg border border-border px-3 py-2 text-sm">
          {hub.marketStatus}
        </p>
      ) : null}
      <p data-testid="drug-hub-intro" className="mt-3 text-sm text-muted">
        {hub.pairCount === 0 ? CITED_ONLY_HUB_INTRO : fillDrugTemplate(DRUG_HUB_INTRO_TEMPLATE, hub.name)}
      </p>
      <p className="mt-6" data-print-hide="">
        <a href={hub.deskUrl} className="inline-block rounded-lg border border-border px-4 py-2 text-sm font-medium">
          {hub.cta}
        </a>
      </p>
      {hub.labelNote ? (
        <section className="mt-8" data-testid="drug-hub-label-note">
          <h2 className="text-lg font-semibold">What the FDA label says</h2>
          <p className="mt-2 text-sm [overflow-wrap:anywhere]">{hub.labelNote}</p>
          <p className="mt-1 text-xs text-muted">Cited, not graded. No interaction grade is stored for this supplement.</p>
        </section>
      ) : null}
      {hub.groups.map((g) => (
        <section key={g.severity} className="mt-8">
          <h2 className="text-lg font-semibold">{g.label}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {g.pairs.map((p) => (
              <li key={p.pairSlug}>
                <a href={`/pair/${p.pairSlug}`} className="underline">
                  {hub.name} and {p.otherName}
                </a>
                {p.why ? (
                  <details data-print-open="" data-testid="hub-why" className="ml-1 inline-block align-top">
                    <summary className="cursor-pointer text-xs text-muted">Why this grade</summary>
                    <GradeBasisRow basis={p.why} context={`${hub.name} and ${p.otherName}`} />
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {hub.enzymes.length ? (
        <section className="mt-8" data-testid="drug-hub-enzymes">
          <h2 className="text-lg font-semibold">Enzyme roles on the desk</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {hub.enzymes.map((e) => (
              <li key={e.enzyme}>
                <a href={e.path} className="underline">{e.enzyme}</a>{" "}
                <span className="text-muted">· {e.roles.join(" · ")}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <PairDisclaimer />
      <PrintFooter canonical={hub.canonical} />
    </main>
  );
}
