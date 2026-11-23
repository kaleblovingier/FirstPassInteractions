import { useId, useRef, useState } from "react";
import { DISCLAIMER_ACTION, PAIR_DISCLAIMER } from "@/lib/seo/pair-copy";
import { embedSnippet, type PairEmbed } from "@/lib/seo/pair-embed";
import type { PairPage } from "@/lib/seo/pair-pages";

/*
 * Self-contained styles for the framed card: it sits inside someone else's course
 * page, so it carries its own light and dark colours (prefers-color-scheme) instead
 * of the site's single paper theme. Unlayered, so they win over the app's base layer.
 * WCAG contrast, worst case over the card and quote backgrounds: text 14.3:1 light, 13.6:1 dark;
 * muted text 5.6:1 light, 7.8:1 dark; links 6.1:1 light, 9.1:1 dark (pair-embed.test.tsx checks it).
 */
export const EMBED_CSS = `
:root{color-scheme:light dark;--fpe-bg:#f7f5ef;--fpe-fg:#1c1915;--fpe-muted:#5f5954;--fpe-border:#d5cfc2;--fpe-link:#2f5d56;--fpe-quote:#ece8df}
@media (prefers-color-scheme:dark){:root{--fpe-bg:#181614;--fpe-fg:#efece4;--fpe-muted:#bcb4a9;--fpe-border:#3d3832;--fpe-link:#8fcfc3;--fpe-quote:#24211d}}
html,body{background:var(--fpe-bg);color:var(--fpe-fg);min-height:0;margin:0}
.fpe{box-sizing:border-box;max-width:640px;padding:14px 16px;font:14px/1.45 "IBM Plex Sans",ui-sans-serif,system-ui,sans-serif}
.fpe a{color:var(--fpe-link);text-decoration:underline;text-underline-offset:2px}
.fpe a:focus-visible{outline:2px solid var(--fpe-link);outline-offset:2px;border-radius:2px}
.fpe-brand{margin:0;font-size:12px;color:var(--fpe-muted)}
.fpe h1{margin:2px 0 0;font-size:18px;line-height:1.3;font-weight:600}
.fpe-tier{margin:6px 0 0}
.fpe-why{margin:4px 0 0;font-size:12px;color:var(--fpe-muted)}
.fpe figure{margin:8px 0 0;padding:8px 10px;border:1px solid var(--fpe-border);border-radius:8px;background:var(--fpe-quote)}
.fpe blockquote{margin:0;font-size:13px}
.fpe figcaption{margin-top:4px;font-size:12px;color:var(--fpe-muted)}
.fpe-open{margin:10px 0 0;font-weight:600}
.fpe-disc{margin:6px 0 0;font-size:11px;color:var(--fpe-muted)}
.fpe h2{margin:10px 0 0;font-size:13px;line-height:1.3;font-weight:600}
.fpe-sub{margin:2px 0 0;font-size:12px;color:var(--fpe-muted)}
.fpe-list{margin:4px 0 0;padding:0;list-style:none}
.fpe-list li{display:flex;flex-wrap:wrap;justify-content:space-between;gap:0 8px;padding:2px 0;border-top:1px solid var(--fpe-border);font-size:13px}
.fpe-list li:first-child{border-top:0}
.fpe-tag{color:var(--fpe-muted);font-size:12px}
.fpe-inline{margin:4px 0 0;font-size:13px}
.fpe-more{margin:4px 0 0;font-size:12px}
.fpe-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
`;

const NEW_TAB = <span className="fpe-sr"> (opens in a new tab)</span>;

/** The framed card at /embed/pair/<slug>. No site header; every link opens outside the frame. */
export function PairEmbedCard({ card }: { card: PairEmbed }) {
  return (
    <>
      <style>{EMBED_CSS}</style>
      <main className="fpe" aria-labelledby="fpe-title" data-testid="pair-embed-card">
        <p className="fpe-brand">FirstPass · drug-pair card</p>
        <h1 id="fpe-title">
          {card.nameA} and {card.nameB}
        </h1>
        <p className="fpe-tier">
          Desk tier: <strong data-testid="embed-severity">{card.severityLabel}</strong>
        </p>
        {card.why ? (
          <p className="fpe-why" data-testid="embed-why">
            Why this grade: {card.why.title}
            {card.why.href ? (
              <>
                {" · "}
                <a href={card.why.href} target="_blank" rel="noopener">
                  {card.why.linkText}
                  {NEW_TAB}
                </a>
              </>
            ) : null}
          </p>
        ) : null}
        {card.quote ? (
          <figure>
            <blockquote data-testid="embed-quote">“{card.quote.quote}”</blockquote>
            <figcaption>
              {card.quote.labelDrug}, section {card.quote.labelSection}.{" "}
              <a href={card.quote.url} target="_blank" rel="noopener">
                DailyMed label
                {NEW_TAB}
              </a>
            </figcaption>
          </figure>
        ) : null}
        <p className="fpe-open">
          <a href={card.canonical} target="_blank" rel="noopener" data-testid="embed-open">
            Open in FirstPass
            {NEW_TAB}
          </a>
        </p>
        <p className="fpe-disc" data-testid="embed-disclaimer">
          {PAIR_DISCLAIMER} {DISCLAIMER_ACTION}
        </p>
      </main>
    </>
  );
}

async function copyText(text: string, field: HTMLTextAreaElement | null): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall back to selecting the field */
  }
  try {
    field?.focus();
    field?.select();
    return document.execCommand("copy");
  } catch {
    return false;
  }
}

/**
 * Collapsed "Embed this card" box: the iframe snippet and a Copy button with live
 * feedback. Used on pair pages, drug hubs and class pages.
 */
export function EmbedCodeBox({ snippet, what, label, testId }: {
  snippet: string;
  /** Completes "to show {what} as a small card": "this pair", "this drug's pairs". */
  what: string;
  /** Screen-reader label for the code field. */
  label: string;
  testId: string;
}) {
  const id = useId();
  const field = useRef<HTMLTextAreaElement>(null);
  const [status, setStatus] = useState("");
  return (
    <details data-testid={testId} className="mt-8 rounded-xl border border-border p-3 text-xs">
      <summary className="cursor-pointer font-medium">Embed this card</summary>
      <p className="mt-2 text-muted">
        Paste this into a course page (Canvas, another LMS or a course site) to show {what} as a small card. It links back here.
      </p>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        id={id}
        ref={field}
        readOnly
        rows={3}
        value={snippet}
        onFocus={(e) => e.currentTarget.select()}
        className="mt-2 block w-full resize-none rounded-lg border border-border bg-surface p-2 font-mono text-xs"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          className="rounded-lg border border-border px-3 py-1 font-medium"
          onClick={() => {
            void copyText(snippet, field.current).then((ok) =>
              setStatus(ok ? "Embed code copied." : "Couldn't copy. Select the code and copy it."),
            );
          }}
        >
          Copy
        </button>
        <span role="status" aria-live="polite" className="text-muted">
          {status}
        </span>
      </div>
    </details>
  );
}

/** The "Embed this card" box on each /pair/<slug> page. */
export function EmbedSnippetDisclosure({ page }: { page: Pick<PairPage, "slug" | "nameA" | "nameB"> }) {
  return (
    <EmbedCodeBox
      snippet={embedSnippet(page)}
      what="this pair"
      label={`Embed code for ${page.nameA} and ${page.nameB}`}
      testId="pair-embed"
    />
  );
}
