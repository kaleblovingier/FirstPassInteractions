import type { PairPage } from "@/lib/seo/pair-pages";
import { PAIR_CTA, PAIR_DISCLAIMER, PAIRS_INDEX_INTRO } from "@/lib/seo/pair-copy";

export function PairDisclaimer() {
  return (
    <p data-testid="pair-disclaimer" className="mt-8 text-xs text-muted">
      {PAIR_DISCLAIMER}
    </p>
  );
}

export function PairPageView({ page }: { page: PairPage }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-xs text-muted">
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
      <p className="mt-6">
        <a href={page.deskUrl} className="inline-block rounded-lg border border-border px-4 py-2 text-sm font-medium">
          {PAIR_CTA}
        </a>
      </p>
      <PairDisclaimer />
    </main>
  );
}

export function PairsIndexView({ pages }: { pages: PairPage[] }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Drug pairs checked against FDA label text</h1>
      <p className="mt-3 text-sm text-muted">{PAIRS_INDEX_INTRO}</p>
      <ul className="mt-6 space-y-1 text-sm">
        {pages.map((p) => (
          <li key={p.slug}>
            <a href={`/pair/${p.slug}`} className="underline">
              {p.nameA} and {p.nameB}
            </a>{" "}
            <span className="text-muted">· {p.severityLabel}</span>
          </li>
        ))}
      </ul>
      <PairDisclaimer />
    </main>
  );
}
