import { useId, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Globe,
  HeartHandshake,
  MapPin,
  MessageSquareText,
  Phone,
  Pill,
  ShieldAlert,
} from "lucide-react";
import {
  EMERGENCY_LINE,
  MEDICATION_OPTIONS,
  NATIONAL_LINES,
  OUTSIDE_US,
  STATE_RESOURCES,
  STREET_SAFETY_PROTOCOL,
  findTreatmentUrl,
  handoutText,
  localLinks,
  parseLocation,
  resolveState,
  type HelpLink,
  type PhoneLine,
  type StateResource,
} from "@/lib/drugs/help-resources";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const GROUPS: ReadonlyArray<{ id: HelpLink["group"][]; title: string; subtitle: string }> = [
  {
    id: ["treatment", "text"],
    title: "Treatment & clinical care",
    subtitle: "State-licensed programs, outpatient medical clinics, and SAMHSA-certified centers.",
  },
  {
    id: ["naloxone"],
    title: "Naloxone (overdose reversal)",
    subtitle: "Nasal spray that reverses opioid overdoses; free mail delivery and pharmacy standing orders.",
  },
  {
    id: ["local"],
    title: "Local support & harm reduction",
    subtitle: "Community navigators, food and housing assistance, and safer-use supplies without stigma.",
  },
  {
    id: ["meetings"],
    title: "Peer recovery meetings",
    subtitle: "Free community support groups meeting in-person and online across all 50 states.",
  },
];

function CallCard({ line }: { line: PhoneLine }) {
  return (
    <li
      className={cn(
        "flex flex-col rounded-xl px-4 py-4 shadow-[var(--shadow-border)] sm:px-5",
        line.urgent ? "bg-danger-soft" : "bg-surface",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-serif text-lg tracking-tight text-fg">{line.name}</h3>
        {line.urgent ? <Badge tone="danger">Emergency</Badge> : <Badge tone="accent">Confidential</Badge>}
      </div>
      <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-muted">{line.hours}</p>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-fg">{line.blurb}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <a
          href={line.tel}
          className={buttonVariants({ variant: line.urgent ? "danger" : "default", size: "default" })}
          aria-label={`Call ${line.name}, ${line.display}`}
        >
          <Phone className="size-4" aria-hidden="true" />
          {line.display}
        </a>
        {line.source ? (
          <a
            href={line.source}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-1 font-mono text-[11px] text-accent hover:underline"
          >
            {line.sourceLabel} <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </li>
  );
}

function ResourceCard({ link }: { link: HelpLink }) {
  const external = link.href.startsWith("https://");
  const Icon = link.href.startsWith("tel:") ? Phone : link.href.startsWith("sms:") ? MessageSquareText : ExternalLink;
  return (
    <li className="flex flex-col rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)] sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="font-serif text-lg tracking-tight text-fg">{link.title}</h4>
        {link.prefilled ? (
          <Badge tone="accent">Centered on your location</Badge>
        ) : (
          <Badge>Search by location on their site</Badge>
        )}
      </div>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{link.blurb}</p>
      <div className="mt-3">
        <a
          href={link.href}
          {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
          className={buttonVariants({ variant: link.prefilled ? "default" : "secondary", size: "default" })}
        >
          <Icon className="size-4" aria-hidden="true" />
          {link.action}
        </a>
      </div>
    </li>
  );
}

function StateHighlightCard({ state, locationQuery }: { state: StateResource; locationQuery: string }) {
  return (
    <div className="rounded-xl border border-accent/30 bg-surface-2 p-5 shadow-[var(--shadow-border)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
            Official State Resource · {state.name} ({state.code})
          </p>
          <h4 className="mt-1 font-serif text-2xl tracking-tight text-fg">{state.helplineName}</h4>
        </div>
        <Badge tone="accent">24/7 State Access</Badge>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-fg">{state.description}</p>

      {state.textInfo ? (
        <p className="mt-2 font-mono text-xs text-muted">
          <span className="font-semibold text-fg">Text support:</span> {state.textInfo}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={state.tel}
          className={buttonVariants({ variant: "default", size: "default" })}
          aria-label={`Call ${state.helplineName} at ${state.phone}`}
        >
          <Phone className="size-4" aria-hidden="true" />
          Call {state.phone}
        </a>

        {state.naloxoneUrl ? (
          <a
            href={state.naloxoneUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "secondary", size: "default" })}
          >
            <HeartHandshake className="size-4" aria-hidden="true" />
            Free naloxone in {state.name}
          </a>
        ) : null}

        <a
          href={state.website}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "outline", size: "default" })}
        >
          <ExternalLink className="size-4" aria-hidden="true" />
          State recovery website
        </a>
      </div>

      <div className="mt-4 rounded-lg bg-bg-sunken px-3.5 py-2.5 text-xs leading-relaxed text-muted">
        <span className="font-medium text-fg">Why state helplines matter:</span> State call centers track open
        inpatient and detox beds across {state.name}, coordinate Medicaid or county-funded treatment for the
        uninsured, and can dispatch local mobile crisis teams.
        {locationQuery ? (
          <> Searching near <span className="font-medium text-fg">{locationQuery}</span>.</>
        ) : null}
      </div>
    </div>
  );
}

export function HelpPage() {
  const inputId = useId();
  const selectId = useId();
  const hintId = useId();
  const errId = useId();
  const [raw, setRaw] = useState("");
  const [selectedStateCode, setSelectedStateCode] = useState("");
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");
  const [activeTab, setActiveTab] = useState<"directory" | "medications" | "safety">("directory");

  const loc = useMemo(() => parseLocation(raw), [raw]);
  const detectedState = useMemo(() => resolveState(loc), [loc]);

  const activeState = useMemo(() => {
    if (selectedStateCode) {
      return STATE_RESOURCES.find((s) => s.code === selectedStateCode) ?? null;
    }
    return detectedState;
  }, [selectedStateCode, detectedState]);

  const effectiveLoc = useMemo(() => {
    if (loc.kind === "zip" || loc.kind === "place") return loc;
    if (activeState) return parseLocation(activeState.name);
    return loc;
  }, [loc, activeState]);

  const links = useMemo(() => localLinks(effectiveLoc), [effectiveLoc]);
  const invalid = loc.kind === "invalid";
  const located = loc.kind === "zip" || loc.kind === "place" || Boolean(activeState);

  async function copyHandout() {
    try {
      await navigator.clipboard.writeText(handoutText(effectiveLoc));
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
    window.setTimeout(() => setCopied("idle"), 2400);
  }

  function handleStateSelect(code: string) {
    setSelectedStateCode(code);
    if (code && !raw.trim()) {
      const st = STATE_RESOURCES.find((s) => s.code === code);
      if (st) setRaw(st.name);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <section className="rounded-xl bg-surface px-5 py-5 shadow-[var(--shadow-border)] sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Crisis & Addiction Support</p>
        <h2 className="mt-2 font-serif text-2xl tracking-tight text-fg sm:text-3xl">
          Addiction help near you. Free, confidential, no sign-up.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          For people who use substances, family members and loved ones, and healthcare providers preparing
          discharge or after-care plans. Reaching out does not require a commitment to stop using.
          Free phone helplines, local medical treatment locators, free mail-order naloxone, and peer meetings.
        </p>
      </section>

      {/* Emergency / Critical safety banner */}
      <section aria-labelledby="help-urgent">
        <h3 id="help-urgent" className="sr-only">
          If it is an emergency
        </h3>
        <ul className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <CallCard line={EMERGENCY_LINE} />
          <li className="flex flex-col justify-between rounded-xl bg-warn-soft px-4 py-4 sm:px-5">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-warn" aria-hidden="true" />
                <p className="font-mono text-[11px] uppercase tracking-wide text-warn">
                  Overdose response · Seconds count
                </p>
              </div>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-fg">
                <li>
                  <span className="font-semibold">Call 911 immediately</span> if someone is unresponsive,
                  gurgling, or turning pale/blue.
                </li>
                <li>
                  <span className="font-semibold">Give naloxone (Narcan)</span> into the nose right away. Repeat
                  after 2–3 minutes if they don't wake up.
                </li>
                <li>
                  <span className="font-semibold">Provide rescue breaths</span> (1 breath every 5 seconds) if
                  breathing remains shallow or absent.
                </li>
                <li>
                  <span className="font-semibold">Naloxone will not hurt</span> someone who did not take an
                  opioid. When in doubt, give it.
                </li>
              </ul>
            </div>
            <p className="mt-3 text-xs text-muted">
              Most states have Good Samaritan laws protecting 911 callers and overdose bystanders from drug charges.
            </p>
          </li>
        </ul>
      </section>

      {/* Talk to someone now: national hotlines */}
      <section aria-labelledby="help-lines" className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 id="help-lines" className="font-serif text-xl tracking-tight text-fg">
            Talk to someone now (24/7 national lines)
          </h3>
          <span className="font-mono text-xs text-muted">Free · Confidential · Peer & Clinical</span>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {NATIONAL_LINES.map((line) => (
            <CallCard key={line.id} line={line} />
          ))}
        </ul>
      </section>

      {/* Location-based finder */}
      <section
        aria-labelledby="help-where"
        className="rounded-xl bg-surface px-5 py-5 shadow-[var(--shadow-border)] sm:px-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 id="help-where" className="flex items-center gap-2 font-serif text-xl tracking-tight text-fg">
              <MapPin className="size-5 text-accent" aria-hidden="true" />
              Where are you located?
            </h3>
            <p className="mt-1 text-sm text-muted">
              Connect with your official state addiction helpline, local treatment facilities, and free naloxone.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => void copyHandout()}
            aria-label="Copy a printable handout with local state lines, national hotlines, and treatment directories"
            className="shrink-0"
          >
            {copied === "ok" ? (
              <Check className="size-4 text-ok" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            {copied === "ok" ? "Copied patient handout" : "Copy as clinical handout"}
          </Button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={inputId} className="block text-sm font-medium text-fg">
              Enter 5-digit ZIP code or City, State
            </label>
            <Input
              id={inputId}
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value);
                setSelectedStateCode("");
              }}
              maxLength={60}
              placeholder="e.g. 98101 or Seattle, WA"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? `${hintId} ${errId}` : hintId}
              className="mt-1.5"
            />
          </div>

          <div>
            <label htmlFor={selectId} className="block text-sm font-medium text-fg">
              Or choose a state / territory
            </label>
            <div className="relative mt-1.5">
              <select
                id={selectId}
                value={activeState?.code ?? ""}
                onChange={(e) => handleStateSelect(e.target.value)}
                className="flex h-11 w-full appearance-none rounded-md bg-surface-2 px-3 pr-8 text-sm text-fg shadow-[var(--shadow-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <option value="">— Select a state or territory —</option>
                {STATE_RESOURCES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        <p id={hintId} className="mt-2 text-xs leading-relaxed text-muted">
          <span className="font-semibold text-fg">Privacy guarantee:</span> What you type stays on this device.
          No search terms or locations are ever sent to our servers or stored in cookies. Outbound links go
          directly to official federal and state websites.
        </p>

        {invalid ? (
          <p id={errId} role="alert" className="mt-2 text-sm text-danger">
            Please enter a valid 5-digit ZIP code or city and state (e.g. "Seattle, WA").
          </p>
        ) : null}

        <p className="sr-only" role="status" aria-live="polite">
          {copied === "ok" ? "Clinical handout copied to clipboard." : copied === "fail" ? "Could not copy." : ""}
        </p>
        {copied === "fail" ? (
          <p className="mt-2 text-sm text-danger">
            Could not copy automatically. Select the text on the page to copy manually.
          </p>
        ) : null}

        {/* Featured State Resource Card */}
        {activeState ? (
          <div className="mt-5">
            <StateHighlightCard state={activeState} locationQuery={loc.query} />
          </div>
        ) : null}
      </section>

      {/* Navigation tabs for Directory, Medication Guide, and Safety Protocol */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("directory")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === "directory"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-fg",
          )}
        >
          <MapPin className="size-4" aria-hidden="true" />
          Local treatment & programs
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("medications")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === "medications"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-fg",
          )}
        >
          <Pill className="size-4" aria-hidden="true" />
          Medication options (MOUD / MAT)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("safety")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === "safety"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-fg",
          )}
        >
          <ShieldAlert className="size-4" aria-hidden="true" />
          Fentanyl & Xylazine overdose protocol
        </button>
      </div>

      {/* TAB 1: Resource Directory */}
      {activeTab === "directory" ? (
        <div className="space-y-6">
          {GROUPS.map((g) => {
            const items = links.filter((l) => g.id.includes(l.group));
            if (!items.length) return null;
            return (
              <section key={g.title} aria-label={g.title} className="space-y-3">
                <div>
                  <h3 className="font-serif text-xl tracking-tight text-fg">{g.title}</h3>
                  <p className="text-xs text-muted">{g.subtitle}</p>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {items.map((link) => (
                    <ResourceCard key={link.id} link={link} />
                  ))}
                </ul>
              </section>
            );
          })}

          {!located ? (
            <div className="rounded-lg bg-bg-sunken px-4 py-3 text-sm leading-relaxed text-muted">
              <span className="font-medium text-fg">Tip:</span> Enter your ZIP code or choose your state above
              to see your state's direct 24/7 recovery line, certified inpatient bed navigators, and free
              mail-order naloxone portal.
            </div>
          ) : null}
        </div>
      ) : null}

      {/* TAB 2: Medication Options (MOUD / MAT) */}
      {activeTab === "medications" ? (
        <section aria-labelledby="medications-heading" className="space-y-4">
          <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
            <h3 id="medications-heading" className="font-serif text-2xl tracking-tight text-fg">
              Medications for Opioid & Alcohol Use Disorder
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Medications for Opioid Use Disorder (MOUD / MAT) reduce mortality by more than 50%, cut cravings,
              and normalize brain chemistry so individuals can rebuild their lives. Under the federal MAT Act, any
              DEA-licensed clinician (MD, DO, NP, PA) can prescribe buprenorphine without special waivers.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {MEDICATION_OPTIONS.map((med) => (
              <div
                key={med.id}
                className="flex flex-col rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-1">
                  <h4 className="font-serif text-lg font-medium text-fg">{med.name}</h4>
                  <Badge tone="accent">{med.type}</Badge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-fg">{med.howItWorks}</p>
                <div className="mt-3 flex-1 space-y-2 rounded-lg bg-bg-sunken p-3 text-xs leading-relaxed">
                  <p>
                    <span className="font-semibold text-fg">Where to get it:</span> {med.setting}
                  </p>
                  <p>
                    <span className="font-semibold text-fg">Clinical note:</span> {med.pearls}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-accent-soft p-4 text-xs leading-relaxed text-ink">
            <span className="font-semibold">Taking medications is not "replacing one drug with another":</span> Medical
            evidence across decades proves that MOUD saves lives, prevents fatal overdoses, cuts HIV/HCV transmission,
            and restores cognitive and emotional stability.
          </div>
        </section>
      ) : null}

      {/* TAB 3: Street Supply Overdose Safety & Protocol */}
      {activeTab === "safety" ? (
        <section aria-labelledby="safety-heading" className="space-y-4">
          <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
            <h3 id="safety-heading" className="font-serif text-2xl tracking-tight text-fg">
              Overdose Response & Street Supply Realities
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Today's street supply contains high-potency synthetic opioids (fentanyl, carfentanil, nitazenes)
              frequently mixed with non-opioid adulterants like xylazine ("tranq") and counterfeit pressed benzodiazepines.
            </p>
          </div>

          <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
            <h4 className="font-serif text-lg tracking-tight text-fg">Emergency Overdose Steps</h4>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {STREET_SAFETY_PROTOCOL.map((item) => (
                <div key={item.step} className="rounded-lg bg-surface-2 p-4 shadow-[var(--shadow-border)]">
                  <p className="font-mono text-xs uppercase tracking-wide text-accent">{item.step}</p>
                  <p className="mt-2 text-sm leading-relaxed text-fg">{item.action}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
              <h4 className="font-serif text-lg tracking-tight text-fg">Xylazine ("Tranq") Specifics</h4>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
                <li>
                  <span className="font-semibold text-fg">Naloxone will NOT wake someone from xylazine:</span> It
                  reverses the fentanyl component, restoring automatic breathing. Heavy sedation may persist for hours.
                </li>
                <li>
                  <span className="font-semibold text-fg">Rescue breathing is paramount:</span> If their chest is not
                  rising and falling every 5 seconds, breathe for them using a pocket mask or standard CPR rescue breaths.
                </li>
                <li>
                  <span className="font-semibold text-fg">Severe necrotic wounds:</span> Xylazine causes severe skin
                  ulcers anywhere on the body, not just at injection sites. Treat with clean water, soap, and non-stick dressings.
                </li>
              </ul>
            </div>

            <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
              <h4 className="font-serif text-lg tracking-tight text-fg">Never Use Alone (1-800-484-3731)</h4>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Most fatal overdoses happen when people use drugs alone with no one to administer naloxone or call 911.
              </p>
              <div className="mt-3 rounded-lg bg-bg-sunken p-3 text-xs leading-relaxed text-fg">
                <p className="font-semibold">How it works:</p>
                <ol className="mt-1 list-decimal space-y-1 pl-4 text-muted">
                  <li>Call 1-800-484-3731 before taking any dose.</li>
                  <li>Give the operator your physical location (held confidentially).</li>
                  <li>They stay on the line with you in a friendly, zero-judgment chat.</li>
                  <li>If you become unresponsive, they immediately alert EMS to your address.</li>
                </ol>
              </div>
              <div className="mt-3">
                <a
                  href="tel:18004843731"
                  className={buttonVariants({ variant: "default", size: "sm" })}
                >
                  <Phone className="size-3.5" aria-hidden="true" />
                  Call Never Use Alone (1-800-484-3731)
                </a>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Outside the US directory */}
      <section className="rounded-xl bg-surface px-4 py-4 shadow-[var(--shadow-border)] sm:px-5">
        <h3 className="flex items-center gap-2 font-serif text-lg tracking-tight text-fg">
          <Globe className="size-4 text-accent" aria-hidden="true" />
          {OUTSIDE_US.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{OUTSIDE_US.blurb}</p>
        <a
          href={OUTSIDE_US.href}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ variant: "secondary" }), "mt-3")}
        >
          <ExternalLink className="size-4" aria-hidden="true" />
          {OUTSIDE_US.action}
        </a>
      </section>

      {/* Regulatory & Disclaimer footnote */}
      <p className="text-xs leading-relaxed text-muted">
        FirstPass is an educational pharmacology resource, not a healthcare provider or emergency service.
        Directories list public and state-licensed facilities; they are not ratings or guarantees. When contacting
        treatment centers, ask about medication options (MOUD), costs, sliding-scale fees, and whether they accept
        people who are actively using or have co-occurring mental health conditions.
      </p>
    </div>
  );
}
