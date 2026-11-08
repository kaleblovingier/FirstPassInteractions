import { INTENDED_USERS, NOT_CLEARED, NOT_FOR, STATUTORY_CDS_DISCLAIMER } from "@/lib/regulatory";
import {
  DEVELOPERS_AUTH,
  DEVELOPERS_BASE_URL,
  DEVELOPERS_CTA,
  DEVELOPERS_EMAIL,
  DEVELOPERS_ENDPOINTS,
  DEVELOPERS_ERRORS,
  DEVELOPERS_ERRORS_NOTE,
  DEVELOPERS_ERROR_SHAPE,
  DEVELOPERS_H1,
  DEVELOPERS_INTEGRATION_RULES,
  DEVELOPERS_INTRO,
  DEVELOPERS_LICENSING,
  DEVELOPERS_LIMITS,
  DEVELOPERS_LIMITS_NOTE,
  DEVELOPERS_MAILTO,
  DEVELOPERS_USE,
} from "@/lib/seo/developers";
import { PairDisclaimer } from "./pair-page";

const NAV = [
  { id: "use", title: "What it is for" },
  { id: "endpoints", title: "Endpoints" },
  { id: "auth", title: "Keys" },
  { id: "limits", title: "Rate limits" },
  { id: "errors", title: "Errors" },
  { id: "rules", title: "Showing the output" },
  { id: "licensing", title: "Licensing" },
];

function H2({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={`${id}-h`} className="text-lg font-semibold">
      {children}
    </h2>
  );
}

export function DevelopersView() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-xs text-muted">
        <a href="/" className="underline">Desk</a> · <a href="/trust" className="underline">Trust</a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{DEVELOPERS_H1}</h1>
      <p className="mt-3 text-sm">{DEVELOPERS_INTRO}</p>

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

      <section id="use" aria-labelledby="use-h" className="mt-10" data-testid="developers-use">
        <H2 id="use">{DEVELOPERS_USE.title}</H2>
        <p className="mt-2 text-sm">
          <strong>{DEVELOPERS_USE.forLead}</strong> {DEVELOPERS_USE.forText}
        </p>
        <p className="mt-3 rounded-xl border border-border bg-bg-sunken/40 p-4 text-sm" data-testid="developers-not-ehr">
          <strong>{DEVELOPERS_USE.notLead}</strong> {DEVELOPERS_USE.notText}
        </p>
        <p className="mt-3 text-sm">{DEVELOPERS_USE.hostText}</p>
        <p className="mt-3 text-sm">
          <strong>Who the output is for.</strong> {INTENDED_USERS}
        </p>
        <p className="mt-3 text-sm" data-testid="developers-statutory">
          <strong>Carried on every answer.</strong> {STATUTORY_CDS_DISCLAIMER}
        </p>
        <p className="mt-3 text-sm">{NOT_CLEARED}</p>
        <h3 className="mt-5 text-sm font-semibold">FirstPass is not for</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {NOT_FOR.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section id="endpoints" aria-labelledby="endpoints-h" className="mt-10">
        <H2 id="endpoints">Endpoints</H2>
        <p className="mt-2 text-sm">
          Base URL: <code className="font-mono [overflow-wrap:anywhere]">{DEVELOPERS_BASE_URL}</code>. Answers are JSON.
        </p>
        <ul className="mt-3 space-y-4 text-sm">
          {DEVELOPERS_ENDPOINTS.map((e) => (
            <li key={e.path}>
              <p className="font-mono [overflow-wrap:anywhere]">
                <strong>{e.method}</strong> {e.path}
              </p>
              <p className="mt-1">{e.summary}</p>
              {e.request ? (
                <p className="mt-1 font-mono text-xs text-muted [overflow-wrap:anywhere]">{e.request}</p>
              ) : null}
              <p className="mt-1 text-xs text-muted">{e.keyed ? "Key optional; rate limited." : "Open."}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="auth" aria-labelledby="auth-h" className="mt-10">
        <H2 id="auth">Keys</H2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
          {DEVELOPERS_AUTH.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section id="limits" aria-labelledby="limits-h" className="mt-10">
        <H2 id="limits">Rate limits</H2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="py-2 pr-3 font-semibold">Caller</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Limit</th>
                <th scope="col" className="py-2 font-semibold">For</th>
              </tr>
            </thead>
            <tbody>
              {DEVELOPERS_LIMITS.map((r) => (
                <tr key={r.who} className="border-b border-border align-top">
                  <th scope="row" className="py-2 pr-3 font-medium">{r.who}</th>
                  <td className="py-2 pr-3">{r.limit}</td>
                  <td className="py-2">{r.fits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm">{DEVELOPERS_LIMITS_NOTE}</p>
      </section>

      <section id="errors" aria-labelledby="errors-h" className="mt-10">
        <H2 id="errors">Errors</H2>
        <p className="mt-2 text-sm">{DEVELOPERS_ERRORS_NOTE}</p>
        <ul className="mt-3 space-y-1 text-sm">
          {DEVELOPERS_ERRORS.map((e) => (
            <li key={e.status}>
              <strong className="font-mono">{e.status}</strong> {e.when}
            </li>
          ))}
        </ul>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-bg-sunken p-3 font-mono text-xs">{DEVELOPERS_ERROR_SHAPE}</pre>
      </section>

      <section id="rules" aria-labelledby="rules-h" className="mt-10">
        <H2 id="rules">Showing the output</H2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
          {DEVELOPERS_INTEGRATION_RULES.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section id="licensing" aria-labelledby="licensing-h" className="mt-10">
        <H2 id="licensing">Licensing</H2>
        <p className="mt-2 text-sm">{DEVELOPERS_LICENSING}</p>
        <p className="mt-4">
          <a
            data-testid="developers-cta"
            href={DEVELOPERS_MAILTO}
            className="inline-block rounded-lg border border-border px-4 py-2 text-sm font-medium"
          >
            {DEVELOPERS_CTA}
          </a>
        </p>
        <p className="mt-2 text-xs text-muted">Or write to {DEVELOPERS_EMAIL}.</p>
      </section>

      <PairDisclaimer />
    </main>
  );
}
