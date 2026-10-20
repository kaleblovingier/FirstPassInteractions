import { createHash } from "node:crypto";
import { env } from "@/lib/env.server";
import {
  INQUIRY_MAX_BYTES,
  inquiryBody,
  inquirySubject,
  isHoneypotHit,
  validateInquiry,
  type InquiryErrors,
  type InquiryResponse,
  type ProgramInquiry,
} from "@/lib/billing/program-inquiry";
import { FOR_PROGRAMS_EMAIL } from "@/lib/seo/for-programs";

/**
 * POST /api/programs/inquiry. Sends ONE email, to the operator only, with
 * reply-to set to the person who asked. The inquirer is never emailed: a public
 * form that mails any typed address would be an abuse vector. Nothing is stored.
 */

export const INQUIRY_SENT = "Thanks. Your inquiry is in, and we'll reply to your work email.";
export const INQUIRY_UNCONFIGURED =
  "This form can't send mail yet. Use the email link below. It has your inquiry filled in, so nothing is lost.";
export const INQUIRY_FAILED =
  "We couldn't send that just now. Use the email link below. It has your inquiry filled in.";
export const INQUIRY_LIMITED = "Too many inquiries from here. Wait a while, or use the email link below.";
export const INQUIRY_INVALID = "Check the fields marked below.";
export const INQUIRY_TOO_LARGE = "That inquiry is too long. Shorten the message and try again.";

/* ---------------- rate limiting (in-memory, per server instance) ---------------- */

const buckets = new Map<string, number[]>();

export const INQUIRY_RATE_LIMITS = {
  ip: { max: 5, windowMs: 60 * 60 * 1000 },
  email: { max: 3, windowMs: 24 * 60 * 60 * 1000 },
};

/** Sliding-window hit counter. Returns true when the call is allowed (and records it). */
export function inquiryHit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10_000) {
    const longest = Math.max(INQUIRY_RATE_LIMITS.ip.windowMs, INQUIRY_RATE_LIMITS.email.windowMs);
    for (const [k, v] of buckets) if (!v.some((t) => now - t < longest)) buckets.delete(k);
  }
  return true;
}

export function resetInquiryLimits() {
  buckets.clear();
}

function clientIp(request: Request): string {
  const h = request.headers;
  const raw = h.get("x-vercel-forwarded-for") || h.get("x-forwarded-for") || h.get("x-real-ip") || "unknown";
  return raw.split(",")[0]!.trim() || "unknown";
}

/* ---------------- mail ---------------- */

export function inquiryConfigured(): boolean {
  return Boolean(env("RESEND_API_KEY"));
}

/** Where inquiries go: PROGRAMS_INBOX, else the public program address. */
export function programsInbox(): string {
  const raw = env("PROGRAMS_INBOX");
  return raw && /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(raw) ? raw : FOR_PROGRAMS_EMAIL;
}

/** Same inquiry twice (a double click, a retry) sends one email. */
export function inquiryIdempotencyKey(data: ProgramInquiry): string {
  return `fp-program-inquiry-${createHash("sha256").update(JSON.stringify(data)).digest("hex").slice(0, 40)}`;
}

/** Send the inquiry to the operator through Resend. Returns true when Resend accepted it. */
export async function sendInquiryMail(data: ProgramInquiry): Promise<boolean> {
  const apiKey = env("RESEND_API_KEY");
  if (!apiKey) return false;
  const from = env("LICENSE_FROM") ?? "FirstPass <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": inquiryIdempotencyKey(data),
      },
      body: JSON.stringify({
        from,
        to: [programsInbox()], // the operator only, never the inquirer
        reply_to: data.email,
        subject: inquirySubject(data),
        text: `${inquiryBody(data)}\n\nSent from the inquiry form on /for-programs. Reply to answer ${data.name} directly. Nothing from the form was stored.`,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* ---------------- route ---------------- */

function json(status: number, message: string, errors?: InquiryErrors) {
  const body: InquiryResponse = { ok: status === 200, message, ...(errors ? { errors } : {}) };
  return Response.json(body, { status });
}

export async function handleInquiryRequest(request: Request): Promise<Response> {
  let text = "";
  try {
    text = await request.text();
  } catch {
    /* handled below */
  }
  if (text.length > INQUIRY_MAX_BYTES) return json(413, INQUIRY_TOO_LARGE);
  let raw: unknown = null;
  try {
    raw = JSON.parse(text);
  } catch {
    /* an empty or broken body fails validation below */
  }

  // Bots that fill the hidden field get the same answer as people, and nothing is sent.
  if (isHoneypotHit(raw)) return json(200, INQUIRY_SENT);

  const checked = validateInquiry(raw);
  if (!checked.ok) return json(400, INQUIRY_INVALID, checked.errors);
  const data = checked.data;

  if (!inquiryConfigured()) return json(503, INQUIRY_UNCONFIGURED);

  const { ip, email } = INQUIRY_RATE_LIMITS;
  if (!inquiryHit(`ip:${clientIp(request)}`, ip.max, ip.windowMs)) return json(429, INQUIRY_LIMITED);
  if (!inquiryHit(`email:${data.email}`, email.max, email.windowMs)) return json(429, INQUIRY_LIMITED);

  return (await sendInquiryMail(data)) ? json(200, INQUIRY_SENT) : json(502, INQUIRY_FAILED);
}
