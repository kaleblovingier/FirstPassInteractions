import type { ReactNode } from "react";
import { CLASS_EMBED_INTRO, CLASS_HUB_ENZYMES_NONE, DISCLAIMER_ACTION, DRUG_EMBED_INTRO_TEMPLATE, PAIR_DISCLAIMER, SITE_URL, fillDrugTemplate } from "@/lib/seo/pair-copy";
import { classEmbedSnippet, drugEmbedSnippet, type ClassEmbed, type DrugEmbed } from "@/lib/seo/hub-embed";
import { EMBED_CSS, EmbedCodeBox } from "./pair-embed";

/*
 * Framed drug and class cards (/embed/drug/<slug>, /embed/class/<slug>). Same
 * self-contained light/dark styles as the pair card (EMBED_CSS), no site header,
 * and every link opens outside the frame.
 */

const NEW_TAB = <span className="fpe-sr"> (opens in a new tab)</span>;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function Out({ href, children, testId }: { href: string; children: ReactNode; testId?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener" data-testid={testId}>
      {children}
      {NEW_TAB}
    </a>
  );
}

/** Open in FirstPass, the sources link and the disclaimer, as on the pair card. */
function EmbedFooter({ canonical }: { canonical: string }) {
  return (
    <>
      <p className="fpe-open">
        <Out href={canonical} testId="embed-open">
          Open in FirstPass
        </Out>
      </p>
      <p className="fpe-more">
        <Out href={`${SITE_URL}/sources`} testId="embed-sources">
          Sources and label library
        </Out>
      </p>
      <p className="fpe-disc" data-testid="embed-disclaimer">
        {PAIR_DISCLAIMER} {DISCLAIMER_ACTION}
      </p>
    </>
  );
}

/** The framed card at /embed/drug/<slug>: the drug, its class, and its first pair pages with grade labels. */
export function DrugEmbedCard({ card }: { card: DrugEmbed }) {
  const more = card.pairCount - card.pairs.length;
  return (
    <>
      <style>{EMBED_CSS}</style>
      <main className="fpe" aria-labelledby="fpe-title" data-testid="drug-embed-card">
        <p className="fpe-brand">FirstPass · drug card</p>
        <h1 id="fpe-title">{card.name}</h1>
        {card.classLink ? (
          <p className="fpe-sub" data-testid="embed-class">
            Class: <Out href={card.classLink.href}>{card.classLink.name}</Out>
          </p>
        ) : null}
        {card.note ? (
          <p className="fpe-why" data-testid="embed-note">
            {card.note}
          </p>
        ) : (
          <>
            <p className="fpe-why" data-testid="embed-intro">
              {fillDrugTemplate(DRUG_EMBED_INTRO_TEMPLATE, card.name)}
            </p>
            <h2>Pair pages ({card.pairCount})</h2>
            <ul className="fpe-list" data-testid="embed-pairs">
              {card.pairs.map((p) => (
                <li key={p.pairSlug}>
                  <Out href={p.href}>
                    <span className="fpe-sr">{card.name} and </span>
                    {p.otherName}
                  </Out>
                  <span className="fpe-tag" data-testid="embed-pair-severity">
                    {p.severityLabel}
                  </span>
                </li>
              ))}
            </ul>
            {more > 0 ? (
              <p className="fpe-more">
                <Out href={card.canonical} testId="embed-see-all">
                  See all {card.pairCount} on FirstPass
                </Out>
              </p>
            ) : null}
          </>
        )}
        <EmbedFooter canonical={card.canonical} />
      </main>
    </>
  );
}

/** The framed card at /embed/class/<slug>: member drugs, stored enzyme roles and pair-page counts. */
export function ClassEmbedCard({ card }: { card: ClassEmbed }) {
  const moreMembers = card.memberCount - card.members.length;
  const moreEnzymes = card.enzymeCount - card.enzymes.length;
  return (
    <>
      <style>{EMBED_CSS}</style>
      <main className="fpe" aria-labelledby="fpe-title" data-testid="class-embed-card">
        <p className="fpe-brand">FirstPass · drug-class card</p>
        <h1 id="fpe-title">{card.name}</h1>
        <p className="fpe-why">{CLASS_EMBED_INTRO}</p>
        <h2>Drugs ({card.memberCount})</h2>
        <p className="fpe-inline" data-testid="embed-members">
          {card.members.map((m, i) => (
            <span key={m.href}>
              {i ? ", " : null}
              <Out href={m.href}>{m.name}</Out>
            </span>
          ))}
          {moreMembers > 0 ? <span className="fpe-tag"> and {moreMembers} more</span> : null}
        </p>
        <h2>Enzyme roles ({card.enzymeCount})</h2>
        {card.enzymes.length ? (
          <ul className="fpe-list" data-testid="embed-enzymes">
            {card.enzymes.map((e) => (
              <li key={e.href}>
                <Out href={e.href}>{e.name}</Out>
                <span className="fpe-tag">
                  {plural(e.drugs, "drug", "drugs")}: {e.roles.map((r) => `${r.label} ${r.count}`).join(", ")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="fpe-inline fpe-tag" data-testid="embed-enzymes">{CLASS_HUB_ENZYMES_NONE}</p>
        )}
        {moreEnzymes > 0 ? <p className="fpe-more fpe-tag">and {moreEnzymes} more on FirstPass</p> : null}
        <h2>Pair pages ({card.pairCount})</h2>
        <p className="fpe-inline" data-testid="embed-severity-counts">
          {card.severityCounts.map((s) => `${s.label}: ${s.count}`).join(" · ")}
        </p>
        <EmbedFooter canonical={card.canonical} />
      </main>
    </>
  );
}

/** The "Embed this card" box on each /drug/<slug> page. */
export function DrugEmbedBox({ hub }: { hub: { slug: string; name: string } }) {
  return <EmbedCodeBox snippet={drugEmbedSnippet(hub)} what="this drug's pairs" label={`Embed code for ${hub.name}`} testId="drug-embed" />;
}

/** The "Embed this card" box on each /class/<slug> page. */
export function ClassEmbedBox({ hub }: { hub: { slug: string; name: string } }) {
  return <EmbedCodeBox snippet={classEmbedSnippet(hub)} what="this class" label={`Embed code for ${hub.name}`} testId="class-embed" />;
}
