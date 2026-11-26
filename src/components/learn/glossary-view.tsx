import { useState } from "react";
import { PairDisclaimer } from "@/components/seo/pair-page";
import { GLOSSARY, GLOSSARY_BY_ID, GLOSSARY_H1, GLOSSARY_INTRO, filterGlossary, glossaryJsonLdText, groupByLetter } from "@/lib/learn/glossary";

const chip = "inline-flex min-h-11 items-center underline";
// In the page, not the route head: route heads ship in every page's entry bundle, and this needs every term.
const JSON_LD = glossaryJsonLdText();

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
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6" data-testid="glossary">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      <a href="#terms" className="skip-link">Skip to the terms</a>
      <nav
        aria-label="Primary pages"
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted print:hidden"
      >
        <a href="/" className="underline underline-offset-2 hover:text-fg">Desk</a>
        <span aria-hidden="true">·</span>
        <a href="/pairs" className="underline underline-offset-2 hover:text-fg">All pairs</a>
        <span aria-hidden="true">·</span>
        <a href="/enzymes" className="underline underline-offset-2 hover:text-fg">All enzymes</a>
        <span aria-hidden="true">·</span>
        <a href="/methodology" className="underline underline-offset-2 hover:text-fg">Methodology</a>
        <span aria-hidden="true">·</span>
        <a href="/practice" className="underline underline-offset-2 hover:text-fg">Practice</a>
      </nav>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
        Reference lexicon · Clinical pharmacology terminology
      </p>
      <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight text-fg sm:text-4xl">
        {GLOSSARY_H1}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">{GLOSSARY_INTRO}</p>

      <div className="mt-6 print:hidden">
        <label htmlFor="glossary-filter" className="text-sm font-medium text-fg">Filter terms</label>
        <input
          id="glossary-filter"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          aria-describedby="glossary-count"
          className="mt-1 block h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        />
        <p id="glossary-count" role="status" className="mt-2 font-mono text-xs tabular-nums text-muted" data-testid="glossary-count">
          Showing {shown.length} of {GLOSSARY.length} terms
        </p>
      </div>

      <nav aria-label="Jump to letter" className="mt-4 print:hidden">
        <ul className="flex flex-wrap gap-1">
          {groups.map((g) => (
            <li key={g.letter}>
              <a
                href={`#letter-${g.letter.toLowerCase()}`}
                className="inline-flex size-11 items-center justify-center rounded-md border border-border bg-surface font-mono text-sm font-medium text-fg hover:border-accent"
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
          <section key={g.letter} aria-labelledby={`letter-${g.letter.toLowerCase()}`} className="mt-8 border-t border-border pt-6">
            <h2 id={`letter-${g.letter.toLowerCase()}`} className="font-serif text-xl font-medium text-fg">{g.letter}</h2>
            {g.terms.map((t) => (
              <article
                key={t.id}
                aria-labelledby={t.id}
                className="mt-3 rounded-xl border border-border bg-surface p-4 text-sm wrap-break-word has-[:target]:border-accent"
                data-testid="glossary-term"
              >
                <h3 id={t.id} className="font-serif text-lg font-medium text-fg">{t.term}</h3>
                {t.aka.length ? <p className="mt-1 font-mono text-xs text-muted">Also called: {t.aka.join(", ")}</p> : null}
                <p className="mt-2 leading-relaxed text-fg">{t.definition}</p>
                <p className="mt-2 leading-relaxed text-muted"><span className="font-medium text-fg">On this desk:</span> {t.onDesk}</p>
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
