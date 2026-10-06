import { useId, useState } from "react";
import { Check, Copy, ExternalLink, Globe, MapPin, MessageSquareText, Phone } from "lucide-react";
import {
  EMERGENCY_LINE,
  NATIONAL_LINES,
  OUTSIDE_US,
  handoutText,
  localLinks,
  parseLocation,
  type HelpLink,
  type PhoneLine,
} from "@/lib/drugs/help-resources";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const GROUPS: ReadonlyArray<{ id: HelpLink["group"][]; title: string }> = [
  { id: ["treatment", "text"], title: "Treatment and referral" },
  { id: ["naloxone"], title: "Naloxone" },
  { id: ["local"], title: "Local support and harm reduction" },
  { id: ["meetings"], title: "Peer support meetings" },
];

function CallCard({ line }: { line: PhoneLine }) {
  return (
    <li
      className={cn(
        "flex flex-col rounded-xl px-4 py-4 shadow-[var(--shadow-border)] sm:px-5",
        line.urgent ? "bg-danger-soft" : "bg-surface",
      )}
    >
      <h3 className="font-serif text-lg tracking-tight text-fg">{line.name}</h3>
      <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-muted">{line.hours}</p>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-fg">{line.blurb}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
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
          <Badge tone="accent">Uses your location</Badge>
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

export function HelpPage() {
  const inputId = useId();
  const hintId = useId();
  const errId = useId();
  const [raw, setRaw] = useState("");
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");

  const loc = parseLocation(raw);
  const links = localLinks(loc);
  const invalid = loc.kind === "invalid";
  const located = loc.kind === "zip" || loc.kind === "place";

  async function copyHandout() {
    try {
      await navigator.clipboard.writeText(handoutText(loc));
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
    window.setTimeout(() => setCopied("idle"), 2400);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl bg-surface px-5 py-5 shadow-[var(--shadow-border)] sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Find help</p>
        <h2 className="mt-2 font-serif text-2xl tracking-tight text-fg">
          Addiction help near you. Free, confidential, no sign-up.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          For anyone: someone using, someone worried about a person who uses, or a clinician handing a
          patient a list. These are the official national lines and the government and peer finders for
          treatment, naloxone, and meetings. Reaching out is not a commitment to stop using.
        </p>
      </section>

      <section aria-labelledby="help-urgent">
        <h3 id="help-urgent" className="sr-only">
          If it is an emergency
        </h3>
        <ul className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <CallCard line={EMERGENCY_LINE} />
          <li className="rounded-xl bg-warn-soft px-4 py-4 sm:px-5">
            <p className="font-mono text-[11px] uppercase tracking-wide text-warn">While you wait for help</p>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-fg">
              <li>Stay with the person. Lay them on their side if they are not responding normally.</li>
              <li>Give naloxone (Narcan) if opioids may be involved. More than one dose is fine.</li>
              <li>Naloxone is safe to give even if you are not sure it is an opioid overdose.</li>
              <li>Tell the dispatcher what was taken, if you know.</li>
            </ul>
          </li>
        </ul>
      </section>

      <section aria-labelledby="help-lines" className="space-y-3">
        <h3 id="help-lines" className="font-serif text-xl tracking-tight text-fg">
          Talk to someone now
        </h3>
        <ul className="grid gap-3 sm:grid-cols-2">
          {NATIONAL_LINES.map((line) => (
            <CallCard key={line.id} line={line} />
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="help-where"
        className="rounded-xl bg-surface px-5 py-5 shadow-[var(--shadow-border)] sm:px-6"
      >
        <h3 id="help-where" className="flex items-center gap-2 font-serif text-xl tracking-tight text-fg">
          <MapPin className="size-5 text-accent" aria-hidden="true" />
          Where are you?
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,26rem)_auto] sm:items-end">
          <div>
            <label htmlFor={inputId} className="text-sm font-medium text-fg">
              ZIP code, or city and state
            </label>
            <Input
              id={inputId}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              maxLength={60}
              placeholder="98101 or Seattle, WA"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? `${hintId} ${errId}` : hintId}
              className="mt-1.5"
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => void copyHandout()}
            aria-label="Copy a plain-text handout with these numbers and links"
          >
            {copied === "ok" ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied === "ok" ? "Copied" : "Copy as handout"}
          </Button>
        </div>
        <p id={hintId} className="mt-2 max-w-2xl text-xs leading-relaxed text-muted">
          Private: what you type stays on this device. It is not saved and not sent to this site's
          servers. When you tap a link, only that link's own website sees it.
        </p>
        {invalid ? (
          <p id={errId} role="alert" className="mt-2 text-sm text-danger">
            Enter a 5-digit ZIP code, or a city and state such as "Seattle, WA".
          </p>
        ) : null}
        <p className="sr-only" role="status" aria-live="polite">
          {copied === "ok" ? "Handout copied to clipboard." : copied === "fail" ? "Could not copy." : ""}
        </p>
        {copied === "fail" ? (
          <p className="mt-2 text-sm text-danger">Could not copy automatically. Select the page text instead.</p>
        ) : null}
      </section>

      {GROUPS.map((g) => {
        const items = links.filter((l) => g.id.includes(l.group));
        if (!items.length) return null;
        return (
          <section key={g.title} aria-label={g.title} className="space-y-3">
            <h3 className="font-serif text-xl tracking-tight text-fg">{g.title}</h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {items.map((link) => (
                <ResourceCard key={link.id} link={link} />
              ))}
            </ul>
          </section>
        );
      })}

      {!located ? (
        <p className="rounded-lg bg-bg-sunken px-4 py-3 text-sm leading-relaxed text-muted">
          Add a ZIP code or city above and the treatment search opens already centered on you, and a
          one-tap text to SAMHSA appears for a ZIP.
        </p>
      ) : null}

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

      <p className="text-xs leading-relaxed text-muted">
        General information, not medical advice and not an endorsement of any program. This desk does not
        run these services and cannot see who contacts them. Numbers, hours, and links can change, so use
        each organization's own page to confirm. Treatment directories list licensed facilities but do not
        rate them: ask about medications for opioid use disorder (buprenorphine, methadone, naltrexone),
        cost, and whether they will take someone who is still using.
      </p>
    </div>
  );
}

