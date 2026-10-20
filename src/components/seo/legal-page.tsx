import { LEGAL_EFFECTIVE, type LegalDoc } from "@/lib/seo/legal";
import { PairDisclaimer } from "./pair-page";

export function LegalView({ doc }: { doc: LegalDoc }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10" data-testid={`legal-${doc.path.slice(1)}`}>
      <p className="text-xs text-muted">
        <a href="/" className="underline">Desk</a> · <a href="/trust" className="underline">Trust</a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{doc.h1}</h1>
      <p className="mt-2 text-sm text-muted">Effective {LEGAL_EFFECTIVE}</p>
      {doc.sections.map((s) => (
        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="mt-8">
          <h2 id={`${s.id}-h`} className="text-lg font-semibold">{s.title}</h2>
          {s.paras.map((p, i) => (
            <p key={i} className="mt-2 text-sm">{p}</p>
          ))}
        </section>
      ))}
      <PairDisclaimer />
    </main>
  );
}
