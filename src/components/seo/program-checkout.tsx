import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import {
  CARD_TIERS,
  claimProgramCheckout,
  isCardTier,
  startProgramCheckout,
  type CardTier,
} from "@/lib/billing/program-checkout";
import { formatEndDay } from "@/lib/billing/program-license";
import { PROGRAM_TIER_BY_ID } from "@/lib/billing/programs";
import { formatUsd, FOR_PROGRAMS_EMAIL } from "@/lib/seo/for-programs";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const CARD = "rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]";
const FIELD = "min-h-[44px]";
const SELECT =
  "flex h-11 min-h-[44px] w-full cursor-pointer rounded-md bg-surface-2 px-3 text-sm text-fg shadow-[var(--shadow-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

type ClaimState =
  | { kind: "none" }
  | { kind: "claiming" }
  | { kind: "canceled" }
  | { kind: "failed"; reason: string }
  | { kind: "done"; key: string; tier: CardTier; org: string; endsAt: string; email: string; mailed: boolean };

type ClaimResult =
  | { ok: true; key: string; tier: CardTier; org: string; endsAt: string; email: string; mailed: boolean }
  | { ok: false; reason: string };

async function claimWithRetry(sessionId: string): Promise<ClaimResult> {
  let last: ClaimResult = { ok: false, reason: "Could not verify the payment." };
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (attempt > 0) await new Promise((r) => window.setTimeout(r, 1500 * attempt));
    try {
      last = (await claimProgramCheckout({ data: { sessionId } })) as ClaimResult;
    } catch {
      last = { ok: false, reason: "Could not reach the desk." };
    }
    if (last.ok) return last;
    if (!/not cleared|could not (read|reach|verify)/i.test(last.reason)) return last;
  }
  return last;
}

/** Reads ?fp_program=<session> once after Stripe sends the buyer back, and claims the key. */
function useProgramReturn(): ClaimState {
  const [state, setState] = useState<ClaimState>({ kind: "none" });
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current || typeof window === "undefined") return;
    ran.current = true;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("fp_program");
    const canceled = params.get("fp_program_cancel");
    if (!sessionId && !canceled) return;
    const clean = () => {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("fp_program");
        url.searchParams.delete("fp_program_cancel");
        const q = url.searchParams.toString();
        window.history.replaceState({}, "", url.pathname + (q ? `?${q}` : "") + url.hash);
      } catch {
        /* keep the URL */
      }
    };
    if (canceled && !sessionId) {
      clean();
      setState({ kind: "canceled" });
      return;
    }
    setState({ kind: "claiming" });
    void claimWithRetry(sessionId ?? "").then((res) => {
      clean();
      setState(res.ok ? { kind: "done", ...res } : { kind: "failed", reason: res.reason });
      window.setTimeout(() => document.getElementById("program-checkout")?.scrollIntoView({ block: "start" }), 0);
    });
  }, []);
  return state;
}

function KeyPanel({ state }: { state: Extract<ClaimState, { kind: "done" }> }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(state.key);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the key is selectable */
    }
  };
  const tier = PROGRAM_TIER_BY_ID[state.tier];
  return (
    <div className={cn("mt-4", CARD)} data-testid="program-key-panel">
      <p className="text-sm font-semibold text-fg">
        Paid. Here is the {tier.name} program key for {state.org}.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div
          className="flex-1 overflow-x-auto rounded-lg bg-bg-sunken px-3 py-2.5 font-mono text-sm font-bold text-fg select-all break-all"
          tabIndex={0}
          role="region"
          aria-label="Program key"
          data-testid="program-key"
        >
          {state.key}
        </div>
        <button
          type="button"
          onClick={() => void copy()}
          className={cn(buttonVariants({ variant: "secondary" }), "min-h-[44px] shrink-0 gap-1.5 cursor-pointer")}
        >
          {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
          {copied ? "Copied" : "Copy key"}
        </button>
        <span role="status" className="sr-only">
          {copied ? "Program key copied" : ""}
        </span>
      </div>
      <p className="mt-3 text-sm">It works through {formatEndDay(state.endsAt)}, for up to {tier.seats} people.</p>
      <p className="mt-1 text-sm text-muted">
        {state.mailed && state.email
          ? `We also emailed it to ${state.email} with steps to share it.`
          : `Copy it now. If no email arrives, write ${FOR_PROGRAMS_EMAIL} and we will resend it.`}
      </p>
      <p className="mt-1 text-sm text-muted">Each person opens the desk, goes to Plans and pastes the key under Redeem.</p>
    </div>
  );
}

function ReturnNotice({ state }: { state: ClaimState }) {
  if (state.kind === "claiming") {
    return (
      <p role="status" aria-live="polite" className={cn("mt-4 flex items-center gap-2 text-sm", CARD)}>
        <Loader2 aria-hidden="true" className="size-4 animate-spin text-accent" />
        Confirming your payment and issuing the program key…
      </p>
    );
  }
  if (state.kind === "canceled") {
    return (
      <p role="status" className={cn("mt-4 text-sm", CARD)}>
        Card checkout was canceled. No charge was made.
      </p>
    );
  }
  if (state.kind === "failed") {
    return (
      <p role="alert" className="mt-4 rounded-lg bg-warn-soft px-4 py-3 text-sm text-fg">
        {state.reason} If you were charged, write {FOR_PROGRAMS_EMAIL} and we will send the key.
      </p>
    );
  }
  if (state.kind === "done") return <KeyPanel state={state} />;
  return null;
}

function seatsCap(tier: CardTier): number {
  return PROGRAM_TIER_BY_ID[tier].seats ?? 0;
}

function tierOption(tier: CardTier) {
  const t = PROGRAM_TIER_BY_ID[tier];
  return `${t.name}: ${formatUsd(t.annual)} per year, up to ${t.seats} people`;
}

/**
 * The pay-by-card form and the return panel. Renders nothing unless the server says
 * card checkout is live, or the buyer has just come back from Stripe.
 */
export function ProgramCheckoutSection(props: { live: boolean; tier: CardTier; onTier: (t: CardTier) => void }) {
  const returned = useProgramReturn();
  const [org, setOrg] = useState("");
  const [email, setEmail] = useState("");
  const [seats, setSeats] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!props.live && returned.kind === "none") return null;

  const cap = seatsCap(props.tier);

  async function submit() {
    const n = Number(seats.trim());
    if (!org.trim()) return setError("Add the organization name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Enter the email where the key should go.");
    if (!Number.isInteger(n) || n < 1) return setError("Enter how many people will use the key.");
    if (n > cap) {
      return setError(
        props.tier === "team"
          ? `Team covers up to ${cap} people. Pick Program, or ask for a Site quote.`
          : `Program covers up to ${cap} people. Ask for a Site quote.`,
      );
    }
    setError(null);
    setBusy(true);
    try {
      const res = await startProgramCheckout({
        data: { tier: props.tier, org: org.trim(), email: email.trim(), seats: n, years: 1 },
      });
      if (res.ok && "url" in res) {
        window.location.assign(res.url);
        return;
      }
      setError(res.ok ? "Could not open checkout." : res.reason);
    } catch {
      setError("Could not reach the desk. Try again, or ask for a quote below.");
    }
    setBusy(false);
  }

  return (
    <section id="program-checkout" className="mt-12 scroll-mt-6" aria-labelledby="program-checkout-h">
      <h2 id="program-checkout-h" className="font-serif text-2xl tracking-tight text-fg">
        Pay by card
      </h2>
      <ReturnNotice state={returned} />
      {props.live ? (
        <>
          <p className="mt-2 max-w-2xl text-sm">
            Team and Program can be paid by card for one year. Stripe takes the payment. The program key shows here
            right after and is emailed to you. Prefer an invoice or purchase order? <a href="#inquiry" className="font-medium text-accent underline">Ask for a quote</a>.
          </p>
          <form
            noValidate
            aria-labelledby="program-checkout-h"
            aria-busy={busy}
            className={cn("mt-4 max-w-3xl", CARD)}
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy) void submit();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <label htmlFor="pc-tier" className="block text-sm font-medium text-fg">License</label>
                <select
                  id="pc-tier"
                  value={props.tier}
                  className={cn(SELECT, "mt-1")}
                  onChange={(e) => props.onTier(isCardTier(e.target.value) ? e.target.value : "team")}
                >
                  {CARD_TIERS.map((t) => (
                    <option key={t} value={t}>
                      {tierOption(t)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <label htmlFor="pc-seats" className="block text-sm font-medium text-fg">People who will use it</label>
                <Input
                  id="pc-seats"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={6}
                  aria-describedby="pc-seats-hint"
                  className={cn(FIELD, "mt-1")}
                  value={seats}
                  onChange={(e) => setSeats(e.target.value)}
                />
                <p id="pc-seats-hint" className="mt-1 text-xs text-muted">Up to {cap} on {PROGRAM_TIER_BY_ID[props.tier].name}. Honor system.</p>
              </div>
              <div className="min-w-0">
                <label htmlFor="pc-org" className="block text-sm font-medium text-fg">Organization</label>
                <Input
                  id="pc-org"
                  autoComplete="organization"
                  maxLength={120}
                  className={cn(FIELD, "mt-1")}
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                />
              </div>
              <div className="min-w-0">
                <label htmlFor="pc-email" className="block text-sm font-medium text-fg">Email for the key</label>
                <Input
                  id="pc-email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  className={cn(FIELD, "mt-1")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div role="alert" className={error ? "mt-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger" : "sr-only"}>
              {error}
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                aria-disabled={busy}
                className={cn(buttonVariants(), "min-h-[44px] w-full cursor-pointer aria-disabled:cursor-not-allowed aria-disabled:opacity-40 sm:w-auto")}
              >
                {busy ? "Opening checkout…" : `Pay ${formatUsd(PROGRAM_TIER_BY_ID[props.tier].annual)} by card`}
              </button>
              <p className="text-xs text-muted">One year. No automatic renewal.</p>
            </div>
          </form>
        </>
      ) : null}
    </section>
  );
}
