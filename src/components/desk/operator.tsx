import { OPERATOR, PAY_RAILS } from "@/lib/billing/commerce";
import { PI_FOOTER, SOFTWARE } from "@/lib/regulatory";

export function OperatorCard() {
  return (
    <section className="rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)] sm:px-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Pay & write</p>
      <p className="mt-2 font-serif text-xl tracking-tight text-fg">{OPERATOR.name}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        Founding is $79 once: pay on a rail below → get a signed key by email or text → Redeem on
        Plans. Host factors, atlas, and export unlock — educational model, not FDA-cleared.
      </p>
      <OperatorLines className="mt-3 space-y-2 text-sm" />
    </section>
  );
}

export function DeskFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Pay & write</p>
          <p className="mt-2 font-serif text-lg tracking-tight text-fg">{OPERATOR.name}</p>
          <OperatorLines className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" />
        </div>
        <p className="max-w-sm text-[11px] leading-relaxed text-subtle">
          {SOFTWARE.name} {SOFTWARE.version}. {PI_FOOTER}
        </p>
      </div>
    </footer>
  );
}

function OperatorLines({ className }: { className?: string }) {
  return (
    <ul className={className}>
      {PAY_RAILS.map((rail) => (
        <li key={rail.id}>
          <a
            href={rail.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center font-medium text-accent hover:underline"
          >
            {rail.label} {rail.handle}
          </a>
          {rail.id === "venmo" ? <span className="text-muted"> · founding $79 lifetime</span> : null}
        </li>
      ))}
      <li>
        <a
          href={`mailto:${OPERATOR.email}`}
          className="inline-flex min-h-10 items-center text-fg hover:underline"
        >
          {OPERATOR.email}
        </a>
      </li>
      <li>
        <a
          href={OPERATOR.phoneHref}
          className="inline-flex min-h-10 items-center text-fg hover:underline"
        >
          {OPERATOR.phone}
        </a>
      </li>
      <li className="inline-flex min-h-10 items-center text-muted">{OPERATOR.social.join(" · ")}</li>
    </ul>
  );
}
