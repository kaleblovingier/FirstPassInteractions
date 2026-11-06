import { useState } from "react";
import { PairDisclaimer } from "@/components/seo/pair-page";
import { GLOSSARY, GLOSSARY_BY_ID, GLOSSARY_H1, GLOSSARY_INTRO, filterGlossary, groupByLetter } from "@/lib/learn/glossary";

const chip = "inline-flex min-h-11 items-center underline";

export function GlossaryView() {
  const [query, setQuery] = useState("");
  const shown = filterGlossary(GLOSSARY, query);
  const groups = groupByLetter(shown);
  // A related term the filter is hiding: clear the filter, then scroll once it renders.
  const reveal = (id: string) => {
    if (!query) return;
    setQuery("");
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-10" data-testid="glossary">
      <a href="#terms" className="skip-link">Skip to the terms</a>
      <p className="text-xs text-muted">
        <a href="/pairs" className="underline">All pairs</a> · <a href="/enzymes" className="underline">All enzymes</a> ·{" "}
        <a href="/practice" className="underline">Practice</a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{GLOSSARY_H1}</h1>
      <p className="mt-3 text-sm text-muted">{GLOSSARY_INTRO}</p>

      <div className="mt-6">
        <label htmlFor="glossary-filter" className="text-sm font-medium">Filter terms</label>
        <input
          id="glossary-filter"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          aria-describedby="glossary-count"
          className="mt-1 block h-11 w-full rounded-lg bg-surface px-3 text-sm"
        />
        <p id="glossary-count" role="status" className="mt-2 text-xs text-muted" data-testid="glossary-count">
          Showing {shown.length} of {GLOSSARY.length} terms
        </p>
      </div>

      <nav aria-label="Jump to letter" className="mt-4">
        <ul className="flex flex-wrap gap-1">
          {groups.map((g) => (
            <li key={g.letter}>
              <a
                href={`#letter-${g.letter.toLowerCase()}`}
                className="inline-flex size-11 items-center justify-center rounded-md border border-border text-sm font-medium"
              >
                {g.letter}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div id="terms">
        {groups.length ? null : (
          <p className="mt-8 text-sm">No term matches that filter. Clear it to see all {GLOSSARY.length}.</p>
        )}
        {groups.map((g) => (
          <section key={g.letter} aria-labelledby={`letter-${g.letter.toLowerCase()}`} className="mt-8">
            <h2 id={`letter-${g.letter.toLowerCase()}`} className="text-lg font-semibold">{g.letter}</h2>
            {g.terms.map((t) => (
              <article
                key={t.id}
                aria-labelledby={t.id}
                className="mt-3 rounded-xl border border-border p-4 text-sm wrap-break-word has-[:target]:border-accent"
                data-testid="glossary-term"
              >
                <h3 id={t.id} className="text-base font-semibold">{t.term}</h3>
                {t.aka.length ? <p className="mt-1 text-xs text-muted">Also called: {t.aka.join(", ")}</p> : null}
                <p className="mt-2">{t.definition}</p>
                <p className="mt-2"><span className="font-medium">On this desk:</span> {t.onDesk}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3">
                  <span className="text-muted">Related:</span>
                  {t.related.map((id) => (
                    <a key={id} href={`#${id}`} onClick={() => reveal(id)} className={chip}>{GLOSSARY_BY_ID[id]!.term}</a>
                  ))}
                  {(t.links ?? []).map((l) => (
                    <a key={l.href} href={l.href} className={chip}>{l.label}</a>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted">
                  Source:{" "}
                  <a href={t.source.url} rel="noopener" className="underline">{t.source.title}</a>
                </p>
              </article>
            ))}
          </section>
        ))}
      </div>
      <PairDisclaimer />
    </main>
  );
}
