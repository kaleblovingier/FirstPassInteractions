import { INTENDED_USERS, NOT_CLEARED, NOT_FOR, SOFTWARE, WARNINGS } from "@/lib/regulatory";
import {
  PROCUREMENT,
  PROCUREMENT_MAILTO,
  TRUST_EMAIL,
  TRUST_H1,
  TRUST_INTRO,
  TRUST_REVIEWED,
  TRUST_SECTIONS,
  WHAT_SECTION,
  repoFile,
  type TrustSection,
} from "@/lib/seo/trust";
import { PairDisclaimer } from "./pair-page";

const LINK = "underline [overflow-wrap:anywhere]";

function fileName(path: string) {
  return path.split("/").pop() ?? path;
}

/** Stops a short token such as "W-9" from breaking at its hyphen on a narrow screen. */
function keepTogether(line: string, token: string) {
  const parts = line.split(token);
  if (parts.length === 1) return line;
  return parts.map((part, i) => (
    <span key={i}>
      {i > 0 ? <span className="whitespace-nowrap">{token}</span> : null}
      {part}
    </span>
  ));
}

function Sources({ paths }: { paths: readonly string[] }) {
  return (
    <p className="mt-3 text-xs text-muted" data-testid="trust-sources">
      Where this comes from:{" "}
      {paths.map((path, i) => (
        <span key={path}>
          {i > 0 ? " · " : null}
          <a href={repoFile(path)} rel="noopener" className={`${LINK} font-mono`}>
            {path}
          </a>
        </span>
      ))}
    </p>
  );
}

function Section({ section }: { section: TrustSection }) {
  return (
    <section id={section.id} aria-labelledby={`${section.id}-h`} className="mt-10" data-testid={`trust-section-${section.id}`}>
      <h2 id={`${section.id}-h`} className="text-lg font-semibold">
        {section.title}
      </h2>
      {section.intro ? <p className="mt-2 text-sm">{section.intro}</p> : null}
      <ul className="mt-3 space-y-3 text-sm">
        {section.points.map((p) => (
          <li key={p.lead}>
            <strong>{p.lead}</strong> {p.text}
            {p.source ? (
              <>
                {" "}
                <span className="text-muted">
                  Report:{" "}
                  <a href={repoFile(p.source)} rel="noopener" className={LINK}>
                    {fileName(p.source)}
                  </a>
                </span>
              </>
            ) : null}
          </li>
        ))}
      </ul>
      <Sources paths={section.sources} />
    </section>
  );
}

const NAV = [
  { id: WHAT_SECTION.id, title: WHAT_SECTION.title },
  ...TRUST_SECTIONS.map((s) => ({ id: s.id, title: s.title })),
  { id: PROCUREMENT.id, title: PROCUREMENT.title },
];

export function TrustView() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-xs text-muted">
        <a href="/" className="underline">Desk</a> · <a href="/pairs" className="underline">All pairs</a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{TRUST_H1}</h1>
      <p className="mt-3 text-sm">{TRUST_INTRO}</p>
      <p className="mt-2 text-xs text-muted" data-testid="trust-reviewed">
        Checked against FirstPass {SOFTWARE.version} on {TRUST_REVIEWED}.
      </p>

      <nav aria-label="On this page" className="mt-6">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {NAV.map((n) => (
            <li key={n.id}>
              <a href={`#${n.id}`} className="underline">
                {n.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <section id={WHAT_SECTION.id} aria-labelledby={`${WHAT_SECTION.id}-h`} className="mt-10" data-testid="trust-section-what">
        <h2 id={`${WHAT_SECTION.id}-h`} className="text-lg font-semibold">
          {WHAT_SECTION.title}
        </h2>
        <p className="mt-2 text-sm">{WHAT_SECTION.intro}</p>
        <p className="mt-3 text-sm">
          <strong>Who it is for.</strong> {INTENDED_USERS}
        </p>
        <p className="mt-3 rounded-xl border border-border bg-bg-sunken/40 p-4 text-sm">{NOT_CLEARED}</p>
        <h3 className="mt-5 text-sm font-semibold">{WHAT_SECTION.notForTitle}</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {NOT_FOR.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <h3 className="mt-5 text-sm font-semibold">{WHAT_SECTION.limitsTitle}</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {WARNINGS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm">{WHAT_SECTION.more}</p>
        <Sources paths={WHAT_SECTION.sources} />
      </section>

      {TRUST_SECTIONS.map((s) => (
        <Section key={s.id} section={s} />
      ))}

      <section id={PROCUREMENT.id} aria-labelledby={`${PROCUREMENT.id}-h`} className="mt-10" data-testid="trust-section-procurement">
        <h2 id={`${PROCUREMENT.id}-h`} className="text-lg font-semibold">
          {PROCUREMENT.title}
        </h2>
        {PROCUREMENT.lines.map((line) => (
          <p key={line} className="mt-2 text-sm">
            {keepTogether(line, "W-9")}
          </p>
        ))}
        <p className="mt-4">
          <a
            data-testid="trust-procurement-cta"
            href={PROCUREMENT_MAILTO}
            className="inline-block rounded-lg border border-border px-4 py-2 text-sm font-medium"
          >
            {PROCUREMENT.cta}
          </a>
        </p>
        <p className="mt-2 text-xs text-muted">Or write to {TRUST_EMAIL}.</p>
        <p className="mt-4 text-sm" data-testid="trust-for-programs-link">
          {PROCUREMENT.programs}:{" "}
          <a href="/for-programs" className="underline">
            FirstPass for programs
          </a>
          .
        </p>
      </section>

      <PairDisclaimer />
    </main>
  );
}
