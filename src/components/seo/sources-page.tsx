import { NOT_CLEARED } from "@/lib/regulatory";
import {
  REFERENCE_RESOURCES,
  REFERENCE_RESOURCE_KIND_LABEL,
  type ReferenceResourceKind,
} from "@/lib/drugs/reference-resources";
import {
  DDI_AGREEMENT_PATH,
  DDI_CAVEAT,
  DDI_HEADING,
  DDI_INTRO,
  DRIFT_REPORT_PATH,
  FDA_DDI_SOURCE,
  LABEL_VERSIONS_RETRIEVED,
  LIBRARY_DRIFT_NOTE,
  LIBRARY_HEADING,
  LIBRARY_INTRO,
  OTHER_LABELS_HEADING,
  OTHER_LABELS_INTRO,
  RESOURCES_HEADING,
  RESOURCES_INTRO,
  SOURCES_H1,
  SOURCES_INTRO,
  type DdiIndexTarget,
  type LibraryLabel,
  type OtherLabel,
} from "@/lib/seo/sources";
import { repoFile } from "@/lib/seo/trust";
import { PairDisclaimer } from "./pair-page";

const LINK = "underline [overflow-wrap:anywhere]";
const KIND_ORDER: ReferenceResourceKind[] = ["label", "approval", "interaction", "safety", "report"];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function versionLine(v: { version: number | null; effective: string | null; checkedOn: string | null }): string {
  const parts: string[] = [];
  if (v.version != null) parts.push(`SPL version ${v.version}`);
  if (v.effective) parts.push(`effective ${v.effective}`);
  if (v.checkedOn) parts.push(`checked ${v.checkedOn}`);
  return parts.length ? parts.join(" · ") : "Version not on file";
}

function Resources() {
  return (
    <section id="resources" aria-labelledby="resources-h" className="mt-10" data-testid="sources-resources">
      <h2 id="resources-h" className="text-lg font-semibold">
        {RESOURCES_HEADING}
      </h2>
      <p className="mt-2 text-sm">{RESOURCES_INTRO}</p>
      {KIND_ORDER.map((kind) => {
        const items = REFERENCE_RESOURCES.filter((r) => r.kind === kind);
        if (!items.length) return null;
        return (
          <div key={kind} className="mt-5">
            <h3 className="text-sm font-semibold">{REFERENCE_RESOURCE_KIND_LABEL[kind]}</h3>
            <ul className="mt-2 space-y-3 text-sm">
              {items.map((r) => (
                <li key={r.id} data-testid={`resource-${r.id}`}>
                  <a href={r.url} rel="noopener" className={`${LINK} font-medium`}>
                    {r.name}
                  </a>{" "}
                  <span className="text-muted">({r.owner})</span>
                  <p className="mt-0.5">{r.description}</p>
                  <p className="mt-0.5 text-muted">{r.onDesk}</p>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function LabelEntry({ label }: { label: LibraryLabel }) {
  return (
    <li id={label.anchor} className="border-t border-border pt-4" data-testid="library-label">
      <h3 className="text-base font-semibold wrap-break-word">{label.labelDrug}</h3>
      <p className="mt-1 text-xs text-muted">
        {label.setid ? (
          <>
            Set ID <span className="font-mono [overflow-wrap:anywhere]">{label.setid}</span> ·{" "}
          </>
        ) : null}
        {versionLine(label)}
      </p>
      <p className="mt-1 text-sm">
        <a href={label.url} rel="noopener" className={LINK}>
          Open this label on DailyMed
        </a>
      </p>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer">
          {plural(label.quotes.length, "saved quote", "saved quotes")} from {label.sections.join(", ")}
        </summary>
        <ul className="mt-2 space-y-3">
          {label.quotes.map((q) => (
            <li key={`${q.section}|${q.quote}`}>
              <p className="text-xs font-medium text-muted">{q.section}</p>
              <blockquote className="mt-1 border-l-2 border-border pl-3 wrap-break-word">{q.quote}</blockquote>
              <p className="mt-1 text-xs text-muted">
                Cited for:{" "}
                {q.pairs.map((p, i) => (
                  <span key={p.id}>
                    {i > 0 ? " · " : null}
                    {p.href ? (
                      <a href={p.href} className="underline">
                        {p.label}
                      </a>
                    ) : (
                      p.label
                    )}
                  </span>
                ))}
              </p>
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}

function Library({ labels, others }: { labels: LibraryLabel[]; others: OtherLabel[] }) {
  const quotes = labels.reduce((n, l) => n + l.quotes.length, 0);
  return (
    <section id="labels" aria-labelledby="labels-h" className="mt-10" data-testid="sources-library">
      <h2 id="labels-h" className="text-lg font-semibold">
        {LIBRARY_HEADING}
      </h2>
      <p className="mt-2 text-sm">{LIBRARY_INTRO}</p>
      <p className="mt-2 text-sm" data-testid="library-count">
        {plural(labels.length, "label", "labels")}, {plural(quotes, "saved quote", "saved quotes")}. Labels last
        fetched from DailyMed on {LABEL_VERSIONS_RETRIEVED}.
      </p>
      <p className="mt-2 text-xs text-muted">
        {LIBRARY_DRIFT_NOTE}{" "}
        <a href={repoFile(DRIFT_REPORT_PATH)} rel="noopener" className={LINK}>
          Label drift report
        </a>
        .
      </p>
      <ul className="mt-4 space-y-4">
        {labels.map((l) => (
          <LabelEntry key={l.key} label={l} />
        ))}
      </ul>
      {others.length ? (
        <>
          <h3 id="other-labels" className="mt-8 text-base font-semibold">
            {OTHER_LABELS_HEADING}
          </h3>
          <p className="mt-2 text-sm">{OTHER_LABELS_INTRO}</p>
          <ul className="mt-3 space-y-2 text-sm" data-testid="library-other">
            {others.map((o) => (
              <li key={o.setid} id={o.anchor}>
                <a href={o.url} rel="noopener" className={LINK}>
                  {o.labelDrug}
                </a>
                <span className="block text-xs text-muted">{versionLine(o)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function DdiTarget({ t }: { t: DdiIndexTarget }) {
  return (
    <li id={t.anchor} className="border-t border-border pt-4" data-testid="ddi-target">
      <h3 className="text-base font-semibold">{t.heading}</h3>
      <p className="mt-1 text-xs text-muted">
        {plural(t.count, "row", "rows")}
        {t.hubPath ? (
          <>
            {" "}
            ·{" "}
            <a href={t.hubPath} className="underline">
              Desk enzyme page
            </a>
          </>
        ) : null}
      </p>
      {t.groups.map((g) => (
        <div key={g.id} className="mt-3">
          <h4 className="text-sm font-medium">
            {g.heading} ({g.entries.length})
          </h4>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
            {g.entries.map((e) => (
              <li key={e.drug}>
                {e.drug}
                {e.footnotes.length ? (
                  <sup className="text-muted" aria-label={`footnote ${e.footnotes.join(", ")}`}>
                    {e.footnotes.join(",")}
                  </sup>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {t.footnotes.length ? (
        <ul className="mt-3 space-y-1 text-xs text-muted">
          {t.footnotes.map((f) => (
            <li key={f.n}>
              <sup>{f.n}</sup> {f.text}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function DdiIndex({ targets }: { targets: DdiIndexTarget[] }) {
  const rows = targets.reduce((n, t) => n + t.count, 0);
  return (
    <section id="fda-table" aria-labelledby="fda-table-h" className="mt-10" data-testid="sources-ddi">
      <h2 id="fda-table-h" className="text-lg font-semibold">
        {DDI_HEADING}
      </h2>
      <p className="mt-2 text-sm">{DDI_INTRO}</p>
      <p className="mt-2 text-sm" data-testid="ddi-source">
        Source:{" "}
        <a href={FDA_DDI_SOURCE.url} rel="noopener" className={LINK}>
          {FDA_DDI_SOURCE.title}
        </a>
        {`. FDA page content current as of ${FDA_DDI_SOURCE.contentCurrentAsOf}. Transcribed on ${FDA_DDI_SOURCE.retrieved}, ${plural(rows, "row", "rows")}.`}
      </p>
      <p className="mt-2 text-sm">{DDI_CAVEAT}</p>
      <p className="mt-2 text-xs text-muted">
        How the desk's stored roles compare with these rows:{" "}
        <a href={repoFile(DDI_AGREEMENT_PATH)} rel="noopener" className={LINK}>
          FDA table agreement report
        </a>
        .
      </p>
      <nav aria-label="Enzymes in the FDA table" className="mt-3">
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {targets.map((t) => (
            <li key={t.target}>
              <a href={`#${t.anchor}`} className="underline">
                {t.target === "CYP3A4" ? "CYP3A" : t.target}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <ul className="mt-4 space-y-4">
        {targets.map((t) => (
          <DdiTarget key={t.target} t={t} />
        ))}
      </ul>
    </section>
  );
}

export function SourcesView({
  labels,
  others,
  targets,
}: {
  labels: LibraryLabel[];
  others: OtherLabel[];
  targets: DdiIndexTarget[];
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-xs text-muted">
        <a href="/" className="underline">Desk</a> · <a href="/pairs" className="underline">All pairs</a> ·{" "}
        <a href="/enzymes" className="underline">Enzymes</a> · <a href="/glossary" className="underline">Glossary</a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{SOURCES_H1}</h1>
      <p className="mt-3 text-sm">{SOURCES_INTRO}</p>
      <p className="mt-3 rounded-xl border border-border bg-bg-sunken/40 p-4 text-sm" data-testid="sources-not-cleared">
        {NOT_CLEARED} The Prescribing Information governs.
      </p>
      <nav aria-label="On this page" className="mt-6">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <li>
            <a href="#resources" className="underline">{RESOURCES_HEADING}</a>
          </li>
          <li>
            <a href="#labels" className="underline">{LIBRARY_HEADING}</a>
          </li>
          <li>
            <a href="#fda-table" className="underline">{DDI_HEADING}</a>
          </li>
        </ul>
      </nav>
      <Resources />
      <Library labels={labels} others={others} />
      <DdiIndex targets={targets} />
      <PairDisclaimer />
    </main>
  );
}
