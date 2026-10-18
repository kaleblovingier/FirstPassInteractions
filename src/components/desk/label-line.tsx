import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { deskLabelPlain, deskLabels, alsoOnLabel, pinSentenceOf, pinBasisLine, scopeNoteLine, storedSearchLine, storedSourceLine } from "@/lib/drugs/label-on-desk";
import { drugHubPath } from "@/lib/seo/drug-hubs";

export function StoredLabelLine({ ids }: { ids: readonly string[] }) {
  const labels = deskLabels(ids);
  const [copied, setCopied] = useState<"ok" | "hand" | "idle">("idle");
  if (labels.length === 0) return null;
  const plain = deskLabelPlain(ids);
  const extras = alsoOnLabel(ids);
  async function copyLine() {
    try {
      await navigator.clipboard.writeText(plain);
      setCopied("ok");
    } catch {
      setCopied("hand");
    }
  }
  return (
    <section aria-label="Stored label line" className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted">Stored label line</p>
        <button
          type="button"
          onClick={() => void copyLine()}
          className="min-h-[44px] rounded-full bg-bg-sunken px-3 text-[11px] font-medium text-fg"
        >
          {copied === "ok" ? "Copied" : "Copy label line"}
        </button>
      </div>
      <p className="text-[11px] leading-relaxed text-muted">
        The label's words, already stored. Not a new finding. The pair check is still the severity.
      </p>
      <div className="space-y-3">
        {labels.map((row) => (
          <div key={row.slug} className="min-w-0">
            <p className="text-sm text-fg">
              {row.nameA} · {row.nameB}
            </p>
            <p className="font-mono text-[11px] text-muted">
              {row.labelDrug}. {row.labelSection}.
            </p>
            <p className="mt-1 min-w-0 break-words text-sm leading-relaxed text-fg">{row.quote}</p>
            {row.example ? (
              <p className="mt-1 min-w-0 break-words text-[11px] leading-relaxed text-muted">Names: {row.example}</p>
            ) : null}
            {row.mechanism ? (
              <p className="mt-1 text-[11px] leading-relaxed text-muted">Stored mechanism: {row.mechanism}.</p>
            ) : null}
            {row.domain ? (
              <p className="mt-1 text-[11px] leading-relaxed text-muted">Stored domain: {row.domain}.</p>
            ) : null}
            {row.pinEnzyme && row.pinKind ? (
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                The pin stores {row.pinEnzyme} as an {row.pinKind}. That enzyme is not a new finding.
              </p>
            ) : null}
            {pinSentenceOf(row) ? (
              <p className="mt-1 min-w-0 break-words text-[11px] leading-relaxed text-muted">
                The pin also stores this contraindications sentence: {pinSentenceOf(row)}. That sentence is not a new
                finding.
              </p>
            ) : null}
            {pinBasisLine(row) ? (
              <p className="mt-1 text-[11px] leading-relaxed text-muted">{pinBasisLine(row)}</p>
            ) : null}
            {row.retrieved ? (
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                Retrieved {row.retrieved}. That date is not a new finding.
              </p>
            ) : null}
            {scopeNoteLine(row.scopeNote) ? (
              <p className="mt-1 min-w-0 break-words text-[11px] leading-relaxed text-muted">{scopeNoteLine(row.scopeNote)}</p>
            ) : null}
            {storedSearchLine(row) ? (
              <p className="mt-1 min-w-0 break-words text-[11px] leading-relaxed text-muted">{storedSearchLine(row)}</p>
            ) : null}
            {storedSourceLine(row) ? (
              <p className="mt-1 min-w-0 break-words text-[11px] leading-relaxed text-muted">{storedSourceLine(row)}</p>
            ) : null}
            <div className="mt-1 flex flex-wrap gap-2">
              <a
                href={row.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[44px] items-center gap-1 text-xs font-medium text-accent underline-offset-2 hover:underline"
              >
                DailyMed
                <ExternalLink className="size-3" />
              </a>
              <a
                href={`/pair/${row.slug}`}
                className="inline-flex min-h-[44px] items-center text-xs font-medium text-accent underline-offset-2 hover:underline"
              >
                Public pair page
              </a>
              <a
                href={drugHubPath(row.drugA)}
                className="inline-flex min-h-[44px] items-center text-xs font-medium text-accent underline-offset-2 hover:underline"
              >
                Stored page: {row.nameA}
              </a>
              <a
                href={drugHubPath(row.drugB)}
                className="inline-flex min-h-[44px] items-center text-xs font-medium text-accent underline-offset-2 hover:underline"
              >
                Stored page: {row.nameB}
              </a>
            </div>
          </div>
        ))}
      </div>
      {extras.map((extra) => (
        <p key={extra.labelDrug} className="min-w-0 break-words text-[11px] leading-relaxed text-muted">
          Also stored on {extra.labelDrug}, not on this desk: {extra.names.join(", ")}. Not a suggestion to add them.
        </p>
      ))}
      {copied === "hand" ? (
        <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-bg-sunken p-3 font-mono text-[11px] text-muted">
          {plain}
        </pre>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {copied === "ok" ? "Label line copied." : copied === "hand" ? "Copy failed. The line is shown to copy by hand." : ""}
      </p>
    </section>
  );
}
