import type { ClassHub, ClassHubMember, ClassIndexEntry } from "@/lib/seo/class-hubs";
import {
  CLASS_HUB_CTA,
  CLASS_HUB_ENZYMES_HEADING,
  CLASS_HUB_ENZYMES_INTRO,
  CLASS_HUB_ENZYMES_NONE,
  CLASS_HUB_MEMBERS_HEADING,
  CLASS_HUB_OTHERS_HEADING,
  CLASS_HUB_PAIRS_HEADING,
  CLASS_HUB_PAIRS_INTRO,
  CLASSES_INDEX_H1,
  CLASSES_INDEX_INTRO,
} from "@/lib/seo/pair-copy";
import { PairDisclaimer } from "./pair-page";
import { PrintButton, PrintFooter } from "./print-handout";
import { ClassEmbedBox } from "./hub-embed";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function MemberLine({ m }: { m: ClassHubMember }) {
  return (
    <li className="break-inside-avoid py-0.5 wrap-break-word">
      {m.hub ? (
        <a href={m.href} className="underline">
          {m.name}
        </a>
      ) : (
        <a
          href={m.href}
          rel="nofollow"
          title={`Open ${m.name} in the desk`}
          className="underline decoration-dotted underline-offset-2"
        >
          {m.name}
        </a>
      )}
    </li>
  );
}

export function ClassPageView({ hub }: { hub: ClassHub }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10" data-print-handout="class">
      <p className="text-xs text-muted" data-print-hide="">
        <a href="/classes" className="underline">All classes</a> ·{" "}
        <a href="/pairs" className="underline">All pairs</a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{hub.h1}</h1>
      <p data-testid="class-intro" className="mt-3 text-sm text-muted">
        {hub.intro}
      </p>
      <nav aria-label="On this page" data-print-hide="" className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm">
        <a href="#drugs" className="underline">
          Drugs ({hub.counts.hubs})
        </a>
        <a href="#enzymes" className="underline">
          Enzymes ({hub.enzymes.length})
        </a>
        <a href="#pairs" className="underline">
          Pair pages ({hub.counts.pairs})
        </a>
      </nav>
      <div className="mt-6" data-print-hide="">
        <p className="flex flex-wrap items-center gap-3">
          <a
            href={hub.deskUrl}
            data-testid="class-desk-link"
            className="inline-block rounded-lg border border-border px-4 py-2 text-sm font-medium"
          >
            {CLASS_HUB_CTA}
          </a>
          <PrintButton />
        </p>
        <span className="mt-1 block text-xs text-muted">{hub.deskNames.join(", ")}</span>
      </div>
      <section id="drugs" className="mt-8" data-testid="class-members">
        <h2 className="text-lg font-semibold">
          {CLASS_HUB_MEMBERS_HEADING} ({hub.counts.hubs})
        </h2>
        <ul className="mt-2 columns-2 gap-x-6 text-sm sm:columns-3">
          {hub.members.map((m) => (
            <MemberLine key={m.id} m={m} />
          ))}
        </ul>
        {hub.others.length ? (
          <div className="mt-4" data-testid="class-others">
            <h3 className="text-sm font-semibold">
              {CLASS_HUB_OTHERS_HEADING} ({hub.others.length})
            </h3>
            <ul className="mt-2 columns-2 gap-x-6 text-sm sm:columns-3">
              {hub.others.map((m) => (
                <MemberLine key={m.id} m={m} />
              ))}
            </ul>
          </div>
        ) : null}
      </section>
      <section id="enzymes" className="mt-8" data-testid="class-enzymes">
        <h2 className="text-lg font-semibold">{CLASS_HUB_ENZYMES_HEADING}</h2>
        <p className="mt-2 text-sm text-muted">{hub.enzymes.length ? CLASS_HUB_ENZYMES_INTRO : CLASS_HUB_ENZYMES_NONE}</p>
        {hub.enzymes.length ? (
          <ul className="mt-3 space-y-3 text-sm">
            {hub.enzymes.map((e) => (
              <li key={e.enzyme}>
                <a href={e.path} className="font-medium underline">
                  {e.name}
                </a>{" "}
                <span className="text-muted">· {plural(e.drugs, "drug", "drugs")}</span>
                <ul className="mt-1 space-y-0.5 pl-4">
                  {e.roles.map((r) => (
                    <li key={r.label} className="wrap-break-word">
                      {r.label}: {r.count}
                      <span className="text-muted"> ({r.names.join(", ")})</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <section id="pairs" className="mt-8" data-testid="class-pairs">
        <h2 className="text-lg font-semibold">
          {CLASS_HUB_PAIRS_HEADING} ({hub.counts.pairs})
        </h2>
        <p className="mt-2 text-sm text-muted">{CLASS_HUB_PAIRS_INTRO}</p>
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
      <ClassEmbedBox hub={hub} />
      <PairDisclaimer />
      <PrintFooter canonical={hub.canonical} />
    </main>
  );
}

export function ClassesIndexView({ classes }: { classes: ClassIndexEntry[] }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-xs text-muted">
        <a href="/pairs" className="underline">All pairs</a> ·{" "}
        <a href="/enzymes" className="underline">All enzymes</a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{CLASSES_INDEX_H1}</h1>
      <p className="mt-3 text-sm text-muted">{CLASSES_INDEX_INTRO}</p>
      <ul className="mt-6 space-y-3 text-sm" data-testid="class-index">
        {classes.map((c) => (
          <li key={c.slug}>
            <a href={c.path} className="font-medium underline">
              {c.name}
            </a>
            <span className="block text-muted">
              {plural(c.counts.drugs, "drug", "drugs")} on the desk · {plural(c.counts.hubs, "drug page", "drug pages")} ·{" "}
              {plural(c.counts.pairs, "pair page", "pair pages")}
            </span>
          </li>
        ))}
      </ul>
      <PairDisclaimer />
    </main>
  );
}
