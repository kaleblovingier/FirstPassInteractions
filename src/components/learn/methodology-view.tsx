import { PairDisclaimer } from "@/components/seo/pair-page";
import {
  EDUCATIONAL_SCOPE_POINTS,
  EVIDENCE_HIERARCHY,
  EVIDENCE_INTRO,
  FDA_POTENCY_TIERS,
  FDA_TIERS_CITATIONS,
  FDA_TIERS_FOOTNOTE,
  FDA_TIERS_INTRO,
  FIRST_PASS_CITATIONS,
  FIRST_PASS_EQUATION,
  FIRST_PASS_INTERPLAY,
  FIRST_PASS_OVERVIEW,
  FIRST_PASS_ROUTES,
  KINETICS_CALLOUTS,
  KINETICS_CITATIONS,
  KINETICS_INTRO,
  KINETICS_TIMELINES,
  METHODOLOGY_DESK_EXAMPLES,
  METHODOLOGY_H1,
  METHODOLOGY_INTRO,
  METHODOLOGY_SECTIONS,
  MULTI_DRUG_STACKING,
  PRODRUG_CITATIONS,
  PRODRUG_INTRO,
  PRODRUG_TRAPS,
  SCOPE_BANNER_NOTICE,
  TRANSPORTER_PATHWAYS,
  TRANSPORTERS_CITATIONS,
  TRANSPORTERS_INTRO,
  type MethodologyCitation,
  type MethodologySectionMeta,
} from "@/lib/learn/methodology";

const TONE_BADGE = {
  danger: "bg-danger-soft text-danger border-border",
  warn: "bg-warn-soft text-warn border-border",
  info: "bg-info-soft text-info border-border",
  accent: "bg-accent-soft text-accent border-border",
} as const;

function SectionHeading({ meta }: { meta: MethodologySectionMeta }) {
  return (
    <header className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] font-medium tabular-nums text-subtle">
          {meta.number}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
          {meta.shortTitle}
        </span>
      </div>
      <h2
        id={`${meta.id}-h`}
        className="font-serif text-2xl font-medium tracking-tight text-fg"
      >
        {meta.title}
      </h2>
      <p className="text-sm leading-relaxed text-muted">{meta.subtitle}</p>
    </header>
  );
}

function CitationList({ citations }: { citations: readonly MethodologyCitation[] }) {
  return (
    <div className="mt-5 border-t border-border pt-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
        Primary references
      </p>
      <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted">
        {citations.map((c) => (
          <li key={c.url}>
            <a
              href={c.url}
              rel="noopener noreferrer"
              target="_blank"
              className="underline decoration-border-strong underline-offset-2 hover:text-fg"
            >
              {c.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MethodologyView() {
  const [secFirstPass, secFda, secKinetics, secProdrugs, secTransporters, secEvidence] =
    METHODOLOGY_SECTIONS;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6" data-testid="methodology">
      <a href="#methodology-content" className="skip-link">
        Skip to methodology reference
      </a>

      <nav
        aria-label="Primary pages"
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted"
      >
        <a href="/" className="underline underline-offset-2 hover:text-fg">
          Desk
        </a>
        <span aria-hidden="true">·</span>
        <a href="/pairs" className="underline underline-offset-2 hover:text-fg">
          Pairs
        </a>
        <span aria-hidden="true">·</span>
        <a href="/enzymes" className="underline underline-offset-2 hover:text-fg">
          Enzymes
        </a>
        <span aria-hidden="true">·</span>
        <a href="/glossary" className="underline underline-offset-2 hover:text-fg">
          Glossary
        </a>
        <span aria-hidden="true">·</span>
        <a href="/sources" className="underline underline-offset-2 hover:text-fg">
          Sources
        </a>
        <span aria-hidden="true">·</span>
        <a href="/practice" className="underline underline-offset-2 hover:text-fg">
          Practice
        </a>
      </nav>

      <header className="mt-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
          Reference monograph · Pharmacokinetics &amp; DDI methodology
        </p>
        <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight text-fg sm:text-4xl">
          {METHODOLOGY_H1}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
          {METHODOLOGY_INTRO}
        </p>
        <p
          className="mt-4 rounded-lg border border-border bg-surface p-3.5 text-xs leading-relaxed text-muted"
          data-testid="methodology-scope-banner"
        >
          {SCOPE_BANNER_NOTICE}
        </p>
      </header>

      <nav
        aria-label="Methodology sections"
        className="mt-6 rounded-xl border border-border bg-surface p-4 sm:p-5"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-subtle">
          Contents
        </p>
        <ol className="mt-3 grid gap-2 sm:grid-cols-2">
          {METHODOLOGY_SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="flex min-h-11 items-baseline gap-2.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg transition-colors hover:border-accent"
              >
                <span className="font-mono text-xs tabular-nums text-subtle">
                  {s.number}
                </span>
                <span className="font-medium leading-snug">{s.title}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div id="methodology-content" className="mt-10 space-y-12">
        {/* 01: First-Pass Hepatic & Intestinal Extraction */}
        <section
          id={secFirstPass.id}
          aria-labelledby={`${secFirstPass.id}-h`}
          className="scroll-mt-8 border-t border-border pt-8"
          data-testid={`methodology-section-${secFirstPass.id}`}
        >
          <SectionHeading meta={secFirstPass} />
          <p className="mt-4 text-sm leading-relaxed text-fg">{FIRST_PASS_OVERVIEW}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">{FIRST_PASS_INTERPLAY}</p>

          <div className="mt-5 rounded-lg border border-border bg-surface-2 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">
              Presystemic extraction model
            </p>
            <p className="mt-2 overflow-x-auto font-mono text-sm font-medium tabular-nums text-fg">
              {FIRST_PASS_EQUATION.formula}
            </p>
            <dl className="mt-3 grid gap-2 border-t border-border pt-3 text-xs sm:grid-cols-2">
              {FIRST_PASS_EQUATION.terms.map((item) => (
                <div key={item.symbol} className="flex gap-2">
                  <dt className="shrink-0 font-mono font-semibold text-accent">
                    {item.symbol}
                  </dt>
                  <dd className="text-muted">{item.meaning}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div
            role="region"
            aria-label="Presystemic route contrast table"
            tabIndex={0}
            className="relative mt-5 overflow-x-auto rounded-lg border border-border bg-surface-2"
          >
            <table className="w-full min-w-[36rem] border-collapse text-left text-xs">
              <thead className="border-b border-border bg-surface font-mono text-[11px] uppercase tracking-[0.1em] text-subtle">
                <tr>
                  <th scope="col" className="px-3.5 py-2.5 font-medium">
                    Route contrast
                  </th>
                  <th scope="col" className="px-3.5 py-2.5 font-medium">
                    Primary pathway
                  </th>
                  <th scope="col" className="px-3.5 py-2.5 font-medium">
                    Mechanistic amplitude shift
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-fg">
                {FIRST_PASS_ROUTES.map((row) => (
                  <tr key={row.agent} className="align-top">
                    <td className="px-3.5 py-3">
                      <p className="font-medium text-fg">{row.agent}</p>
                      <p className="mt-0.5 text-muted">{row.routeContrast}</p>
                    </td>
                    <td className="px-3.5 py-3 font-mono text-[11px] text-accent">
                      {row.enzymes}
                    </td>
                    <td className="px-3.5 py-3 leading-relaxed text-muted">
                      {row.mechanism}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <CitationList citations={FIRST_PASS_CITATIONS} />
        </section>

        {/* 02: FDA Clinical DDI Potency & Sensitivity Classification */}
        <section
          id={secFda.id}
          aria-labelledby={`${secFda.id}-h`}
          className="scroll-mt-8 border-t border-border pt-8"
          data-testid={`methodology-section-${secFda.id}`}
        >
          <SectionHeading meta={secFda} />
          <p className="mt-4 text-sm leading-relaxed text-fg">{FDA_TIERS_INTRO}</p>

          <div
            role="region"
            aria-label="FDA DDI potency and substrate sensitivity table"
            tabIndex={0}
            className="relative mt-5 overflow-x-auto rounded-lg border border-border bg-surface-2"
          >
            <table className="w-full min-w-[40rem] border-collapse text-left text-xs">
              <thead className="border-b border-border bg-surface font-mono text-[11px] uppercase tracking-[0.1em] text-subtle">
                <tr>
                  <th scope="col" className="px-3.5 py-2.5 font-medium">
                    FDA classification
                  </th>
                  <th scope="col" className="px-3.5 py-2.5 font-medium">
                    AUC threshold
                  </th>
                  <th scope="col" className="px-3.5 py-2.5 font-medium">
                    Clearance / pathway meaning
                  </th>
                  <th scope="col" className="px-3.5 py-2.5 font-medium">
                    Clinical prototypes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {FDA_POTENCY_TIERS.map((row) => (
                  <tr key={row.tier} className="align-top">
                    <td className="px-3.5 py-3">
                      <span
                        className={`inline-flex items-center rounded border px-2 py-0.5 font-medium ${TONE_BADGE[row.tone]}`}
                      >
                        {row.tier}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 font-mono tabular-nums font-medium text-fg">
                      {row.threshold}
                    </td>
                    <td className="px-3.5 py-3 leading-relaxed text-muted">
                      {row.clearanceEffect}
                    </td>
                    <td className="px-3.5 py-3 leading-relaxed text-fg">
                      {row.prototypes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 rounded-lg border border-border bg-surface p-3.5 text-xs leading-relaxed text-muted">
            {FDA_TIERS_FOOTNOTE}
          </p>

          <CitationList citations={FDA_TIERS_CITATIONS} />
        </section>

        {/* 03: Inhibition vs. TDI vs. Induction Timelines */}
        <section
          id={secKinetics.id}
          aria-labelledby={`${secKinetics.id}-h`}
          className="scroll-mt-8 border-t border-border pt-8"
          data-testid={`methodology-section-${secKinetics.id}`}
        >
          <SectionHeading meta={secKinetics} />
          <p className="mt-4 text-sm leading-relaxed text-fg">{KINETICS_INTRO}</p>

          <div
            role="region"
            aria-label="CYP450 inhibition, TDI, and induction kinetic timelines"
            tabIndex={0}
            className="relative mt-5 overflow-x-auto rounded-lg border border-border bg-surface-2"
          >
            <table className="w-full min-w-[44rem] border-collapse text-left text-xs">
              <thead className="border-b border-border bg-surface font-mono text-[11px] uppercase tracking-[0.1em] text-subtle">
                <tr>
                  <th scope="col" className="px-3.5 py-2.5 font-medium">
                    Mechanism
                  </th>
                  <th scope="col" className="px-3.5 py-2.5 font-medium">
                    Onset
                  </th>
                  <th scope="col" className="px-3.5 py-2.5 font-medium">
                    Peak Effect
                  </th>
                  <th scope="col" className="px-3.5 py-2.5 font-medium">
                    Offset / Washout
                  </th>
                  <th scope="col" className="px-3.5 py-2.5 font-medium">
                    Clinical Prototype
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {KINETICS_TIMELINES.map((row) => (
                  <tr key={row.mechanism} className="align-top">
                    <td className="px-3.5 py-3">
                      <p className="font-medium text-fg">{row.mechanism}</p>
                      <span
                        className={`mt-1 inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] ${TONE_BADGE[row.tone]}`}
                      >
                        {row.shortTag}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 font-mono text-[11px] tabular-nums leading-relaxed text-fg">
                      {row.onset}
                    </td>
                    <td className="px-3.5 py-3 font-mono text-[11px] tabular-nums leading-relaxed text-fg">
                      {row.peakEffect}
                    </td>
                    <td className="px-3.5 py-3 font-mono text-[11px] tabular-nums leading-relaxed text-muted">
                      {row.offsetWashout}
                    </td>
                    <td className="px-3.5 py-3 leading-relaxed text-fg">
                      {row.clinicalPrototype}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {KINETICS_CALLOUTS.map((c) => (
              <div
                key={c.title}
                className="rounded-lg border border-border bg-surface p-4"
              >
                <p className="text-xs font-semibold text-fg">{c.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{c.detail}</p>
              </div>
            ))}
          </div>

          <CitationList citations={KINETICS_CITATIONS} />
        </section>

        {/* 04: Prodrug Bioactivation Traps */}
        <section
          id={secProdrugs.id}
          aria-labelledby={`${secProdrugs.id}-h`}
          className="scroll-mt-8 border-t border-border pt-8"
          data-testid={`methodology-section-${secProdrugs.id}`}
        >
          <SectionHeading meta={secProdrugs} />
          <p className="mt-4 text-sm leading-relaxed text-fg">{PRODRUG_INTRO}</p>

          <div className="mt-4 rounded-lg border border-border bg-warn-soft p-3.5 text-xs leading-relaxed text-warn">
            <strong>Directional inversion rule:</strong> On a clearance substrate, enzyme
            inhibition raises active exposure (toxicity). On an activation substrate
            (prodrug), enzyme inhibition lowers active metabolite generation (therapeutic
            failure / loss of efficacy).
          </div>

          <div
            role="region"
            aria-label="Prodrug bioactivation traps table"
            tabIndex={0}
            className="relative mt-5 overflow-x-auto rounded-lg border border-border bg-surface-2"
          >
            <table className="w-full min-w-[42rem] border-collapse text-left text-xs">
              <thead className="border-b border-border bg-surface font-mono text-[11px] uppercase tracking-[0.1em] text-subtle">
                <tr>
                  <th scope="col" className="px-3.5 py-2.5 font-medium">
                    Prodrug
                  </th>
                  <th scope="col" className="px-3.5 py-2.5 font-medium">
                    Bioactivation pathway
                  </th>
                  <th scope="col" className="px-3.5 py-2.5 font-medium">
                    Active metabolite
                  </th>
                  <th scope="col" className="px-3.5 py-2.5 font-medium">
                    Inhibition trap &amp; clinical outcome
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {PRODRUG_TRAPS.map((row) => (
                  <tr key={row.prodrug} className="align-top">
                    <td className="px-3.5 py-3 font-medium text-fg">
                      <p>{row.prodrug}</p>
                      {row.deskHref ? (
                        <a
                          href={row.deskHref}
                          className="mt-1 inline-block font-mono text-[11px] text-accent underline underline-offset-2"
                        >
                          Open on desk <span aria-hidden="true">→</span>
                        </a>
                      ) : null}
                    </td>
                    <td className="px-3.5 py-3 font-mono text-[11px] text-accent">
                      {row.pathway}
                    </td>
                    <td className="px-3.5 py-3 font-medium text-fg">
                      {row.activeMetabolite}
                    </td>
                    <td className="px-3.5 py-3 leading-relaxed text-muted">
                      <span className="font-medium text-fg">{row.perpetratorTrap}:</span>{" "}
                      {row.clinicalOutcome}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <CitationList citations={PRODRUG_CITATIONS} />
        </section>

        {/* 05: Transporters & Multi-Drug Stacking */}
        <section
          id={secTransporters.id}
          aria-labelledby={`${secTransporters.id}-h`}
          className="scroll-mt-8 border-t border-border pt-8"
          data-testid={`methodology-section-${secTransporters.id}`}
        >
          <SectionHeading meta={secTransporters} />
          <p className="mt-4 text-sm leading-relaxed text-fg">{TRANSPORTERS_INTRO}</p>

          <div
            role="region"
            aria-label="Drug transporter pathways table"
            tabIndex={0}
            className="relative mt-5 overflow-x-auto rounded-lg border border-border bg-surface-2"
          >
            <table className="w-full min-w-[42rem] border-collapse text-left text-xs">
              <thead className="border-b border-border bg-surface font-mono text-[11px] uppercase tracking-[0.1em] text-subtle">
                <tr>
                  <th scope="col" className="px-3.5 py-2.5 font-medium">
                    Transporter &amp; gene
                  </th>
                  <th scope="col" className="px-3.5 py-2.5 font-medium">
                    Vector &amp; barriers
                  </th>
                  <th scope="col" className="px-3.5 py-2.5 font-medium">
                    Key substrates
                  </th>
                  <th scope="col" className="px-3.5 py-2.5 font-medium">
                    Clinical consequence
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {TRANSPORTER_PATHWAYS.map((row) => (
                  <tr key={row.gene} className="align-top">
                    <td className="px-3.5 py-3">
                      <p className="font-medium text-fg">{row.system}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-accent">
                        {row.gene}
                      </p>
                    </td>
                    <td className="px-3.5 py-3 text-muted">
                      <p className="font-medium text-fg">{row.direction}</p>
                      <p className="mt-0.5 leading-relaxed">{row.sites}</p>
                    </td>
                    <td className="px-3.5 py-3 leading-relaxed text-fg">
                      {row.keySubstrates}
                    </td>
                    <td className="px-3.5 py-3 leading-relaxed text-muted">
                      {row.clinicalConsequence}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-6 font-serif text-lg font-medium text-fg">
            Why 3+ drug regimens compound beyond isolated pairs
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {MULTI_DRUG_STACKING.map((card) => (
              <article
                key={card.title}
                className="flex flex-col justify-between rounded-lg border border-border bg-surface-2 p-4"
              >
                <div>
                  <span className="inline-flex items-center rounded border border-border bg-info-soft px-1.5 py-0.5 font-mono text-[10px] font-medium text-info">
                    {card.badge}
                  </span>
                  <h4 className="mt-2 text-sm font-semibold text-fg">{card.title}</h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">
                    {card.detail}
                  </p>
                </div>
                {card.deskHref && card.deskLabel ? (
                  <p className="mt-3 pt-2 border-t border-border">
                    <a
                      href={card.deskHref}
                      className="text-xs font-medium text-accent underline underline-offset-2"
                    >
                      {card.deskLabel} <span aria-hidden="true">→</span>
                    </a>
                  </p>
                ) : null}
              </article>
            ))}
          </div>

          <CitationList citations={TRANSPORTERS_CITATIONS} />
        </section>

        {/* 06: Evidence Hierarchy & Educational Reference Scope */}
        <section
          id={secEvidence.id}
          aria-labelledby={`${secEvidence.id}-h`}
          className="scroll-mt-8 border-t border-border pt-8"
          data-testid={`methodology-section-${secEvidence.id}`}
        >
          <SectionHeading meta={secEvidence} />
          <p className="mt-4 text-sm leading-relaxed text-fg">{EVIDENCE_INTRO}</p>

          <div
            role="region"
            aria-label="Evidence hierarchy table"
            tabIndex={0}
            className="relative mt-5 overflow-x-auto rounded-lg border border-border bg-surface-2"
          >
            <table className="w-full min-w-[38rem] border-collapse text-left text-xs">
              <thead className="border-b border-border bg-surface font-mono text-[11px] uppercase tracking-[0.1em] text-subtle">
                <tr>
                  <th scope="col" className="px-3.5 py-2.5 font-medium">
                    Rank
                  </th>
                  <th scope="col" className="px-3.5 py-2.5 font-medium">
                    Source class
                  </th>
                  <th scope="col" className="px-3.5 py-2.5 font-medium">
                    How FirstPass surfaces it
                  </th>
                  <th scope="col" className="px-3.5 py-2.5 font-medium">
                    Precedence &amp; caveat
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {EVIDENCE_HIERARCHY.map((row) => (
                  <tr key={row.tier} className="align-top">
                    <td className="px-3.5 py-3 font-mono font-semibold tabular-nums text-accent">
                      {row.tier}
                    </td>
                    <td className="px-3.5 py-3 font-medium text-fg">
                      {row.sourceClass}
                    </td>
                    <td className="px-3.5 py-3 leading-relaxed text-muted">
                      {row.roleOnDesk}
                    </td>
                    <td className="px-3.5 py-3 leading-relaxed text-muted">
                      {row.authorityNote}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            className="mt-5 rounded-xl border border-border-strong bg-surface p-5"
            data-testid="methodology-educational-scope"
          >
            <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-subtle">
              Educational reference scope &amp; boundaries
            </h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-relaxed text-fg">
              {EDUCATIONAL_SCOPE_POINTS.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted">
              Inspect every saved DailyMed excerpt and FDA interaction table row on{" "}
              <a href="/sources" className="font-medium text-accent underline underline-offset-2">
                Sources &amp; label library
              </a>
              , or review data handling on{" "}
              <a href="/trust" className="font-medium text-accent underline underline-offset-2">
                Trust &amp; privacy
              </a>
              .
            </p>
          </div>
        </section>

        {/* Interactive Desk Examples */}
        <section
          aria-labelledby="desk-examples-h"
          className="border-t border-border pt-8"
          data-testid="methodology-desk-examples"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-subtle">
            Live desk trays
          </p>
          <h2
            id="desk-examples-h"
            className="mt-1 font-serif text-2xl font-medium tracking-tight text-fg"
          >
            Explore these mechanisms on the interaction desk
          </h2>
          <p className="mt-2 text-sm text-muted">
            Each link loads the named medications into FirstPass so you can inspect the
            enzyme matrix, source provenance, and start/stop washout clocks firsthand.
          </p>

          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {METHODOLOGY_DESK_EXAMPLES.map((ex) => (
              <li key={ex.href}>
                <a
                  href={ex.href}
                  className="flex h-full flex-col justify-between rounded-lg border border-border bg-surface-2 p-4 transition-colors hover:border-accent"
                >
                  <div>
                    <span className="inline-flex items-center rounded border border-border bg-accent-soft px-2 py-0.5 font-mono text-[10px] font-medium text-accent">
                      {ex.tag}
                    </span>
                    <h3 className="mt-2 text-sm font-semibold text-fg">{ex.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      {ex.summary}
                    </p>
                  </div>
                  <p className="mt-3 text-xs font-medium text-accent">
                    Open regimen on desk <span aria-hidden="true">→</span>
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <PairDisclaimer />
    </main>
  );
}
