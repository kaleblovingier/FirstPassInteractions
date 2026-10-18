import { Fragment } from "react";
import type { PairPage } from "@/lib/seo/pair-pages";
import { DRUG_HUB_INTRO_TEMPLATE, fillDrugTemplate, PAIR_CTA, PAIR_DISCLAIMER, PAIRS_INDEX_INTRO } from "@/lib/seo/pair-copy";
import { drugHubPath, drugHubs, type DrugHub } from "@/lib/seo/drug-hubs";
import { enzymeHubs, enzymePath } from "@/lib/seo/enzyme-hubs";

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
      <p className="mt-4 text-sm" data-testid="pair-hub-links">
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
      </p>
      <PairDisclaimer />
    </main>
  );
}

export function DrugHubView({ hub }: { hub: DrugHub }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-xs text-muted">
        <a href="/pairs" className="underline">All pairs</a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{hub.name} interactions on FDA labels</h1>
      <p data-testid="drug-hub-intro" className="mt-3 text-sm text-muted">
        {fillDrugTemplate(DRUG_HUB_INTRO_TEMPLATE, hub.name)}
      </p>
      <p className="mt-6">
        <a href={hub.deskUrl} className="inline-block rounded-lg border border-border px-4 py-2 text-sm font-medium">
          {hub.cta}
        </a>
      </p>
      {hub.groups.map((g) => (
        <section key={g.severity} className="mt-8">
          <h2 className="text-lg font-semibold">{g.label}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {g.pairs.map((p) => (
              <li key={p.pairSlug}>
                <a href={`/pair/${p.pairSlug}`} className="underline">
                  {hub.name} and {p.otherName}
                </a>
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
    </main>
  );
}
