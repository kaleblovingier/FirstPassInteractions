import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FOR_PROGRAMS_PATH, FOR_PROGRAMS_USERS } from "@/lib/seo/for-programs";
import { SITE_URL } from "@/lib/seo/pair-copy";
import { printedFromAddress } from "@/lib/seo/print";
import {
  COURSE_KIT_FRAMING,
  COURSE_KIT_H1,
  COURSE_KIT_HOW,
  COURSE_KIT_INTRO,
  COURSE_KIT_LMS,
  COURSE_KIT_MODULES,
  COURSE_KIT_NAME,
  COURSE_KIT_URL,
  courseKitCsv,
  courseKitMarkdown,
  courseKitMinutes,
  formatMinutes,
  glossaryHref,
  KIT_TYPE_LABEL,
  kitTargetHref,
  moduleMinutes,
  practiceHref,
} from "@/lib/seo/course-kit";
import { PairDisclaimer } from "./pair-page";
import { PrintButton, PrintFooter } from "./print-handout";

const KICKER = "font-mono text-[11px] uppercase tracking-[0.2em] text-muted";
const H2 = "font-serif text-2xl tracking-tight text-fg";
const CARD = "rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]";
const LINK = "font-medium text-accent underline";

/** On paper, an activity link is followed by where it lives (the print rule reads data-print-url). */
const onPaper = (href: string) => printedFromAddress(`${SITE_URL}${href}`);

/** Hands the browser a text file. Built from the plan on the page; nothing is fetched. */
function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** /for-programs/course-kit: eight weekly modules built from packs, lab-book assignments, cases, workups and practice that already exist. */
export function CourseKitView() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10" data-testid="course-kit" data-print-handout="course-kit">
      <nav aria-label="Breadcrumb" className="text-xs text-muted" data-print-hide="">
        <a href={FOR_PROGRAMS_PATH} className="underline">For programs</a>
        {" / "}
        <span aria-current="page">{COURSE_KIT_NAME}</span>
      </nav>

      <header className="mt-4 max-w-2xl">
        <p className={KICKER}>For faculty</p>
        <h1 className="mt-2 font-serif text-3xl tracking-tight text-fg sm:text-4xl">{COURSE_KIT_H1}</h1>
        <p className="mt-3 text-sm leading-relaxed">{COURSE_KIT_INTRO}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted" data-testid="intended-users">{FOR_PROGRAMS_USERS}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted" data-testid="course-kit-framing">{COURSE_KIT_FRAMING}</p>
        <p className="mt-3 text-sm text-muted">
          {COURSE_KIT_MODULES.length} weeks, about {formatMinutes(courseKitMinutes())} of activities in all.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap" data-testid="course-kit-export" data-print-hide="">
          <button
            type="button"
            className={cn(buttonVariants(), "min-h-[44px]")}
            onClick={() => download("firstpass-course-kit.md", courseKitMarkdown(), "text/markdown;charset=utf-8")}
          >
            Export plan (Markdown)
          </button>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "secondary" }), "min-h-[44px]")}
            onClick={() => download("firstpass-course-kit.csv", courseKitCsv(), "text/csv;charset=utf-8")}
          >
            Export plan (CSV)
          </button>
          <PrintButton />
        </div>
      </header>

      <section className="mt-12 max-w-2xl" aria-labelledby="how-h">
        <h2 id="how-h" className={H2}>How to use the kit</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed">
          {COURSE_KIT_HOW.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <nav aria-label="Weeks" className="mt-4" data-print-hide="">
          <ol className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {COURSE_KIT_MODULES.map((m) => (
              <li key={m.id}>
                <a href={`#${m.id}`} className={LINK}>Week {m.week}</a>
              </li>
            ))}
          </ol>
        </nav>
      </section>

      <ol className="mt-10 grid max-w-3xl gap-6">
        {COURSE_KIT_MODULES.map((m) => (
          <li key={m.id} id={m.id} className={cn(CARD, "scroll-mt-6")} data-testid="course-kit-module">
            <p className={KICKER}>
              Week {m.week} · about {formatMinutes(moduleMinutes(m))}
            </p>
            <h2 className="mt-1 font-serif text-xl tracking-tight text-fg">{m.title}</h2>

            <h3 className="mt-4 text-sm font-semibold text-fg">Study goals</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-relaxed">
              {m.objectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>

            <h3 className="mt-4 text-sm font-semibold text-fg">Key terms</h3>
            <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
              {m.terms.map((t) => (
                <li key={t}>
                  <a href={glossaryHref(t)} className={LINK} data-testid="course-kit-term">{t.replace(/-/g, " ")}</a>
                </li>
              ))}
            </ul>

            <h3 className="mt-4 text-sm font-semibold text-fg">Activities</h3>
            <ul className="mt-2 grid gap-3">
              {m.activities.map((a) => (
                <li key={kitTargetHref(a.target)} className="text-sm leading-relaxed" data-testid="course-kit-activity">
                  <span className="text-muted">{KIT_TYPE_LABEL[a.target.kind]}:</span>{" "}
                  <a href={kitTargetHref(a.target)} data-print-url={onPaper(kitTargetHref(a.target))} className={LINK}>{a.label}</a>{" "}
                  <span className="text-muted">({a.minutes} min)</span>
                  <br />
                  {a.what}
                </li>
              ))}
            </ul>

            {m.note ? <p className="mt-3 text-sm text-muted">{m.note}</p> : null}

            <p className="mt-4 text-sm leading-relaxed" data-testid="course-kit-check">
              <strong className="font-semibold text-fg">Check for understanding:</strong> {m.check.text}{" "}
              <a href={practiceHref(m.check.practice)} data-print-url={onPaper(practiceHref(m.check.practice))} className={LINK}>Open this practice round</a>
            </p>
          </li>
        ))}
      </ol>

      <section className="mt-12 max-w-2xl" aria-labelledby="lms-h">
        <h2 id="lms-h" className={H2}>In your LMS</h2>
        <p className="mt-2 text-sm leading-relaxed" data-testid="course-kit-lms">{COURSE_KIT_LMS}</p>
      </section>

      <section className="mt-12 max-w-2xl" aria-labelledby="license-h" data-print-hide="">
        <h2 id="license-h" className={H2}>Teaching with a program license</h2>
        <p className="mt-2 text-sm leading-relaxed">
          A group or site license puts the whole class on the same desk. Licenses, the estimator and the inquiry form are on the main programs page.
        </p>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <a href={`${FOR_PROGRAMS_PATH}#inquiry`} className={LINK}>Ask about a program license</a>
          <a href={FOR_PROGRAMS_PATH} className={LINK}>All programs</a>
        </p>
      </section>

      <PairDisclaimer />
      <PrintFooter canonical={COURSE_KIT_URL} />
    </main>
  );
}
