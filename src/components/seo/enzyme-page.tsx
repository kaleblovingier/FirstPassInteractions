import { FDA_DDI_TABLE } from "@/lib/drugs/cyp-protocol";
import { ITEM_KIND_LABEL } from "@/lib/drugs/types";
import type { EnzymeHub, EnzymeHubItem } from "@/lib/seo/enzyme-hubs";
import {
  ENZYME_FDA_TABLE_LINK,
  ENZYME_HOW_HEADING,
  ENZYME_HUB_CTA,
  ENZYME_HUB_LEGEND,
  ENZYMES_INDEX_H1,
  ENZYMES_INDEX_INTRO,
} from "@/lib/seo/pair-copy";
import { PairDisclaimer } from "./pair-page";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function countLine(hub: EnzymeHub): string {
  const c = hub.counts;
  const parts = [
    plural(c.inhibitors, "inhibitor", "inhibitors"),
    plural(c.inducers, "inducer", "inducers"),
    plural(c.substrates, "substrate", "substrates"),
  ];
  if (c.pairs) parts.push(plural(c.pairs, "pair page", "pair pages"));
  return parts.join(" · ");
}

function ItemLine({ item }: { item: EnzymeHubItem }) {
  return (
    <li className="break-inside-avoid py-0.5 wrap-break-word">
      {item.hub ? (
        <a href={item.href} className="underline">
          {item.name}
        </a>
      ) : (
        <a
          href={item.href}
          rel="nofollow"
          title={`Open ${item.name} in the desk`}
          className="underline decoration-dotted underline-offset-2"
        >
          {item.name}
        </a>
      )}
      {item.kind !== "drug" ? <span className="text-muted"> · {ITEM_KIND_LABEL[item.kind].toLowerCase()}</span> : null}
      {item.notes.map((n) => (
        <span key={n} className="text-muted">
          {" "}
          · {n}
        </span>
      ))}
    </li>
  );
}

export function EnzymePageView({ hub }: { hub: EnzymeHub }) {
  const cyp = hub.enzyme !== "P-gp";
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-xs text-muted">
        <a href="/enzymes" className="underline">All enzymes</a> ·{" "}
        <a href="/pairs" className="underline">All pairs</a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{hub.h1}</h1>
      <p data-testid="enzyme-about" className="mt-3 text-sm">
        {hub.about}
      </p>
      <p data-testid="enzyme-intro" className="mt-3 text-sm text-muted">
        {hub.intro}
      </p>
      <nav aria-label="On this page" className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm">
        {hub.sections.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="underline">
            {s.heading} ({s.count})
          </a>
        ))}
        {hub.counts.pairs ? (
          <a href="#pairs" className="underline">
            Pair pages ({hub.counts.pairs})
          </a>
        ) : null}
        <a href="#how" className="underline">
          How to read
        </a>
      </nav>
      <p className="mt-6">
        <a href="/" className="inline-block rounded-lg border border-border px-4 py-2 text-sm font-medium">
          {ENZYME_HUB_CTA}
        </a>
      </p>
      <section id="how" className="mt-8">
        <h2 className="text-lg font-semibold">{ENZYME_HOW_HEADING}</h2>
        <p className="mt-2 text-sm">
          <strong>Inhibition.</strong> {hub.inhibition}
        </p>
        <p className="mt-2 text-sm">
          <strong>Induction.</strong> {hub.induction}
        </p>
        {hub.activationNote ? <p className="mt-2 text-sm">{hub.activationNote}</p> : null}
        <p className="mt-2 text-sm text-muted">
          {hub.strengthNote}
          {cyp ? (
            <>
              {" "}
              <a href={FDA_DDI_TABLE} rel="noopener" className="underline">
                {ENZYME_FDA_TABLE_LINK}
              </a>
              .
            </>
          ) : null}
        </p>
        <p className="mt-2 text-xs text-muted">{ENZYME_HUB_LEGEND}</p>
      </section>
      {hub.sections.map((s) => (
        <section key={s.id} id={s.id} className="mt-8" data-testid={`enzyme-${s.id}`}>
          <h2 className="text-lg font-semibold">
            {hub.enzyme} {s.id} ({s.count})
          </h2>
          {s.none ? <p className="mt-2 text-sm text-muted">{s.none}</p> : null}
          {s.groups.map((g) => (
            <div key={g.grade} className="mt-4">
              <h3 className="text-sm font-semibold">
                {g.label} ({g.items.length})
              </h3>
              {g.note ? <p className="mt-1 text-xs text-muted">{g.note}</p> : null}
              <ul className="mt-2 columns-2 gap-x-6 text-sm sm:columns-3">
                {g.items.map((it) => (
                  <ItemLine key={it.id} item={it} />
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
      {hub.counts.pairs ? (
        <section id="pairs" className="mt-8" data-testid="enzyme-pairs">
          <h2 className="text-lg font-semibold">
            {hub.pairsHeading} ({hub.counts.pairs})
          </h2>
          <p className="mt-2 text-sm text-muted">{hub.pairsIntro}</p>
          {hub.pairGroups.map((g) => (
            <div key={g.severity} className="mt-4">
              <h3 className="text-sm font-semibold">
                {g.label} ({g.pairs.length})
              </h3>
              <ul className="mt-2 gap-x-6 text-sm sm:columns-2">
                {g.pairs.map((p) => (
                  <li key={p.slug} className="break-inside-avoid py-0.5 wrap-break-word">
                    <a href={`/pair/${p.slug}`} className="underline">
                      {p.nameA} and {p.nameB}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}
      <PairDisclaimer />
    </main>
  );
}

export function EnzymesIndexView({ hubs }: { hubs: EnzymeHub[] }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-xs text-muted">
        <a href="/pairs" className="underline">All pairs</a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{ENZYMES_INDEX_H1}</h1>
      <p className="mt-3 text-sm text-muted">{ENZYMES_INDEX_INTRO}</p>
      <ul className="mt-6 space-y-3 text-sm" data-testid="enzyme-index">
        {hubs.map((h) => (
          <li key={h.slug}>
            <a href={h.path} className="font-medium underline">
              {h.name}
            </a>
            <span className="block text-muted">{countLine(h)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm" data-testid="enzymes-pairs-link">
        Looking for one combination? <a href="/pairs" className="underline">Browse label-sourced drug pairs</a>.
      </p>
      <PairDisclaimer />
    </main>
  );
}
