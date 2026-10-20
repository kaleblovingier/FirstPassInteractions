import { useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { PROGRAM_TIERS, type ProgramTier } from "@/lib/billing/programs";
import {
  HONEYPOT_FIELD,
  INQUIRY_LIMITS,
  inquiryMailto,
  validateInquiry,
  type InquiryErrors,
  type InquiryField,
  type InquiryResponse,
} from "@/lib/billing/program-inquiry";
import {
  DEFAULT_ESTIMATE_SEATS,
  discountLabel,
  FOR_PROGRAMS_AUDIENCES,
  FOR_PROGRAMS_COMPARISON,
  FOR_PROGRAMS_CTA,
  FOR_PROGRAMS_EMAIL,
  FOR_PROGRAMS_ESTIMATE_NOTE,
  FOR_PROGRAMS_FAQ,
  FOR_PROGRAMS_H1,
  FOR_PROGRAMS_HOW_CHECKED,
  FOR_PROGRAMS_WHAT_YOU_GET,
  FOR_PROGRAMS_INCLUDES,
  FOR_PROGRAMS_INTRO,
  FOR_PROGRAMS_KEY_STEPS,
  FOR_PROGRAMS_MAILTO,
  FOR_PROGRAMS_USERS,
  formatUsd,
  formatUsdCents,
  MAX_SEATS,
  parseSeats,
  PROGRAM_TYPES,
  programEstimate,
  seatsLabel,
  yearsLabel,
} from "@/lib/seo/for-programs";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PairDisclaimer } from "./pair-page";

type Years = 1 | 2 | 3;
const YEARS: readonly Years[] = [1, 2, 3];

const KICKER = "font-mono text-[11px] uppercase tracking-[0.2em] text-muted";
const H2 = "font-serif text-2xl tracking-tight text-fg";
const CARD = "rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]";
const FIELD = "min-h-[44px]";
const SELECT =
  "flex h-11 min-h-[44px] w-full cursor-pointer rounded-md bg-surface-2 px-3 text-sm text-fg shadow-[var(--shadow-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

function yearsOption(y: Years) {
  const off = discountLabel(y);
  return off ? `${yearsLabel(y)}, paid up front (${off})` : yearsLabel(y);
}

function toYears(raw: string): Years {
  const n = Number(raw);
  return n === 2 || n === 3 ? n : 1;
}

/* ---------------- page ---------------- */

export interface InquiryValues {
  name: string;
  email: string;
  organization: string;
  role: string;
  programType: string;
  seats: string;
  years: Years;
  start: string;
  message: string;
}

const EMPTY_INQUIRY: InquiryValues = {
  name: "",
  email: "",
  organization: "",
  role: "",
  programType: "",
  seats: "",
  years: 1,
  start: "",
  message: "",
};

export function ForProgramsView() {
  const [estSeats, setEstSeats] = useState(String(DEFAULT_ESTIMATE_SEATS));
  const [estYears, setEstYears] = useState<Years>(1);
  const [inquiry, setInquiry] = useState<InquiryValues>(EMPTY_INQUIRY);

  /** Carry the estimator's numbers into the form and move to it. */
  const askForQuote = () => {
    const seats = parseSeats(estSeats);
    setInquiry((v) => ({ ...v, seats: seats ? String(seats) : v.seats, years: estYears }));
    const first = document.getElementById("inq-name");
    first?.scrollIntoView({ block: "center" });
    first?.focus({ preventScroll: true });
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-xs text-muted">
        <a href="/pairs" className="underline">All pairs</a>
      </p>

      <header className="mt-4 max-w-2xl">
        <p className={KICKER}>Group and site licenses</p>
        <h1 className="mt-2 font-serif text-3xl tracking-tight text-fg sm:text-4xl">{FOR_PROGRAMS_H1}</h1>
        <p className="mt-3 text-sm leading-relaxed">{FOR_PROGRAMS_INTRO}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{FOR_PROGRAMS_USERS}</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <a href="#estimate" className={cn(buttonVariants(), "min-h-[44px]")}>
            Estimate your license
          </a>
          <a href="#inquiry" className={cn(buttonVariants({ variant: "secondary" }), "min-h-[44px]")}>
            Ask for a quote
          </a>
        </div>
      </header>

      <section className="mt-12 max-w-2xl" aria-labelledby="who-h">
        <h2 id="who-h" className={H2}>Who it's for</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {FOR_PROGRAMS_AUDIENCES.map((a) => (
            <li key={a.name}>
              <strong>{a.name}.</strong> {a.use}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 max-w-2xl" aria-labelledby="get-h">
        <h2 id="get-h" className={H2}>What your program gets</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {FOR_PROGRAMS_WHAT_YOU_GET.map((g) => (
            <li key={g.name}>
              <strong>{g.name}.</strong> {g.text}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 max-w-2xl" aria-labelledby="checked-h">
        <h2 id="checked-h" className={H2}>How it's checked</h2>
        <ul className="mt-3 space-y-2">
          {FOR_PROGRAMS_HOW_CHECKED.map((c) => (
            <li key={c} className="flex gap-2 text-sm">
              <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-accent" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="tiers" className="mt-12 scroll-mt-6" aria-labelledby="tiers-h">
        <h2 id="tiers-h" className={H2}>Licenses, billed yearly</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">Pick the size that covers everyone who will use it. Every tier gets the same tools.</p>
        <ul className="mt-5 grid gap-4 md:grid-cols-3">
          {PROGRAM_TIERS.map((t) => (
            <TierCard key={t.id} tier={t} />
          ))}
        </ul>
        <p data-testid="for-programs-comparison" className="mt-5 max-w-2xl rounded-lg bg-bg-sunken/60 px-4 py-3 text-sm">
          {FOR_PROGRAMS_COMPARISON}
        </p>
      </section>

      <section id="estimate" className="mt-12 scroll-mt-6" aria-labelledby="estimate-h">
        <h2 id="estimate-h" className={H2}>Estimate your license</h2>
        <Estimator seats={estSeats} years={estYears} onSeats={setEstSeats} onYears={setEstYears} onAsk={askForQuote} />
      </section>

      <div className="mt-12 grid gap-12 md:grid-cols-2">
        <section aria-labelledby="covers-h">
          <h2 id="covers-h" className={H2}>What every license covers</h2>
          <ul className="mt-3 space-y-2">
            {FOR_PROGRAMS_INCLUDES.map((s) => (
              <li key={s} className="flex gap-2 text-sm">
                <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-accent" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="key-h">
          <h2 id="key-h" className={H2}>How a program key works</h2>
          <ol className="mt-3 space-y-2 text-sm">
            {FOR_PROGRAMS_KEY_STEPS.map((s, i) => (
              <li key={s} className="flex gap-3">
                <span aria-hidden="true" className="font-mono text-xs leading-5 text-accent">
                  {i + 1}.
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section id="faq" className="mt-12 scroll-mt-6" aria-labelledby="faq-h">
        <h2 id="faq-h" className={H2}>Procurement questions</h2>
        <dl className="mt-4 grid gap-x-8 gap-y-5 md:grid-cols-2">
          {FOR_PROGRAMS_FAQ.map((f) => (
            <div key={f.q}>
              <dt className="text-sm font-semibold text-fg">{f.q}</dt>
              <dd className="mt-1 text-sm text-muted">
                {f.a}
                {f.link ? (
                  <>
                    {" "}
                    <a href={f.link.href} className="font-medium text-accent underline">
                      {f.link.label}
                    </a>
                    .
                  </>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="inquiry" className="mt-12 scroll-mt-6" aria-labelledby="inquiry-h">
        <h2 id="inquiry-h" className={H2}>Ask for a quote</h2>
        <p className="mt-2 max-w-2xl text-sm">
          Tell us your program, about how many people would use it, and when you'd like to start. We answer every inquiry by email.
        </p>
        <InquiryForm values={inquiry} onChange={setInquiry} />
        <p className="mt-4 text-sm">
          Rather write yourself?{" "}
          <a data-testid="for-programs-cta" href={FOR_PROGRAMS_MAILTO} className="font-medium text-accent underline">
            {FOR_PROGRAMS_CTA}
          </a>{" "}
          <span className="text-muted">at {FOR_PROGRAMS_EMAIL}.</span>
        </p>
      </section>

      <PairDisclaimer />
    </main>
  );
}

/* ---------------- tiers ---------------- */

function TierCard({ tier }: { tier: ProgramTier }) {
  return (
    <li
      data-testid={`tier-${tier.id}`}
      className={cn("flex flex-col", CARD, tier.highlighted && "ring-2 ring-accent")}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">{tier.name}</h3>
        {tier.highlighted ? (
          <span className="rounded-md bg-accent-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
            A good place to start
          </span>
        ) : null}
      </div>
      <p className="mt-2 font-mono text-3xl tabular-nums text-fg">
        {formatUsd(tier.annual)}
        <span className="ml-1 text-sm text-muted">per year</span>
      </p>
      <p className="mt-1 text-sm font-medium text-fg">{seatsLabel(tier)}</p>
      <p className="mt-2 text-sm leading-relaxed text-fg">{tier.tagline}</p>
      <p className="mt-2 text-xs text-muted">
        <span className="font-medium">Fits:</span> {tier.fits}
      </p>
      <ul className="mt-4 flex-1 space-y-2">
        {tier.features.map((f) => (
          <li key={f} className="flex gap-2 text-sm text-muted">
            <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-accent" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <a
        href="#inquiry"
        className={cn(buttonVariants({ variant: tier.highlighted ? "default" : "secondary" }), "mt-5 min-h-[44px] w-full")}
      >
        Ask about {tier.name}
      </a>
    </li>
  );
}

/* ---------------- estimator ---------------- */

function Estimator(props: {
  seats: string;
  years: Years;
  onSeats: (v: string) => void;
  onYears: (v: Years) => void;
  onAsk: () => void;
}) {
  return (
    <div className={cn("mt-4 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]", CARD)}>
      <div className="space-y-4">
        <div>
          <label htmlFor="est-seats" className="block text-sm font-medium text-fg">
            About how many people
          </label>
          <Input
            id="est-seats"
            inputMode="numeric"
            autoComplete="off"
            value={props.seats}
            aria-describedby="est-seats-hint"
            aria-invalid={parseSeats(props.seats) === null ? true : undefined}
            className={cn(FIELD, "mt-1")}
            onChange={(e) => props.onSeats(e.target.value)}
          />
          <p id="est-seats-hint" className="mt-1 text-xs text-muted">
            Learners, faculty and staff who will open the desk.
          </p>
        </div>
        <div>
          <label htmlFor="est-years" className="block text-sm font-medium text-fg">
            Term
          </label>
          <select
            id="est-years"
            value={props.years}
            className={cn(SELECT, "mt-1")}
            onChange={(e) => props.onYears(toYears(e.target.value))}
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {yearsOption(y)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <EstimateResult seatsInput={props.seats} years={props.years} />
        <button
          type="button"
          onClick={props.onAsk}
          className={cn(buttonVariants(), "mt-4 min-h-[44px] w-full cursor-pointer sm:w-auto")}
        >
          Ask for this quote
        </button>
      </div>
    </div>
  );
}

/** What the estimator shows for a typed seat count and term. Renders the same on the server and in the browser. */
export function EstimateResult({ seatsInput, years }: { seatsInput: string; years: Years }) {
  const seats = parseSeats(seatsInput);
  if (seats === null) {
    return (
      <div role="status" className="text-sm text-danger" data-testid="estimate">
        Enter a whole number of people from 1 to {MAX_SEATS.toLocaleString("en-US")}.
      </div>
    );
  }
  const e = programEstimate(seats, years);
  const off = discountLabel(years);
  return (
    <div role="status" data-testid="estimate">
      <p className="text-sm text-muted">
        For {e.seats.toLocaleString("en-US")} {e.seats === 1 ? "person" : "people"}, {yearsLabel(years)}:
      </p>
      <p className="mt-1 font-serif text-2xl tracking-tight text-fg">
        <span data-testid="estimate-tier">{e.tier.name}</span> license
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Stat label={`Total for ${yearsLabel(years)}`} value={formatUsd(e.total)} note={off} testId="estimate-total" />
        <Stat label="Per year" value={formatUsd(e.perYear)} testId="estimate-per-year" />
        <Stat label="Per seat per year" value={formatUsdCents(e.perSeatPerYear)} testId="estimate-per-seat" />
        <Stat label="Seats" value={seatsLabel(e.tier)} words />
      </dl>
      {e.foundingTotal !== null ? (
        <p className="mt-3 text-xs text-muted" data-testid="estimate-founding">
          For {e.seats === 1 ? "one person" : `${e.seats} people`}, Founding at {formatUsd(e.foundingTotal / e.seats)} once each comes to{" "}
          {formatUsd(e.foundingTotal)}, less than a year of {e.tier.name}.
        </p>
      ) : null}
      <p className="mt-3 text-xs font-medium text-fg">{FOR_PROGRAMS_ESTIMATE_NOTE}</p>
    </div>
  );
}

function Stat(props: { label: string; value: string; note?: string; testId?: string; words?: boolean }) {
  const { label, value, note, testId, words } = props;
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={cn("mt-0.5 text-fg", words ? "text-sm" : "font-mono tabular-nums")} data-testid={testId}>
        {value}
        {note ? (
          <>
            {" "}
            <span className="font-sans text-xs text-accent">{note}</span>
          </>
        ) : null}
      </dd>
    </div>
  );
}

/* ---------------- inquiry form ---------------- */

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; message: string }
  | { kind: "invalid"; message: string }
  | { kind: "fallback"; message: string; mailto: string };

const FIELD_ORDER: InquiryField[] = ["name", "email", "organization", "role", "programType", "seats", "years", "start", "message"];

const FIELD_LABEL: Record<InquiryField, string> = {
  name: "Name",
  email: "Work email",
  organization: "Organization",
  role: "Role",
  programType: "Program type",
  seats: "Approximate seats",
  years: "Term",
  start: "Desired start",
  message: "Message",
};

export function InquiryForm({ values, onChange }: { values: InquiryValues; onChange: (v: InquiryValues) => void }) {
  const [errors, setErrors] = useState<InquiryErrors>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const honeypot = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const busy = status.kind === "sending";

  const set = (field: keyof InquiryValues) => (value: string) => {
    onChange({ ...values, [field]: field === "years" ? toYears(value) : value });
    if (errors[field as InquiryField]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const settle = (next: Status, nextErrors: InquiryErrors = {}) => {
    setErrors(nextErrors);
    setStatus(next);
    const firstBad = FIELD_ORDER.find((f) => nextErrors[f]);
    // Move focus to the first bad field, or to the result, so keyboard and
    // screen-reader users land on what changed.
    window.setTimeout(() => {
      if (firstBad) document.getElementById(`inq-${firstBad}`)?.focus();
      else (next.kind === "invalid" ? alertRef : statusRef).current?.focus();
    }, 0);
  };

  async function submit() {
    const checked = validateInquiry(values);
    if (!checked.ok) {
      settle({ kind: "invalid", message: "Check the fields marked below." }, checked.errors);
      return;
    }
    const mailto = inquiryMailto(checked.data);
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/programs/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, [HONEYPOT_FIELD]: honeypot.current?.value ?? "" }),
      });
      const data = (await res.json().catch(() => null)) as InquiryResponse | null;
      if (res.ok) {
        onChange(EMPTY_INQUIRY);
        settle({ kind: "sent", message: data?.message || "Thanks. Your inquiry is in." });
      } else if (res.status === 400 && data?.errors) {
        settle({ kind: "invalid", message: data.message || "Check the fields marked below." }, data.errors);
      } else {
        settle({ kind: "fallback", message: data?.message || "We couldn't send that just now. Use the email link below.", mailto });
      }
    } catch {
      settle({ kind: "fallback", message: "Could not reach the desk. Use the email link below. It has your inquiry filled in.", mailto });
    }
  }

  const errorIds = (f: InquiryField, hint?: string) =>
    [hint, errors[f] ? `inq-${f}-error` : undefined].filter(Boolean).join(" ") || undefined;
  const fieldProps = (f: InquiryField, hint?: string) => ({
    id: `inq-${f}`,
    name: f,
    "aria-invalid": errors[f] ? true : undefined,
    "aria-describedby": errorIds(f, hint),
  });

  return (
    <form
      noValidate
      aria-labelledby="inquiry-h"
      aria-busy={busy}
      className={cn("mt-4 max-w-3xl", CARD)}
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) void submit();
      }}
    >
      {/* Two live regions that are always in the DOM, so screen readers hear what changes in them. */}
      <div
        ref={alertRef}
        tabIndex={-1}
        role="alert"
        className={cn(status.kind === "invalid" ? "mb-5 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger" : "sr-only", "focus:outline-none")}
        data-testid="inquiry-alert"
      >
        {status.kind === "invalid" ? (
          <>
            <p>{status.message}</p>
            <ul className="mt-2 list-disc space-y-0.5 pl-5">
              {FIELD_ORDER.filter((f) => errors[f]).map((f) => (
                <li key={f}>
                  <a href={`#inq-${f}`} className="underline">
                    {FIELD_LABEL[f]}: {errors[f]}
                  </a>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
      <div
        ref={statusRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className={cn(
          status.kind === "sent" || status.kind === "fallback" ? "mb-5 rounded-lg px-4 py-3 text-sm" : "sr-only",
          status.kind === "sent" && "bg-ok-soft text-ok",
          status.kind === "fallback" && "bg-warn-soft text-fg",
          "focus:outline-none",
        )}
        data-testid="inquiry-status"
      >
        {status.kind === "sending" ? "Sending…" : null}
        {status.kind === "sent" || status.kind === "fallback" ? <p>{status.message}</p> : null}
        {status.kind === "fallback" ? (
          <a href={status.mailto} data-testid="inquiry-mailto" className={cn(buttonVariants(), "mt-3 min-h-[44px] w-full sm:w-auto")}>
            Email this inquiry instead
          </a>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" f="name" errors={errors}>
          <Input {...fieldProps("name")} autoComplete="name" aria-required="true" maxLength={INQUIRY_LIMITS.name} className={cn(FIELD, "mt-1")} value={values.name} onChange={(e) => set("name")(e.target.value)} />
        </Field>
        <Field label="Work email" f="email" errors={errors}>
          <Input {...fieldProps("email")} type="email" autoComplete="email" aria-required="true" maxLength={INQUIRY_LIMITS.email} className={cn(FIELD, "mt-1")} value={values.email} onChange={(e) => set("email")(e.target.value)} />
        </Field>
        <Field label="Organization" f="organization" errors={errors}>
          <Input {...fieldProps("organization")} autoComplete="organization" aria-required="true" maxLength={INQUIRY_LIMITS.organization} className={cn(FIELD, "mt-1")} value={values.organization} onChange={(e) => set("organization")(e.target.value)} />
        </Field>
        <Field label="Role" f="role" optional errors={errors}>
          <Input {...fieldProps("role")} autoComplete="organization-title" placeholder="Course director, clinic manager…" maxLength={INQUIRY_LIMITS.role} className={cn(FIELD, "mt-1")} value={values.role} onChange={(e) => set("role")(e.target.value)} />
        </Field>
        <Field label="Program type" f="programType" errors={errors}>
          <select {...fieldProps("programType")} aria-required="true" className={cn(SELECT, "mt-1")} value={values.programType} onChange={(e) => set("programType")(e.target.value)}>
            <option value="">Choose one</option>
            {PROGRAM_TYPES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Approximate seats" f="seats" errors={errors} hint="inq-seats-hint" hintText="About how many people will use the key.">
          <Input {...fieldProps("seats", "inq-seats-hint")} inputMode="numeric" autoComplete="off" aria-required="true" maxLength={9} className={cn(FIELD, "mt-1")} value={values.seats} onChange={(e) => set("seats")(e.target.value)} />
        </Field>
        <Field label="Term" f="years" errors={errors}>
          <select {...fieldProps("years")} className={cn(SELECT, "mt-1")} value={values.years} onChange={(e) => set("years")(e.target.value)}>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {yearsOption(y)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Desired start" f="start" optional errors={errors}>
          <Input {...fieldProps("start")} autoComplete="off" placeholder="Spring 2027" maxLength={INQUIRY_LIMITS.start} className={cn(FIELD, "mt-1")} value={values.start} onChange={(e) => set("start")(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Message" f="message" optional errors={errors}>
            <textarea
              {...fieldProps("message")}
              rows={5}
              maxLength={INQUIRY_LIMITS.message}
              placeholder="Courses, sites, purchase-order steps, anything we should know."
              className="mt-1 block w-full rounded-md bg-surface-2 px-3 py-2 text-sm text-fg shadow-[var(--shadow-border)] placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              value={values.message}
              onChange={(e) => set("message")(e.target.value)}
            />
          </Field>
        </div>
      </div>

      {/* Honeypot. Hidden from people and screen readers; bots that fill it are dropped. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor={`inq-${HONEYPOT_FIELD}`}>Leave this empty</label>
        <input ref={honeypot} id={`inq-${HONEYPOT_FIELD}`} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          aria-disabled={busy}
          className={cn(buttonVariants(), "min-h-[44px] w-full cursor-pointer aria-disabled:cursor-not-allowed aria-disabled:opacity-40 sm:w-auto")}
        >
          {busy ? "Sending…" : "Send inquiry"}
        </button>
        <p className="text-xs text-muted">This is emailed to the FirstPass inbox and isn't saved in a site database.</p>
      </div>
      <p className="mt-2 text-xs text-muted" data-testid="form-legal-note">
        Don't include patient information. See the <a href="/privacy" className="underline">privacy policy</a> and{" "}
        <a href="/terms" className="underline">terms</a>.
      </p>
    </form>
  );
}

function Field(props: {
  label: string;
  f: InquiryField;
  errors: InquiryErrors;
  optional?: boolean;
  hint?: string;
  hintText?: string;
  children: ReactNode;
}) {
  const err = props.errors[props.f];
  return (
    <div className="min-w-0">
      <label htmlFor={`inq-${props.f}`} className="block text-sm font-medium text-fg">
        {props.label}
        {props.optional ? <span className="ml-1 font-normal text-muted">(optional)</span> : null}
      </label>
      {props.children}
      {props.hint && props.hintText ? (
        <p id={props.hint} className="mt-1 text-xs text-muted">
          {props.hintText}
        </p>
      ) : null}
      {err ? (
        <p id={`inq-${props.f}-error`} className="mt-1 text-xs font-medium text-danger">
          {err}
        </p>
      ) : null}
    </div>
  );
}
