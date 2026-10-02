import {
  CDS_CRITERIA,
  HAZARDS,
  INDICATIONS,
  INTENDED_USE,
  NOT_CLEARED,
  NOT_FOR,
  PI_FOOTER,
  PRIMARY_SOURCES,
  SOFTWARE,
  WARNINGS,
} from "@/lib/regulatory";
import { OPERATOR } from "@/lib/billing/commerce";
import { Badge } from "@/components/ui/badge";
import { Plate } from "./plate";

/** Jump targets — ids stay stable for the sticky TOC. */
const TOC = [
  { id: "label-intended", label: "What it is" },
  { id: "label-indications", label: "What it's for" },
  { id: "label-not-for", label: "What it's not" },
  { id: "label-warnings", label: "Read these first" },
  { id: "label-cds", label: "Non-device CDS" },
  { id: "label-hazards", label: "Residual risk" },
  { id: "label-sources", label: "Primary sources" },
  { id: "label-maker", label: "Maker / complaints" },
] as const;

/** Short plain-language framing — legal facts stay in the body below. */
const LEAD_BULLETS = [
  {
    title: "Not FDA-cleared",
    body: "Not cleared and not approved. Showing FDA-label text does not make FirstPass a cleared device.",
  },
  {
    title: "Educational desk",
    body: "Built for licensed clinicians and trainees to review mapped collisions — not a prescription writer or patient self-dosing app.",
  },
  {
    title: "Empty ≠ safe",
    body: "No mapped finding is not proof of safety. Transporters, UGTs, unlisted metabolites, and unpublished pairs still apply.",
  },
] as const;

export function LabelPage() {
  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
        <div className="grid sm:grid-cols-[220px_minmax(0,1fr)]">
          <Plate src="/plates/liver.jpg" alt="" className="h-36 w-full min-h-36 sm:h-full" />
          <div className="px-5 py-5 sm:px-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
              Safety / Label
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-serif text-3xl tracking-tight text-fg">{SOFTWARE.name}</h1>
              <Badge tone="warn">Not FDA-cleared</Badge>
            </div>
            <p className="mt-1 font-mono text-xs text-muted">
              {SOFTWARE.udi} · v{SOFTWARE.version} · {SOFTWARE.released}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
              Instructions for use in plain language. The boxed strings below are the same regulatory
              facts as before — clearer headings, not softer law.
            </p>
          </div>
        </div>
      </section>

      <section
        aria-label="Read this first"
        className="rounded-xl bg-surface px-5 py-4 shadow-[var(--shadow-border)] sm:px-6"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Read this first</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {LEAD_BULLETS.map((b) => (
            <li key={b.title} className="rounded-md bg-bg-sunken px-3 py-3">
              <span className="block text-sm font-medium text-fg">{b.title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted">{b.body}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-danger">{NOT_CLEARED}</p>
      </section>

      <nav
        aria-label="On this page"
        className="sticky top-0 z-10 -mx-1 flex flex-wrap gap-1.5 bg-bg/95 px-1 py-2 backdrop-blur-sm"
      >
        {TOC.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="inline-flex h-9 items-center rounded-full bg-bg-sunken px-3 text-xs font-medium text-muted hover:text-fg"
          >
            {item.label}
          </a>
        ))}
      </nav>

      <section
        id="label-intended"
        className="scroll-mt-14 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-8"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Intended use</p>
        <h2 className="mt-1 font-serif text-xl tracking-tight text-fg">What this desk is</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-fg">{INTENDED_USE}</p>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article
          id="label-indications"
          className="scroll-mt-14 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Indications</p>
          <h2 className="mt-1 font-serif text-lg tracking-tight text-fg">What it's for</h2>
          <p className="mt-1 text-xs text-muted">
            Mapped display for independent review — not a diagnosis or a milligram.
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-fg">
            {INDICATIONS.map((row) => (
              <li key={row}>{row}</li>
            ))}
          </ol>
        </article>
        <article
          id="label-not-for"
          className="scroll-mt-14 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Contraindications of use</p>
          <h2 className="mt-1 font-serif text-lg tracking-tight text-fg">What it's not for</h2>
          <p className="mt-1 text-xs text-muted">
            Out of scope — do not use FirstPass for these.
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-fg">
            {NOT_FOR.map((row) => (
              <li key={row} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-danger" aria-hidden />
                <span>{row}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section
        id="label-warnings"
        className="scroll-mt-14 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Warnings</p>
        <h2 className="mt-1 font-serif text-lg tracking-tight text-fg">Read these first</h2>
        <p className="mt-1 text-xs text-muted">
          Same warnings as the IFU — including empty ≠ safe and label-wins.
        </p>
        <ul className="mt-3 space-y-2">
          {WARNINGS.map((w) => (
            <li key={w} className="rounded-md bg-warn-soft px-3 py-2.5 text-sm leading-relaxed text-fg">
              {w}
            </li>
          ))}
        </ul>
      </section>

      <section
        id="label-cds"
        className="scroll-mt-14 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">CDS posture</p>
        <h2 className="mt-1 font-serif text-lg tracking-tight text-fg">Non-device CDS criteria</h2>
        <p className="mt-1 text-xs text-muted">
          FDA Clinical Decision Support Software guidance, September 28, 2022. Meeting these criteria is a
          posture, not a clearance.
        </p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          {CDS_CRITERIA.map((c) => (
            <li key={c.id} className="rounded-md bg-bg-sunken px-3 py-3">
              <p className="font-mono text-[11px] uppercase tracking-wide text-accent">
                {c.id} · {c.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-fg">{c.how}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        id="label-hazards"
        className="scroll-mt-14 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Hazards</p>
        <h2 className="mt-1 font-serif text-lg tracking-tight text-fg">Residual risk</h2>
        <p className="mt-1 text-xs text-muted">
          ISO 14971-style hazards this desk actually has. Not a full file.
        </p>
        <ul className="mt-4 divide-y divide-border rounded-md bg-bg-sunken">
          {HAZARDS.map((h) => (
            <li
              key={h.id}
              className="grid gap-1 px-3 py-3 sm:grid-cols-[88px_minmax(0,1fr)_minmax(0,1.2fr)] sm:gap-4"
            >
              <span className="font-mono text-xs text-accent">{h.id}</span>
              <span className="text-sm text-fg">{h.hazard}</span>
              <span className="text-sm text-muted">{h.control}</span>
            </li>
          ))}
        </ul>
      </section>

      <section
        id="label-sources"
        className="scroll-mt-14 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Sources</p>
        <h2 className="mt-1 font-serif text-lg tracking-tight text-fg">Primary sources</h2>
        <p className="mt-1 text-xs text-muted">
          The label is the authority. These are the public endpoints this desk actually calls.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {PRIMARY_SOURCES.map((s) => (
            <li key={s.name}>
              <a
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center rounded-full bg-bg-sunken px-3 text-xs font-medium text-fg hover:text-accent"
              >
                {s.name}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section
        id="label-maker"
        className="scroll-mt-14 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Manufacturer</p>
        <h2 className="mt-1 font-serif text-lg tracking-tight text-fg">Maker / complaints</h2>
        <p className="mt-2 text-sm leading-relaxed text-fg">
          {SOFTWARE.manufacturer}. Software version {SOFTWARE.version} ({SOFTWARE.udi}). Report a labeling
          disagreement, a missed collision, or an adverse event associated with use of this desk to{" "}
          <a className="text-accent underline" href={`mailto:${OPERATOR.email}`}>
            {OPERATOR.email}
          </a>{" "}
          or {OPERATOR.phone}. That is a complaint path, not an FDA MedWatch filing — MedWatch is still{" "}
          <a
            className="text-accent underline"
            href="https://www.fda.gov/safety/medwatch-fda-safety-information-and-adverse-event-reporting-program"
            target="_blank"
            rel="noreferrer"
          >
            fda.gov/medwatch
          </a>
          .
        </p>
        <p className="mt-4 text-[11px] leading-relaxed text-subtle">{PI_FOOTER}</p>
      </section>
    </div>
  );
}
