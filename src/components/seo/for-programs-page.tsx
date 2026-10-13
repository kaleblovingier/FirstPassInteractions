import {
  FOR_PROGRAMS_AUDIENCES,
  FOR_PROGRAMS_CTA,
  FOR_PROGRAMS_EMAIL,
  FOR_PROGRAMS_H1,
  FOR_PROGRAMS_INCLUDES,
  FOR_PROGRAMS_INTRO,
  FOR_PROGRAMS_MAILTO,
} from "@/lib/seo/for-programs";
import { PairDisclaimer } from "./pair-page";

export function ForProgramsView() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-xs text-muted">
        <a href="/pairs" className="underline">All pairs</a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{FOR_PROGRAMS_H1}</h1>
      <p className="mt-3 text-sm">{FOR_PROGRAMS_INTRO}</p>
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Who it's for</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {FOR_PROGRAMS_AUDIENCES.map((a) => (
            <li key={a.name}>
              <strong>{a.name}.</strong> {a.use}
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-8">
        <h2 className="text-lg font-semibold">What a license covers</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {FOR_PROGRAMS_INCLUDES.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Get in touch</h2>
        <p className="mt-2 text-sm">Tell us your program, about how many people would use it, and when you'd like to start.</p>
        <p className="mt-4">
          <a data-testid="for-programs-cta" href={FOR_PROGRAMS_MAILTO} className="inline-block rounded-lg border border-border px-4 py-2 text-sm font-medium">
            {FOR_PROGRAMS_CTA}
          </a>
        </p>
        <p className="mt-2 text-xs text-muted">Or write to {FOR_PROGRAMS_EMAIL}.</p>
      </section>
      <PairDisclaimer />
    </main>
  );
}
