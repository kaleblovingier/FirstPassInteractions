import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FOR_PROGRAMS_CTA,
  FOR_PROGRAMS_EMAIL,
  FOR_PROGRAMS_MAILTO,
  FOR_PROGRAMS_PATH,
  FOR_PROGRAMS_USERS,
} from "@/lib/seo/for-programs";
import { audienceLinkHref, audiencePath, PROGRAM_AUDIENCES } from "@/lib/seo/for-programs-audiences";
import type { AudiencePageData } from "@/lib/seo/for-programs-audience-pages";
import { TierCard } from "./for-programs-page";
import { PairDisclaimer } from "./pair-page";

const KICKER = "font-mono text-[11px] uppercase tracking-[0.2em] text-muted";
const H2 = "font-serif text-2xl tracking-tight text-fg";
const CARD = "rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]";
const LINK = "font-medium text-accent underline";
const INQUIRY_HREF = `${FOR_PROGRAMS_PATH}#inquiry`;

/** /for-programs/<audience>: one kind of program, its teaching uses, example pairs and the tier that usually fits. */
export function ForProgramsAudienceView({ data }: { data: AudiencePageData }) {
  const { audience: a, tier, pairs } = data;
  const others = PROGRAM_AUDIENCES.filter((o) => o.slug !== a.slug);
  return (
    <main className="mx-auto max-w-5xl px-4 py-10" data-testid={`audience-${a.slug}`}>
      <nav aria-label="Breadcrumb" className="text-xs text-muted">
        <a href={FOR_PROGRAMS_PATH} className="underline">For programs</a>
        {" / "}
        <span aria-current="page">{a.name}</span>
      </nav>

      <header className="mt-4 max-w-2xl">
        <p className={KICKER}>Group and site licenses</p>
        <h1 className="mt-2 font-serif text-3xl tracking-tight text-fg sm:text-4xl">{a.h1}</h1>
        <p className="mt-3 text-sm leading-relaxed">{a.intro}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted" data-testid="intended-users">{FOR_PROGRAMS_USERS}</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <a href={INQUIRY_HREF} data-testid="audience-cta" className={cn(buttonVariants(), "min-h-[44px]")}>
            Ask for a quote
          </a>
          <a href="#pairs" className={cn(buttonVariants({ variant: "secondary" }), "min-h-[44px]")}>
            Example pairs
          </a>
        </div>
      </header>

      <section className="mt-12 max-w-2xl" aria-labelledby="uses-h">
        <h2 id="uses-h" className={H2}>How {a.name.toLowerCase()} can teach with it</h2>
        <ul className="mt-4 grid gap-4">
          {a.uses.map((u) => (
            <li key={u.name} className={CARD} data-testid="audience-use">
              <h3 className="text-sm font-semibold text-fg">{u.name}</h3>
              <p className="mt-1 text-sm leading-relaxed">{u.text}</p>
              {u.link ? (
                <p className="mt-2 text-sm">
                  <a href={audienceLinkHref(u.link)} className={LINK}>{u.link.label}</a>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section id="pairs" className="mt-12 max-w-2xl scroll-mt-6" aria-labelledby="pairs-h">
        <h2 id="pairs-h" className={H2}>Example pairs to teach from</h2>
        <p className="mt-2 text-sm text-muted">
          Each page shows the desk&apos;s grade, the label quote with its section and a DailyMed link.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          {pairs.map((p) => (
            <li key={p.slug} data-testid="audience-pair">
              <a href={`/pair/${p.slug}`} className={LINK}>
                {p.nameA} + {p.nameB}
              </a>{" "}
              <span className="text-muted">
                {p.severityLabel}
                {p.quoted ? ", label quote" : ""}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm">
          <a href="/pairs" className={LINK}>All pairs</a>
        </p>
      </section>

      <section id="tiers" className="mt-12 scroll-mt-6" aria-labelledby="tier-h">
        <h2 id="tier-h" className={H2}>The license that usually fits</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted" data-testid="tier-note">{a.tierNote}</p>
        <ul className="mt-5 grid max-w-sm gap-4">
          <TierCard tier={tier} askHref={INQUIRY_HREF} />
        </ul>
        <p className="mt-4 text-sm">
          <a href={`${FOR_PROGRAMS_PATH}#tiers`} className={LINK}>Compare every license</a>
          <span className="text-muted"> or </span>
          <a href={`${FOR_PROGRAMS_PATH}#estimate`} className={LINK}>estimate yours</a>
          <span className="text-muted">.</span>
        </p>
      </section>

      <section id="inquiry" className="mt-12 max-w-2xl scroll-mt-6" aria-labelledby="inquiry-h">
        <h2 id="inquiry-h" className={H2}>Ask for a quote</h2>
        <p className="mt-2 text-sm">
          Tell us your program, about how many people would use it, and when you&apos;d like to start. We answer every inquiry by email.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <a href={INQUIRY_HREF} className={cn(buttonVariants(), "min-h-[44px]")}>
            Open the inquiry form
          </a>
        </div>
        <p className="mt-4 text-sm">
          Rather write yourself?{" "}
          <a data-testid="audience-mailto" href={FOR_PROGRAMS_MAILTO} className={LINK}>
            {FOR_PROGRAMS_CTA}
          </a>{" "}
          <span className="text-muted">at {FOR_PROGRAMS_EMAIL}.</span>
        </p>
      </section>

      <section className="mt-12 max-w-2xl" aria-labelledby="others-h">
        <h2 id="others-h" className={H2}>Other programs</h2>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {others.map((o) => (
            <li key={o.slug}>
              <a href={audiencePath(o.slug)} className={LINK}>{o.name}</a>
            </li>
          ))}
          <li>
            <a href={FOR_PROGRAMS_PATH} className={LINK}>All programs</a>
          </li>
        </ul>
      </section>

      <PairDisclaimer />
    </main>
  );
}
