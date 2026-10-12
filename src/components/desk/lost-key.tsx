import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Small link shown near key redemption: "Lost your Founding key?" */
export function LostKeyLink({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-muted ${className}`}>
      Lost your Founding key?{" "}
      <a href="/recover" className="font-medium text-accent hover:underline">
        Email it to me again
      </a>
    </p>
  );
}

/** Self-serve recovery form. Always shows the server's generic answer. */
export function LostKeyRecovery() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function submit() {
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/license/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      const text = data?.message || "Something went wrong. Try again in a minute.";
      if (res.ok) setMsg(text);
      else setErr(text);
    } catch {
      setErr("Could not reach the desk. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-xl border border-border bg-bg-sunken/40 p-5">
      <h1 className="text-lg font-semibold text-fg">Recover your Founding key</h1>
      <p className="mt-2 text-sm text-muted">
        Enter the email you paid with. If a Founding purchase matches, we'll email the same key to
        that address. Nothing new is created and the key is never shown on this page.
      </p>
      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy && email.trim()) void submit();
        }}
      >
        <label htmlFor="recover-email" className="sr-only">
          Purchase email
        </label>
        <Input
          id="recover-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          placeholder="you@example.com"
          className="min-h-[44px] flex-1"
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" disabled={busy || !email.trim()} className="min-h-[44px] shrink-0">
          {busy ? "Sending…" : "Email my key"}
        </Button>
      </form>
      {msg ? (
        <p role="status" className="mt-3 text-sm text-fg">
          {msg}
        </p>
      ) : null}
      {err ? (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {err}
        </p>
      ) : null}
      <p className="mt-4 text-xs text-muted">
        <a href="/" className="text-accent hover:underline">
          Back to the desk
        </a>
      </p>
    </section>
  );
}
