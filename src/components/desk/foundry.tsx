import { useEffect, useMemo, useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { isFramed, redirectToLoginIfRequired, useRefetchWhenConnectorReady } from "@/lib/app-data";
import {
  BUYERS,
  COMMERCE,
  OPERATOR,
  buyerDm,
  fulfillKey,
  fulfillKeys,
  invoiceText,
  launchTweet,
  salesDm,
} from "@/lib/billing/commerce";
import { collectLicenses, draftCollected } from "@/lib/billing/collect";
import { loadPipe, savePipe } from "@/lib/billing/hunts";
import { mintLicenseKey } from "@/lib/billing/license";
import { priceFor } from "@/lib/billing/plans";
import { stripeStatus } from "@/lib/billing/stripe";
import { useDesk } from "@/lib/drugs/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { HuntDesk } from "./hunt";
import { LaunchDesk } from "./launch";
import { Plate } from "./plate";

type Issued = { key: string; plan: string; at: string; soldTo: string };
type Collected = {
  source: string;
  soldTo: string;
  email: string;
  key: string;
  plan: string;
  amount: number;
  at: string;
  mailed: boolean;
};

const ISSUED_KEY = "firstpass.issued.v1";
const PAY_NOTE_KEY = "firstpass.payNote";
const PIN_KEY = "firstpass.foundry.pin";

function loadIssued(): Issued[] {
  try {
    const raw = localStorage.getItem(ISSUED_KEY);
    const rows = raw ? (JSON.parse(raw) as Partial<Issued>[]) : [];
    return rows
      .filter((r) => typeof r.key === "string")
      .map((r) => ({
        key: r.key as string,
        plan: typeof r.plan === "string" ? r.plan : "life",
        at: typeof r.at === "string" ? r.at : new Date().toISOString(),
        soldTo: typeof r.soldTo === "string" ? r.soldTo : "",
      }));
  } catch {
    return [];
  }
}

function persistIssued(rows: Issued[]) {
  localStorage.setItem(ISSUED_KEY, JSON.stringify(rows.slice(0, 80)));
}

export function Foundry() {
  const setView = useDesk((s) => s.setView);
  const [pin, setPinState] = useState("");
  const [plan, setPlan] = useState<"life" | "pro" | "lab">("life");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pinWarn, setPinWarn] = useState("");
  const [last, setLast] = useState<string | null>(null);
  const [packet, setPacket] = useState("");
  const [copied, setCopied] = useState("");
  const [issued, setIssued] = useState<Issued[]>([]);
  const [payNote, setPayNote] = useState("");
  const [soldTo, setSoldTo] = useState("");
  const [names, setNames] = useState("");
  const [waiting, setWaiting] = useState(0);
  const [collected, setCollected] = useState<Collected[]>([]);
  const [pendingMail, setPendingMail] = useState(false);
  const [mailNote, setMailNote] = useState("");
  const [tab, setTab] = useState<"hunt" | "launch" | "close">("close");
  useEffect(() => {
    setIssued(loadIssued());
    setPayNote(localStorage.getItem(PAY_NOTE_KEY) || OPERATOR.payLine);
    setWaiting(loadPipe().filter((p) => p.status === "waiting").length);
    try {
      setPinState(sessionStorage.getItem(PIN_KEY) || "");
    } catch {
      /* session */
    }
  }, []);
  const dm = useMemo(() => salesDm(), []);
  const tweet = useMemo(() => launchTweet(), []);
  const invoice = useMemo(
    () =>
      invoiceText({
        plan: plan === "life" ? "Founding lifetime desk" : plan === "lab" ? "Lab seat (year)" : "Pro (year)",
        price: plan === "life" ? COMMERCE.founding : plan === "lab" ? priceFor("lab", "year") : priceFor("pro", "year"),
        pay: payNote || OPERATOR.payLine,
        keyHint: last ?? undefined,
      }),
    [plan, payNote, last],
  );
  const nameList = names
    .split(/[\n,;]+/)
    .map((n) => n.trim())
    .filter(Boolean);

  function setPin(value: string) {
    setPinState(value);
    try {
      sessionStorage.setItem(PIN_KEY, value);
    } catch {
      /* session */
    }
  }

  function remember(rows: Issued[]) {
    setIssued((current) => {
      const next = [...rows, ...current].filter((row, i, all) => all.findIndex((r) => r.key === row.key) === i).slice(0, 80);
      persistIssued(next);
      return next;
    });
  }

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      /* clipboard */
    }
  }

  async function collect() {
    setBusy(true);
    setErr("");
    try {
      const huntNames = loadPipe()
        .filter((p) => p.status === "waiting")
        .map((p) => p.name);
      const res = await collectLicenses({
        data: { pin, plan, names, hunt: huntNames.join("\n") },
      });
      if (!res.ok) {
        setErr(res.reason);
        setPendingMail(false);
        return;
      }
      if (res.mail === "pending" && isFramed()) {
        setPendingMail(true);
        setMailNote("Connecting to mail…");
      } else if (res.mail === "pending" || res.mail === "off") {
        setPendingMail(false);
        setMailNote(
          res.stripeLive
            ? "Mail scan needs this desk opened from Grok. Card sales still collected."
            : "Mail scan needs this desk opened from Grok. Stripe is not live here — hunt waiting and pasted names still key.",
        );
      } else if (res.mail === "login") {
        setPendingMail(false);
        setMailNote("Continue with Grok to scan Venmo / Cash App / PayPal.");
        redirectToLoginIfRequired({
          ok: false,
          data: null,
          loginRequired: true,
          loginUrl: res.loginUrl,
        });
      } else if (res.mail === "ok") {
        setPendingMail(false);
        const n = res.rows.filter((r) => r.source === "venmo" || r.source === "cashapp" || r.source === "paypal").length;
        setMailNote(
          n ? `${n} written payment${n === 1 ? "" : "s"} in mail matched a license price.` : "No $79 / plan-price receipts in mail.",
        );
      }
      setCollected(res.rows);
      if (res.rows.length) {
        remember(
          res.rows.map((row) => ({
            key: row.key,
            plan: row.plan,
            at: row.at || new Date().toISOString(),
            soldTo: row.soldTo,
          })),
        );
        setLast(res.rows[0]?.key ?? null);
        const text = fulfillKeys(res.rows.map((row) => ({ key: row.key, soldTo: row.soldTo })));
        setPacket(text);
        const byName = new Map(res.rows.map((row) => [row.soldTo.toLowerCase(), row.key]));
        const pipe = loadPipe().map((p) => {
          if (p.status !== "waiting") return p;
          const key = byName.get(p.name.toLowerCase());
          if (!key) return p;
          return { ...p, status: "keyed" as const, note: key };
        });
        savePipe(pipe);
        setWaiting(pipe.filter((p) => p.status === "waiting").length);
        await copy("fulfill", text);
      }
    } catch {
      setErr("Could not collect licenses. Try again.");
      setPendingMail(false);
    } finally {
      setBusy(false);
    }
  }

  useRefetchWhenConnectorReady(pendingMail, () => void collect());

  async function mint() {
    setBusy(true);
    setErr("");
    setPinWarn("");
    try {
      const res = await mintLicenseKey({ data: { pin, plan, soldTo } });
      if (!res.ok) {
        setErr(res.reason);
        return;
      }
      if ("defaultPin" in res && res.defaultPin) {
        setPinWarn(
          "Operator PIN env is unset — you minted with the development default. Set the production PIN (and license pepper) before live minting; defaults fail closed in production.",
        );
      }
      const row: Issued = {
        key: res.key,
        plan: res.plan,
        at: new Date().toISOString(),
        soldTo: soldTo.trim(),
      };
      remember([row]);
      setLast(res.key);
      const text = fulfillKey({ key: res.key, soldTo });
      setPacket(text);
      await copy("fulfill", text);
    } catch {
      setErr("Could not mint. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function draftMail() {
    setBusy(true);
    setErr("");
    try {
      const res = await draftCollected({ data: { pin, rows: collected } });
      if (!res.ok) {
        setErr(res.reason);
        if ("loginUrl" in res && res.loginUrl) {
          redirectToLoginIfRequired({
            ok: false,
            data: null,
            loginRequired: true,
            loginUrl: res.loginUrl,
          });
        }
        return;
      }
      setMailNote(`${res.drafted} Gmail draft${res.drafted === 1 ? "" : "s"} ready to send.`);
    } catch {
      setErr("Could not draft in Gmail.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
        <div className="grid sm:grid-cols-[200px_minmax(0,1fr)]">
          <Plate src="/plates/hero.jpg" alt="" className="h-36 w-full sm:h-full min-h-36" />
          <div className="px-5 py-5 sm:px-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Operator desk</p>
            <h1 className="mt-2 font-serif text-3xl tracking-tight text-fg">Find buyers. Post. Licenses mint themselves.</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              One PIN, one collect. Card sales are already signed. Venmo, Cash App, and PayPal receipts
              in mail mint the same key twice — no per-sale click.
            </p>
            <div className="mt-4 flex flex-wrap gap-1">
              {(
                [
                  ["hunt", "Hunt"],
                  ["launch", "Launch"],
                  ["close", "Close"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={
                    tab === id
                      ? "h-10 rounded-full bg-ink px-4 text-sm font-medium text-bg"
                      : "h-10 rounded-full bg-bg-sunken px-4 text-sm font-medium text-muted hover:text-fg"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <button type="button" className="mt-3 block text-sm text-accent hover:underline" onClick={() => setView("plans")}>
              Back to licenses
            </button>
          </div>
        </div>
      </section>

      {tab === "hunt" ? (
        <HuntDesk />
      ) : tab === "launch" ? (
        <LaunchDesk />
      ) : (
        <CloseDesk
          pin={pin}
          setPin={setPin}
          plan={plan}
          setPlan={setPlan}
          busy={busy}
          err={err}
          pinWarn={pinWarn}
          last={last}
          copied={copied}
          issued={issued}
          payNote={payNote}
          setPayNote={setPayNote}
          soldTo={soldTo}
          setSoldTo={setSoldTo}
          names={names}
          setNames={setNames}
          nameCount={nameList.length}
          waiting={waiting}
          collected={collected}
          mailNote={mailNote}
          pendingMail={pendingMail}
          dm={dm}
          tweet={tweet}
          invoice={invoice}
          fulfillment={packet}
          copy={copy}
          mint={mint}
          collect={() => void collect()}
          draftMail={() => void draftMail()}
        />
      )}
    </div>
  );
}

function CloseDesk({
  pin,
  setPin,
  plan,
  setPlan,
  busy,
  err,
  pinWarn,
  last,
  copied,
  issued,
  payNote,
  setPayNote,
  soldTo,
  setSoldTo,
  names,
  setNames,
  nameCount,
  waiting,
  collected,
  mailNote,
  pendingMail,
  dm,
  tweet,
  invoice,
  fulfillment,
  copy,
  mint,
  collect,
  draftMail,
}: {
  pin: string;
  setPin: (v: string) => void;
  plan: "life" | "pro" | "lab";
  setPlan: (v: "life" | "pro" | "lab") => void;
  busy: boolean;
  err: string;
  pinWarn: string;
  last: string | null;
  copied: string;
  issued: Issued[];
  payNote: string;
  setPayNote: (v: string) => void;
  soldTo: string;
  setSoldTo: (v: string) => void;
  names: string;
  setNames: (v: string) => void;
  nameCount: number;
  waiting: number;
  collected: Collected[];
  mailNote: string;
  pendingMail: boolean;
  dm: string;
  tweet: string;
  invoice: string;
  fulfillment: string;
  copy: (label: string, text: string) => void;
  mint: () => void;
  collect: () => void;
  draftMail: () => void;
}) {
  const extra = [waiting ? `${waiting} waiting in the hunt` : "", nameCount ? `${nameCount} pasted` : ""]
    .filter(Boolean)
    .join(" · ");
  const canDraft = collected.some((r) => r.email && !r.mailed && r.source !== "stripe");
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <h2 className="font-serif text-xl tracking-tight text-fg">Who pays — copy their DM</h2>
          <ul className="mt-4 space-y-3">
            {BUYERS.map((b) => (
              <li key={b.who} className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-fg">{b.who}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{b.why}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => void copy(b.who, buyerDm(b.who))}>
                  {copied === b.who ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied === b.who ? "Copied" : "DM"}
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-serif text-xl tracking-tight text-fg">Cold DM / email</h2>
            <Button size="sm" variant="secondary" onClick={() => void copy("dm", dm)}>
              {copied === "dm" ? "Copied" : "Copy"}
            </Button>
          </div>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted">{dm}</pre>
          <div className="mt-5 flex items-center justify-between gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Launch post</h3>
            <Button size="sm" variant="secondary" onClick={() => void copy("tweet", tweet)}>
              {copied === "tweet" ? "Copied" : "Copy post"}
            </Button>
          </div>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted">{tweet}</pre>
        </section>
      </div>

      <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <h2 className="font-serif text-xl tracking-tight text-fg">How a sale closes</h2>
        <StripeLiveCard />
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ["1. Pitch", "Send the buyer DM. Founding is $79 once — cheaper to say yes than $12/mo."],
            ["2. Collect", `Card on the desk, or ${OPERATOR.payLine}.`],
            [
              "3. Fulfill",
              "PIN, then Collect. Stripe, mail receipts at a license price, and hunt waiting all key in one pass.",
            ],
          ].map(([t, d]) => (
            <li key={t} className="rounded-md bg-bg-sunken px-3 py-3">
              <p className="font-mono text-[11px] uppercase tracking-wide text-accent">{t}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{d}</p>
            </li>
          ))}
        </ol>
        <label className="mt-5 block text-xs font-medium text-muted" htmlFor="pay-note">
          How you get paid (goes on the invoice you copy — not shown to strangers unless you send it)
        </label>
        <Input
          id="pay-note"
          className="mt-1.5"
          value={payNote}
          placeholder={OPERATOR.payLine}
          onChange={(e) => {
            setPayNote(e.target.value);
            localStorage.setItem(PAY_NOTE_KEY, e.target.value);
          }}
        />
      </section>

      <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-accent" />
          <h2 className="font-serif text-xl tracking-tight text-fg">Automatic licenses</h2>
        </div>
        <p className="mt-2 text-sm text-muted">
          Operator only — buyers never see this screen. They pay, receive a key, and Redeem on Plans.
          One PIN. Collect pulls paid cards, scans Venmo / Cash App / PayPal for $79 and the other
          plan prices, and keys everyone waiting in the hunt. Collecting twice returns the same keys.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input
            id="operator-pin"
            type="password"
            autoComplete="off"
            placeholder="Operator PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && pin && !busy) collect();
            }}
          />
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                ["life", "Life"],
                ["pro", "Pro"],
                ["lab", "Lab"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPlan(id)}
                className={
                  plan === id
                    ? "h-11 rounded-sm bg-ink text-bg text-sm font-medium"
                    : "h-11 rounded-sm bg-bg-sunken text-muted text-sm font-medium hover:text-fg"
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <Button className="mt-4 w-full sm:w-auto" onClick={collect} disabled={busy || !pin}>
          {busy || pendingMail ? "Collecting…" : extra ? `Collect licenses · ${extra}` : "Collect licenses"}
        </Button>
        {mailNote ? <p className="mt-3 text-sm text-muted">{mailNote}</p> : null}

        <label className="mt-5 block text-xs font-medium text-muted" htmlFor="batch-names">
          Extra names — only if they paid and there is no receipt in mail
        </label>
        <textarea
          id="batch-names"
          value={names}
          rows={4}
          placeholder={"Salish Ketamine\nNate at Fairhaven\nUW SoP resident"}
          onChange={(e) => setNames(e.target.value)}
          className={cn(
            "mt-1.5 flex w-full rounded-md bg-surface-2 px-3 py-2.5 text-sm text-fg shadow-[var(--shadow-border)]",
            "placeholder:text-subtle",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          )}
        />
        {err ? <p className="mt-3 text-sm text-danger">{err}</p> : null}
        {pinWarn ? <p className="mt-3 text-sm text-warn">{pinWarn}</p> : null}
        {last ? (
          <p className="mt-3 rounded-md bg-ok-soft px-3 py-2 font-mono text-sm text-ok">
            {last}
            <span className="ml-2 font-sans text-xs">fulfillment copied</span>
          </p>
        ) : null}

        {collected.length ? (
          <ul className="mt-4 space-y-2">
            {collected.map((row) => (
              <li key={row.key} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate text-fg">{row.soldTo || "License"}</span>
                  <span className="font-mono text-[11px] text-muted">{row.key}</span>
                </span>
                <span className="text-xs uppercase tracking-wide text-muted">{row.source}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {fulfillment ? (
          <>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Fulfillment to paste back</h3>
              <div className="flex flex-wrap gap-2">
                {canDraft ? (
                  <Button size="sm" variant="secondary" onClick={draftMail} disabled={busy || !pin}>
                    Draft in Gmail
                  </Button>
                ) : null}
                <Button size="sm" variant="secondary" onClick={() => void copy("fulfill", fulfillment)}>
                  {copied === "fulfill" ? "Copied" : "Copy fulfillment"}
                </Button>
              </div>
            </div>
            <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-bg-sunken px-3 py-3 font-sans text-sm leading-relaxed text-fg">
              {fulfillment}
            </pre>
          </>
        ) : null}

        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-medium text-muted hover:text-fg">One-off mint</summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input
              id="sold-to"
              value={soldTo}
              placeholder="Clinic name, NP, student — whoever just paid"
              onChange={(e) => setSoldTo(e.target.value)}
            />
            <Button variant="secondary" onClick={() => void mint()} disabled={busy || !pin}>
              {busy ? "Minting…" : "Mint one"}
            </Button>
          </div>
        </details>

        <div className="mt-5 flex items-center justify-between gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Invoice to send</h3>
          <Button size="sm" variant="secondary" onClick={() => void copy("inv", invoice)}>
            {copied === "inv" ? "Copied" : "Copy invoice"}
          </Button>
        </div>
        <pre className="mt-2 whitespace-pre-wrap rounded-md bg-bg-sunken px-3 py-3 font-mono text-xs leading-relaxed text-fg">
          {invoice}
        </pre>
      </section>

      {issued.length > 0 ? (
        <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted">Issued on this browser</h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void copy("all", fulfillKeys(issued.map((row) => ({ key: row.key, soldTo: row.soldTo }))))}
            >
              Copy all
            </Button>
          </div>
          <ul className="mt-3 space-y-2">
            {issued.map((row) => (
              <li key={row.key} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-mono text-xs text-fg">{row.key}</span>
                <span className="text-xs text-muted">
                  {row.soldTo ? `${row.soldTo} · ` : ""}
                  {row.plan} · {row.at.slice(0, 10)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void copy("fulfill", fulfillKey({ key: row.key, soldTo: row.soldTo }))}
                >
                  Copy
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function StripeLiveCard() {
  const [mode, setMode] = useState<"off" | "test" | "live" | null>(null);
  useEffect(() => {
    let live = true;
    void stripeStatus()
      .then((s) => {
        if (live) setMode(s.mode);
      })
      .catch(() => {
        if (live) setMode("off");
      });
    return () => {
      live = false;
    };
  }, []);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <p className="mt-3 text-sm leading-relaxed text-muted">
      {mode === "live"
        ? "Stripe card checkout is live. Paid sessions mint a signed key, stamp the receipt, and license the returning browser. No mint click."
        : mode === "test"
          ? "Stripe is in test mode. Use a test card — no live charge. Fulfillment still auto-mints."
          : mode === "off"
            ? "Stripe is not live. Set STRIPE_SECRET_KEY on the deploy (and STRIPE_WEBHOOK_SECRET for the webhook). Venmo still closes a sale — Collect scans mail and keys the hunt."
            : "Checking Stripe…"}
      {origin ? (
        <>
          {" "}
          Webhook: <span className="font-mono text-xs text-fg">{origin}/api/stripe/webhook</span>
        </>
      ) : null}
    </p>
  );
}
