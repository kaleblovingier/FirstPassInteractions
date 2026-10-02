import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { OPERATOR, SITE, TRY_THREE, launchPosts } from "@/lib/billing/commerce";
import { Button } from "@/components/ui/button";

export function LaunchDesk() {
  const posts = useMemo(() => launchPosts(), []);
  const [copied, setCopied] = useState("");

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      /* clipboard */
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Public rails</p>
        <h2 className="mt-2 font-serif text-xl tracking-tight text-fg">Pitch page, source, pay</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Post these yourself. Do not cold-email the Hunt directory. Free up to five drugs on the desk; founding is $79 once. Educational — not FDA-cleared. Empty tray is not proof a combination is safe.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          <li>
            <a className="font-medium text-accent hover:underline" href={SITE.pages} target="_blank" rel="noreferrer">
              Pitch page
            </a>
            <span className="text-muted"> — {SITE.pages}</span>
          </li>
          <li>
            <a className="font-medium text-accent hover:underline" href={SITE.gamma} target="_blank" rel="noreferrer">
              Pitch deck
            </a>
            <span className="text-muted"> — Gamma webpage</span>
          </li>
          <li>
            <a className="font-medium text-accent hover:underline" href={SITE.gammaCard} target="_blank" rel="noreferrer">
              Social card
            </a>
            <span className="text-muted"> — square, for X / LinkedIn</span>
          </li>
          <li className="text-muted">{OPERATOR.payLine}</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => void copy("url", SITE.pages)}>
            {copied === "url" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied === "url" ? "Copied" : "Copy URL"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void copy("repo", SITE.repo)}>
            {copied === "repo" ? "Copied" : "Copy repo"}
          </Button>
        </div>
      </section>

      <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <h2 className="font-serif text-xl tracking-tight text-fg">Try these three</h2>
        <ol className="mt-3 grid gap-3 sm:grid-cols-3">
          {TRY_THREE.map((t, i) => (
            <li key={t.id} className="rounded-md bg-bg-sunken px-3 py-3">
              <p className="font-mono text-[11px] uppercase tracking-wide text-accent">{i + 1}</p>
              <p className="mt-1 text-sm font-medium text-fg">{t.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{t.punch}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-4">
        {posts.map((p) => (
          <section key={p.id} className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">{p.channel}</p>
                <h3 className="mt-1 font-serif text-lg tracking-tight text-fg">{p.title}</h3>
                <p className="mt-1 text-xs text-muted">{p.where}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => void copy(p.id, p.text)}>
                  {copied === p.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied === p.id ? "Copied" : "Copy"}
                </Button>
                <Button size="sm" variant="secondary" asChild>
                  <a href={p.compose} target="_blank" rel="noreferrer">
                    Open
                    <ExternalLink className="size-3.5" />
                  </a>
                </Button>
              </div>
            </div>
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-bg-sunken px-3 py-3 font-sans text-sm leading-relaxed text-fg">
              {p.text}
            </pre>
          </section>
        ))}
      </div>
    </div>
  );
}
