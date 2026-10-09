import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ALLERGY_DISCLAIMER,
  BETA_LACTAMS,
  BETA_LACTAM_BY_ID,
  NARANJO_ITEMS,
  PEN_FAST_ITEMS,
  PEN_FAST_MNEMONIC,
  R1_GROUP_LABEL,
  SCAR_PROFILES,
  SCAR_RECHALLENGE_RULE,
  SULFONAMIDE_NOTE,
  allergyReportOnDesk,
  crossReactivity,
  naranjo,
  penFast,
  type BetaLactamClass,
  type CrossReactivityResult,
  type NaranjoAnswer,
  type NaranjoBand,
  type PenFastBand,
  type PenFastInput,
} from "@/lib/drugs/drug-allergy";
import { DRUG_BY_ID } from "@/lib/drugs/catalog";
import type { HostContext } from "@/lib/drugs/types";

type Section = "penfast" | "cross" | "naranjo" | "scar";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "penfast", label: "PEN-FAST" },
  { key: "cross", label: "Cross-reactivity" },
  { key: "naranjo", label: "Naranjo" },
  { key: "scar", label: "Severe skin reactions" },
];

type Tone = "default" | "accent" | "danger" | "warn" | "ok" | "info";

const PEN_TONE: Record<PenFastBand, Tone> = { "very-low": "ok", low: "ok", moderate: "warn", high: "danger" };
const PEN_LABEL: Record<PenFastBand, string> = { "very-low": "Very low", low: "Low", moderate: "Moderate", high: "High" };

const NARANJO_TONE: Record<NaranjoBand, Tone> = { definite: "danger", probable: "warn", possible: "info", doubtful: "default" };
const NARANJO_LABEL: Record<NaranjoBand, string> = { definite: "Definite", probable: "Probable", possible: "Possible", doubtful: "Doubtful" };

const CLASS_LABEL: Record<BetaLactamClass, string> = {
  penicillin: "Penicillins",
  cephalosporin: "Cephalosporins",
  carbapenem: "Carbapenems",
  monobactam: "Monobactam",
};

const selectClass =
  "h-10 w-full rounded-md border border-border bg-surface-2 px-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

/** Visual key for a cross-reactivity result. */
function crossStyle(c: CrossReactivityResult): { cell: string; symbol: string; label: string; tone: Tone } {
  if (c.level === "same-drug") return { cell: "bg-surface-2 text-fg", symbol: "●", label: "Same drug", tone: "default" };
  if (c.level === "identical-r1") return { cell: "bg-danger-soft text-danger", symbol: "=", label: "Identical R1", tone: "danger" };
  if (c.level === "similar-r1") return { cell: "bg-warn-soft text-warn", symbol: "≈", label: "Similar R1", tone: "warn" };
  if (c.coreShared) return { cell: "bg-info-soft text-info", symbol: "p", label: "Different R1, shared penicillin core", tone: "info" };
  return { cell: "bg-ok-soft text-ok", symbol: "·", label: "Dissimilar", tone: "ok" };
}

const nameOf = (id: string) => BETA_LACTAM_BY_ID[id]?.name ?? DRUG_BY_ID[id]?.name ?? id;

/* ── PEN-FAST ─────────────────────────────────────────────────────────── */

function PenFastSection() {
  const [input, setInput] = useState<PenFastInput>({ withinFiveYears: false, anaphylaxisOrScar: false, treatmentRequired: false });
  const r = penFast(input);
  return (
    <section className="space-y-4" aria-label="PEN-FAST">
      <p className="text-sm leading-relaxed text-muted">
        A patient reports a penicillin allergy. Three questions sort the label by the chance that a penicillin allergy
        test comes back positive.
      </p>
      <fieldset className="space-y-2 rounded-xl bg-bg-sunken px-4 py-3">
        <legend className="sr-only">PEN-FAST items</legend>
        {PEN_FAST_ITEMS.map((item) => {
          const id = `penfast-${item.key}`;
          return (
            <div key={item.key} className="flex items-start gap-3">
              <input
                id={id}
                type="checkbox"
                checked={input[item.key]}
                onChange={(e) => setInput((p) => ({ ...p, [item.key]: e.target.checked }))}
                className="mt-1 size-4 shrink-0 accent-accent"
              />
              <label htmlFor={id} className="min-w-0 flex-1 text-sm text-fg">
                <span className="font-mono text-xs text-accent">{item.letter}</span> {item.label}
              </label>
              <span className="shrink-0 whitespace-nowrap font-mono text-xs text-subtle">+{item.points}</span>
            </div>
          );
        })}
      </fieldset>
      <div className="space-y-2 rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)]" aria-live="polite">
        <div className="flex flex-wrap items-center gap-2">
          <span className="whitespace-nowrap font-mono text-lg text-fg">{r.score} / 5</span>
          <Badge tone={PEN_TONE[r.band]} className="whitespace-nowrap">
            {PEN_LABEL[r.band]} risk
          </Badge>
        </div>
        <p className="text-sm text-fg">{r.riskText}</p>
        <p className="text-sm leading-relaxed text-muted">{r.teaching}</p>
      </div>
      <p className="text-xs leading-relaxed text-subtle">{PEN_FAST_MNEMONIC}</p>
    </section>
  );
}

/* ── Cross-reactivity ─────────────────────────────────────────────────── */

function BetaLactamSelect({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  const classes: BetaLactamClass[] = ["penicillin", "cephalosporin", "carbapenem", "monobactam"];
  return (
    <div className="min-w-0 space-y-1">
      <label htmlFor={id} className="text-xs text-muted">
        {label}
      </label>
      <select id={id} className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
        {classes.map((cls) => (
          <optgroup key={cls} label={CLASS_LABEL[cls]}>
            {BETA_LACTAMS.filter((b) => b.cls === cls).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

function Legend() {
  const items: { cell: string; symbol: string; label: string }[] = [
    { cell: "bg-danger-soft text-danger", symbol: "=", label: "Identical R1" },
    { cell: "bg-warn-soft text-warn", symbol: "≈", label: "Similar R1" },
    { cell: "bg-info-soft text-info", symbol: "p", label: "Both penicillins" },
    { cell: "bg-ok-soft text-ok", symbol: "·", label: "Dissimilar" },
    { cell: "bg-surface-2 text-fg", symbol: "●", label: "Same drug" },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Legend">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5 text-xs text-muted">
          <span className={`inline-flex size-5 items-center justify-center rounded font-mono text-xs ${i.cell}`} aria-hidden="true">
            {i.symbol}
          </span>
          {i.label}
        </li>
      ))}
    </ul>
  );
}

function CrossSection({ trayBetaLactams }: { trayBetaLactams: string[] }) {
  const [culprit, setCulprit] = useState<string>(trayBetaLactams[0] ?? "amoxicillin");
  const [candidate, setCandidate] = useState<string>(trayBetaLactams[1] ?? "cephalexin");
  const pair = crossReactivity(culprit, candidate);
  const ps = crossStyle(pair);
  const c = BETA_LACTAM_BY_ID[culprit];
  const d = BETA_LACTAM_BY_ID[candidate];

  const matrixRows = trayBetaLactams.length > 0 ? trayBetaLactams : [culprit];
  const others = BETA_LACTAMS.filter((b) => b.id !== culprit).map((b) => ({ b, r: crossReactivity(culprit, b.id) }));
  const order = { "same-drug": 0, "identical-r1": 1, "similar-r1": 2, dissimilar: 3 } as const;
  others.sort((x, y) => order[x.r.level] - order[y.r.level] || Number(y.r.coreShared) - Number(x.r.coreShared));

  return (
    <section className="space-y-4" aria-label="Beta-lactam cross-reactivity">
      <p className="text-sm leading-relaxed text-muted">
        Most penicillin–cephalosporin cross-reactions follow the R1 side chain, not the beta-lactam ring. Match the side
        chain before you judge the class.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BetaLactamSelect id="allergy-culprit" label="Culprit (the allergy label)" value={culprit} onChange={setCulprit} />
        <BetaLactamSelect id="allergy-candidate" label="Candidate" value={candidate} onChange={setCandidate} />
      </div>
      <div className="space-y-2 rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)]" aria-live="polite">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-serif text-base text-fg">
            {nameOf(culprit)} → {nameOf(candidate)}
          </p>
          <Badge tone={ps.tone} className="whitespace-nowrap">
            {ps.label}
          </Badge>
        </div>
        <p className="text-sm leading-relaxed text-fg">{pair.why}</p>
        {c && d ? (
          <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-muted">{c.name} R1</dt>
              <dd className="text-fg">{R1_GROUP_LABEL[c.r1] ?? c.r1}</dd>
            </div>
            <div>
              <dt className="text-muted">{d.name} R1</dt>
              <dd className="text-fg">{R1_GROUP_LABEL[d.r1] ?? d.r1}</dd>
            </div>
          </dl>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted">Everything else against {nameOf(culprit)}</p>
        <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {others.map(({ b, r }) => {
            const s = crossStyle(r);
            return (
              <li key={b.id} className="flex min-w-0 items-center gap-2 text-sm">
                <span className={`inline-flex size-5 shrink-0 items-center justify-center rounded font-mono text-xs ${s.cell}`} aria-hidden="true">
                  {s.symbol}
                </span>
                <button
                  type="button"
                  onClick={() => setCandidate(b.id)}
                  className="min-w-0 truncate text-left text-fg hover:text-accent"
                  aria-label={`${b.name}: ${s.label}. Show details.`}
                >
                  {b.name}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted">
          {trayBetaLactams.length > 0 ? "Tray beta-lactams against the whole table" : "Culprit against the whole table (add a beta-lactam to the tray for more rows)"}
        </p>
        <Legend />
        <div className="max-w-full overflow-x-auto rounded-xl bg-bg-sunken p-2">
          <table className="border-separate border-spacing-0.5 text-xs" aria-label="Cross-reactivity matrix">
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 z-10 bg-bg-sunken px-1 text-left font-normal text-subtle">
                  <span className="sr-only">Row drug</span>
                </th>
                {BETA_LACTAMS.map((b) => (
                  <th key={b.id} scope="col" className="h-28 px-0 align-bottom font-normal text-muted">
                    <span className="inline-block whitespace-nowrap [writing-mode:vertical-rl] rotate-180">{b.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixRows.map((rowId) => (
                <tr key={rowId}>
                  <th scope="row" className="sticky left-0 z-10 whitespace-nowrap bg-bg-sunken pr-2 text-left font-normal text-fg">
                    {nameOf(rowId)}
                  </th>
                  {BETA_LACTAMS.map((b) => {
                    const r = crossReactivity(rowId, b.id);
                    const s = crossStyle(r);
                    return (
                      <td key={b.id} className="p-0">
                        <button
                          type="button"
                          title={`${nameOf(rowId)} vs ${b.name}: ${s.label}`}
                          aria-label={`${nameOf(rowId)} versus ${b.name}: ${s.label}`}
                          onClick={() => {
                            setCulprit(rowId);
                            setCandidate(b.id);
                          }}
                          className={`flex size-6 items-center justify-center rounded font-mono ${s.cell}`}
                        >
                          {s.symbol}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs leading-relaxed text-subtle">
          Carbapenems cross-react with penicillins in under 1% of skin-test-positive patients. Aztreonam shares its side
          chain only with ceftazidime (and cefiderocol). Cefazolin's R1 is unique.
        </p>
      </div>
    </section>
  );
}

/* ── Naranjo ──────────────────────────────────────────────────────────── */

const ANSWER_LABEL: Record<NaranjoAnswer, string> = { yes: "Yes", no: "No", unknown: "Don't know" };

function NaranjoSection() {
  const [answers, setAnswers] = useState<Record<string, NaranjoAnswer>>({});
  const r = naranjo(answers);
  return (
    <section className="space-y-4" aria-label="Naranjo ADR probability scale">
      <p className="text-sm leading-relaxed text-muted">
        Ten questions estimate how likely it is that a drug caused an adverse event. Unanswered questions count as
        don&apos;t know.
      </p>
      <ol className="space-y-3">
        {NARANJO_ITEMS.map((item, i) => {
          const current = answers[item.id] ?? "unknown";
          const qid = `naranjo-${item.id}`;
          return (
            <li key={item.id} className="space-y-2 rounded-xl bg-bg-sunken px-4 py-3">
              <p id={qid} className="text-sm text-fg">
                <span className="font-mono text-xs text-subtle">{i + 1}.</span> {item.question}
              </p>
              <div role="radiogroup" aria-labelledby={qid} className="flex flex-wrap gap-2">
                {(["yes", "no", "unknown"] as NaranjoAnswer[]).map((a) => {
                  const pts = item.points[a];
                  return (
                    <Button
                      key={a}
                      type="button"
                      size="sm"
                      role="radio"
                      aria-checked={current === a}
                      variant={current === a ? "default" : "outline"}
                      onClick={() => setAnswers((p) => ({ ...p, [item.id]: a }))}
                    >
                      {ANSWER_LABEL[a]}
                      <span className="font-mono text-xs opacity-70">{pts > 0 ? `+${pts}` : pts}</span>
                    </Button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>
      <div
        className="sticky bottom-2 flex flex-wrap items-center gap-2 rounded-xl bg-surface px-4 py-3 shadow-[var(--shadow-border)]"
        aria-live="polite"
      >
        <span className="whitespace-nowrap font-mono text-lg text-fg">{r.score} pts</span>
        <Badge tone={NARANJO_TONE[r.band]} className="whitespace-nowrap">
          {NARANJO_LABEL[r.band]}
        </Badge>
        <span className="text-xs text-subtle">≥9 definite · 5–8 probable · 1–4 possible · ≤0 doubtful</span>
        <Button type="button" size="sm" variant="ghost" className="ml-auto" onClick={() => setAnswers({})}>
          Reset
        </Button>
      </div>
    </section>
  );
}

/* ── Severe cutaneous reactions ───────────────────────────────────────── */

function ScarSection({ ids }: { ids: string[] }) {
  return (
    <section className="space-y-4" aria-label="Severe cutaneous adverse reactions">
      <div className="rounded-xl bg-danger-soft px-4 py-3">
        <p className="text-sm font-medium text-danger">{SCAR_RECHALLENGE_RULE}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {SCAR_PROFILES.map((p) => {
          const onTray = p.culpritIds.filter((id) => ids.includes(id));
          return (
            <article key={p.key} className="min-w-0 space-y-3 rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)]">
              <h4 className="font-serif text-base leading-snug text-fg">{p.name}</h4>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-muted">Latency</dt>
                  <dd className="text-fg">{p.latency}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Picture</dt>
                  <dd className="leading-relaxed text-fg">{p.features}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Usual culprits</dt>
                  <dd className="text-fg">{p.culpritNames.join(", ")}</dd>
                </div>
              </dl>
              {onTray.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs text-muted">On this tray</p>
                  <div className="flex flex-wrap gap-1">
                    {onTray.map((id) => (
                      <Badge key={id} tone="danger">
                        {nameOf(id)}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              {p.hla.length > 0 ? (
                <ul className="space-y-2">
                  {p.hla.map((h) => (
                    <li key={h.allele} className="rounded-lg bg-bg-sunken px-3 py-2 text-xs leading-relaxed">
                      <span className="font-mono text-accent">{h.allele}</span>{" "}
                      <span className="text-fg">{h.drugs}.</span> <span className="text-muted">{h.note}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="text-xs leading-relaxed text-subtle">{p.causalityTool}</p>
            </article>
          );
        })}
      </div>
      <div className="rounded-xl bg-bg-sunken px-4 py-3">
        <p className="text-xs text-muted">Sulfonamides</p>
        <p className="mt-1 text-sm leading-relaxed text-fg">{SULFONAMIDE_NOTE}</p>
      </div>
    </section>
  );
}

/* ── Panel ────────────────────────────────────────────────────────────── */

export function AllergyPanel({ ids, host }: { ids: string[]; host: HostContext }) {
  const report = allergyReportOnDesk(ids, host);
  const { detection } = report;
  const [section, setSection] = useState<Section>(
    detection.betaLactamIds.length > 0 ? "cross" : detection.scarRiskIds.length > 0 ? "scar" : "penfast",
  );

  return (
    <div className="min-w-0 space-y-5">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Allergy &amp; ADR</p>
        <h3 className="mt-1 font-serif text-lg tracking-tight text-fg">Allergy labels, cross-reactivity &amp; causality</h3>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          Sort a penicillin label by risk, check beta-lactam side chains, score a suspected reaction, and know the skin
          reactions that end the conversation.
        </p>
      </div>

      {detection.hasAllergyRelevant ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted">On this tray:</span>
          {detection.matchedIds.map((id) => (
            <Badge
              key={id}
              tone={detection.scarRiskIds.includes(id) ? "danger" : detection.betaLactamIds.includes(id) ? "accent" : "info"}
            >
              {nameOf(id)}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Allergy station section">
        {SECTIONS.map((s) => (
          <Button
            key={s.key}
            type="button"
            size="sm"
            variant={section === s.key ? "default" : "outline"}
            aria-pressed={section === s.key}
            onClick={() => setSection(s.key)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {section === "penfast" ? <PenFastSection /> : null}
      {section === "cross" ? <CrossSection trayBetaLactams={detection.betaLactamIds} /> : null}
      {section === "naranjo" ? <NaranjoSection /> : null}
      {section === "scar" ? <ScarSection ids={ids} /> : null}

      <footer className="space-y-3">
        {report.notes.length > 0 ? (
          <ul className="space-y-2" aria-label="Tray notes">
            {report.notes.map((n) => (
              <li key={n} className="text-sm leading-relaxed text-fg">
                {n}
              </li>
            ))}
          </ul>
        ) : null}
        <details className="rounded-xl bg-bg-sunken px-4 py-3">
          <summary className="cursor-pointer text-sm text-fg">Sources</summary>
          <ul className="mt-2 space-y-1">
            {report.citations.map((s) => (
              <li key={s} className="text-xs leading-relaxed text-subtle">
                {s}
              </li>
            ))}
          </ul>
        </details>
        <p className="text-xs leading-relaxed text-subtle">{ALLERGY_DISCLAIMER}</p>
      </footer>
    </div>
  );
}
