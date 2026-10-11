import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import { LIVERTOX_CAT_TONE, livertoxUrl } from "@/lib/drugs/livertox";
import type { HostContext } from "@/lib/drugs/types";
import {
  DILI_CITATIONS,
  DILI_DISCLAIMER,
  RUCAM_DEFAULTS,
  RUCAM_DOMAINS,
  RUCAM_GROUP_I,
  RUCAM_GROUP_II,
  diliCardsOnDesk,
  diliReportOnDesk,
  hysLaw,
  meetsDiliThreshold,
  newRRatio,
  rRatio,
  rucam,
  type DiliPattern,
  type RucamAnswers,
  type RucamBand,
  type RucamPattern,
} from "@/lib/drugs/dili";

type LabKey = "alt" | "ast" | "alp" | "tbili";

const LABS: { key: LabKey; label: string; unit: string; uln: number; value: number }[] = [
  { key: "alt", label: "ALT", unit: "U/L", uln: 40, value: 420 },
  { key: "ast", label: "AST", unit: "U/L", uln: 40, value: 310 },
  { key: "alp", label: "ALP", unit: "U/L", uln: 120, value: 150 },
  { key: "tbili", label: "Total bilirubin", unit: "mg/dL", uln: 1.2, value: 3.1 },
];

const PATTERN_TONE: Record<DiliPattern, "danger" | "warn" | "info"> = {
  hepatocellular: "danger",
  mixed: "warn",
  cholestatic: "info",
};

const BAND_TONE: Record<RucamBand, "default" | "info" | "warn" | "danger" | "ok"> = {
  excluded: "default",
  unlikely: "default",
  possible: "info",
  probable: "warn",
  "highly probable": "danger",
};

const selectClass =
  "mt-1 h-11 w-full min-w-0 rounded-md border border-border bg-surface-2 px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

const fmtR = (r: number) => (Number.isNaN(r) ? "—" : Number.isFinite(r) ? r.toFixed(1) : "∞");
const fmtX = (v: number, uln: number) => (Number.isFinite(v) && uln > 0 ? `${(v / uln).toFixed(1)}× ULN` : "—");

function num(s: string): number {
  if (s.trim() === "") return Number.NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : Number.NaN;
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-start gap-2 text-sm leading-relaxed">
      <span
        aria-hidden="true"
        className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-xs ${
          ok ? "bg-ok-soft text-ok" : "bg-bg-sunken text-subtle"
        }`}
      >
        {ok ? "✓" : "–"}
      </span>
      <span className={ok ? "text-fg" : "text-muted"}>
        {label}
        <span className="sr-only">{ok ? " (met)" : " (not met)"}</span>
      </span>
    </li>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="whitespace-nowrap font-mono text-lg text-fg">{value}</dd>
      {hint ? <dd className="text-xs text-subtle">{hint}</dd> : null}
    </div>
  );
}

export function DiliPanel({ ids, host }: { ids: string[]; host: HostContext }) {
  const report = useMemo(() => diliReportOnDesk(ids, host), [ids, host]);
  const cards = useMemo(() => diliCardsOnDesk(ids), [ids]);

  const [vals, setVals] = useState<Record<LabKey, string>>(
    () => Object.fromEntries(LABS.map((l) => [l.key, String(l.value)])) as Record<LabKey, string>,
  );
  const [ulns, setUlns] = useState<Record<LabKey, string>>(
    () => Object.fromEntries(LABS.map((l) => [l.key, String(l.uln)])) as Record<LabKey, string>,
  );
  const [boneCause, setBoneCause] = useState(false);

  const lab = {
    alt: num(vals.alt),
    ast: num(vals.ast),
    alp: num(vals.alp),
    tbili: num(vals.tbili),
    altUln: num(ulns.alt),
    astUln: num(ulns.ast),
    alpUln: num(ulns.alp),
    tbiliUln: num(ulns.tbili),
  };
  const r = rRatio(lab);
  const nr = newRRatio(lab);
  const threshold = meetsDiliThreshold({ ...lab, boneCause });
  const hy = hysLaw(lab);

  // RUCAM: follow the R pattern until the learner picks a table.
  const [tableOverride, setTableOverride] = useState<RucamPattern | null>(null);
  const autoTable: RucamPattern = r.pattern === "hepatocellular" ? "hepatocellular" : "cholestatic";
  const table = tableOverride ?? autoTable;
  const [answers, setAnswers] = useState<RucamAnswers>(() => ({
    ...RUCAM_DEFAULTS,
    age: host.age === "geriatric" ? "55plus" : RUCAM_DEFAULTS.age,
    alcohol: host.alcohol === "chronic" ? "yes" : RUCAM_DEFAULTS.alcohol,
  }));
  const score = rucam(table, answers);

  const pickTable = (t: RucamPattern) => {
    setTableOverride(t === autoTable ? null : t);
  };

  // Keep each answer valid when the table changes (course options differ).
  const answerFor = (key: keyof RucamAnswers): string => {
    const opts = RUCAM_DOMAINS.find((d) => d.key === key)?.options[table] ?? [];
    const v = answers[key];
    return opts.some((o) => o.value === v) ? v : "noInfo";
  };

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Liver injury</p>
        <h3 className="mt-1 font-serif text-lg tracking-tight text-fg">Drug-induced liver injury</h3>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          Read the pattern from the labs, check Hy&apos;s law, then score how strongly a drug fits with RUCAM. DILI is a
          diagnosis of exclusion; these tools frame the question.
        </p>
      </div>

      {/* ── Pattern ── */}
      <section className="space-y-4" aria-labelledby="dili-pattern-h">
        <h4 id="dili-pattern-h" className="font-serif text-base text-fg">
          Pattern
        </h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {LABS.map((l) => (
            <fieldset key={l.key} className="min-w-0 rounded-xl bg-bg-sunken px-3 py-3">
              <legend className="sr-only">{l.label}</legend>
              <div className="grid grid-cols-2 gap-2">
                <div className="min-w-0">
                  <label htmlFor={`dili-${l.key}`} className="text-xs text-muted">
                    {l.label} ({l.unit})
                  </label>
                  <Input
                    id={`dili-${l.key}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={vals[l.key]}
                    onChange={(e) => setVals((p) => ({ ...p, [l.key]: e.target.value }))}
                    className="mt-1 font-mono"
                  />
                </div>
                <div className="min-w-0">
                  <label htmlFor={`dili-${l.key}-uln`} className="text-xs text-muted">
                    {l.label} ULN
                  </label>
                  <Input
                    id={`dili-${l.key}-uln`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={ulns[l.key]}
                    onChange={(e) => setUlns((p) => ({ ...p, [l.key]: e.target.value }))}
                    className="mt-1 font-mono"
                  />
                </div>
              </div>
              <p className="mt-1 whitespace-nowrap font-mono text-xs text-subtle">{fmtX(num(vals[l.key]), num(ulns[l.key]))}</p>
            </fieldset>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={boneCause}
            onChange={(e) => setBoneCause(e.target.checked)}
            className="size-4 accent-accent"
          />
          ALP has a bone source
        </label>

        <div className="space-y-3 rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)]">
          <dl className="grid grid-cols-2 gap-3">
            <Stat label="R (ALT)" value={fmtR(r.r)} hint="(ALT/ULN) ÷ (ALP/ULN)" />
            <Stat label="nR (higher of ALT, AST)" value={fmtR(nr.r)} hint="ACG 2021" />
          </dl>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted">Pattern</span>
            <Badge tone={PATTERN_TONE[r.pattern]}>{r.pattern}</Badge>
            {nr.pattern !== r.pattern ? (
              <span className="text-xs text-subtle">
                nR reads <span className="whitespace-nowrap">{nr.pattern}</span>
              </span>
            ) : null}
          </div>
          <p className="text-xs text-subtle">R 5 or more is hepatocellular. R 2 or less is cholestatic. Between is mixed.</p>

          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-fg">DILI case definition</span>
              <Badge tone={threshold.met ? "warn" : "default"}>{threshold.met ? "Met" : "Not met"}</Badge>
            </div>
            <ul className="space-y-1">
              <Check ok={threshold.criteria.altFive} label="ALT 5× ULN or more" />
              <Check ok={threshold.criteria.alpTwo} label="ALP 2× ULN or more, no bone cause" />
              <Check ok={threshold.criteria.altThreeBiliTwo} label="ALT 3× ULN or more with bilirubin over 2× ULN" />
            </ul>
            <p className="text-xs text-subtle">Any one is enough (Aithal 2011).</p>
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-fg">Hy&apos;s law</span>
              <Badge tone={hy.met ? "danger" : "default"}>{hy.met ? "Labs fit" : "Labs do not fit"}</Badge>
            </div>
            <ul className="space-y-1">
              <Check ok={hy.components.aminotransferase} label="ALT or AST over 3× ULN" />
              <Check ok={hy.components.bilirubin} label="Total bilirubin over 2× ULN" />
              <Check ok={hy.components.noCholestasis} label="ALP under 2× ULN (no early cholestasis)" />
            </ul>
            <p className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${hy.met ? "bg-danger-soft text-danger" : "bg-bg-sunken text-muted"}`}>
              {hy.teaching}
            </p>
            <p className="text-xs leading-relaxed text-subtle">{hy.otherCauseNote}</p>
          </div>
        </div>
      </section>

      {/* ── RUCAM ── */}
      <section className="space-y-4" aria-labelledby="dili-rucam-h">
        <h4 id="dili-rucam-h" className="font-serif text-base text-fg">
          RUCAM
        </h4>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="RUCAM table">
          <Button
            size="sm"
            variant={table === "hepatocellular" ? "default" : "outline"}
            aria-pressed={table === "hepatocellular"}
            onClick={() => pickTable("hepatocellular")}
          >
            Hepatocellular
          </Button>
          <Button
            size="sm"
            variant={table === "cholestatic" ? "default" : "outline"}
            aria-pressed={table === "cholestatic"}
            onClick={() => pickTable("cholestatic")}
          >
            Cholestatic or mixed
          </Button>
          <span className="text-xs text-subtle">{tableOverride ? "Chosen by you" : "Follows R"}</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {RUCAM_DOMAINS.map((d) => {
            const value = answerFor(d.key);
            const opt = d.options[table].find((o) => o.value === value);
            return (
              <div key={d.key} className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor={`rucam-${d.key}`} className="min-w-0 text-xs text-muted">
                    <span className="font-mono text-subtle">{d.domain}.</span> {d.label}
                  </label>
                  <span className="shrink-0 whitespace-nowrap font-mono text-xs text-fg">
                    {opt ? (opt.points > 0 ? `+${opt.points}` : String(opt.points)) : "0"}
                  </span>
                </div>
                <select
                  id={`rucam-${d.key}`}
                  className={selectClass}
                  value={value}
                  onChange={(e) => setAnswers((a) => ({ ...a, [d.key]: e.target.value }) as RucamAnswers)}
                >
                  {d.options[table].map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label} ({o.points > 0 ? `+${o.points}` : o.points})
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface px-4 py-3 shadow-[var(--shadow-border)]" aria-live="polite">
          <span className="text-sm text-muted">Total</span>
          <span className="whitespace-nowrap font-mono text-2xl text-fg">{score.total}</span>
          <Badge tone={BAND_TONE[score.band]}>{score.band}</Badge>
          {score.timingExcludes ? (
            <p className="w-full text-sm text-warn">Timing is incompatible, so RUCAM calls the drug unrelated.</p>
          ) : null}
        </div>
        <p className="text-xs text-subtle">
          0 or less excluded · 1–2 unlikely · 3–5 possible · 6–8 probable · 9 or more highly probable.
        </p>

        <details className="rounded-xl bg-bg-sunken px-4 py-3">
          <summary className="cursor-pointer text-sm text-fg">Other causes to rule out</summary>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-fg">
            <div>
              <p className="text-xs text-muted">Group I</p>
              <ul className="list-disc space-y-0.5 pl-5">
                {RUCAM_GROUP_I.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs text-muted">Group II</p>
              <ul className="list-disc space-y-0.5 pl-5">
                {RUCAM_GROUP_II.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      </section>

      {/* ── Tray ── */}
      <section className="space-y-3" aria-labelledby="dili-tray-h">
        <h4 id="dili-tray-h" className="font-serif text-base text-fg">
          Tray
        </h4>
        {cards.length === 0 ? (
          <p className="text-sm text-muted">No drug on this tray has a LiverTox card here.</p>
        ) : (
          <ul className="space-y-2">
            {cards.map(({ id, livertoxKey, card }) => {
              const name = DRUG_BY_ID[id]?.name ?? id;
              return (
                <li key={id} className="space-y-1 rounded-xl bg-surface px-4 py-3 shadow-[var(--shadow-border)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-serif text-sm text-fg">{name}</span>
                    <Badge tone={LIVERTOX_CAT_TONE[card.cat]}>
                      <span className="whitespace-nowrap">
                        {card.cat} · {card.label}
                      </span>
                    </Badge>
                  </div>
                  <p className="text-sm leading-relaxed text-muted">{card.pearl}</p>
                  <a
                    href={livertoxUrl(livertoxKey, name)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-xs text-accent underline underline-offset-2"
                  >
                    LiverTox chapter<span className="sr-only"> for {name} (opens in a new tab)</span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
        {report.notes.length > 0 ? (
          <ul className="space-y-2">
            {report.notes.map((n) => (
              <li key={n} className="rounded-lg bg-info-soft px-3 py-2 text-sm leading-relaxed text-info">
                {n}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <footer className="space-y-3 border-t border-border pt-4">
        <details>
          <summary className="cursor-pointer text-xs font-medium text-muted">Sources</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-muted">
            {DILI_CITATIONS.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
        </details>
        <p className="text-xs leading-relaxed text-subtle">{DILI_DISCLAIMER}</p>
      </footer>
    </div>
  );
}
