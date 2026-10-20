import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { programQuote } from "./programs";
import {
  HONEYPOT_FIELD,
  INQUIRY_LIMITS,
  INQUIRY_MAX_BYTES,
  inquiryBody,
  inquiryMailto,
  inquirySubject,
  isHoneypotHit,
  validateInquiry,
  type ProgramInquiry,
} from "./program-inquiry";
import {
  INQUIRY_FAILED,
  INQUIRY_INVALID,
  INQUIRY_LIMITED,
  INQUIRY_RATE_LIMITS,
  INQUIRY_SENT,
  INQUIRY_TOO_LARGE,
  INQUIRY_UNCONFIGURED,
  handleInquiryRequest,
  inquiryIdempotencyKey,
  programsInbox,
  resetInquiryLimits,
} from "./program-inquiry.server";
import { FOR_PROGRAMS_EMAIL, PROGRAM_TYPES, formatUsd, formatUsdCents } from "@/lib/seo/for-programs";

const GOOD = {
  name: "Pat Lee",
  email: "pat.lee@school.example.edu",
  organization: "Cascade College of Pharmacy",
  role: "Course director",
  programType: "Pharmacy schools",
  seats: "40",
  years: "2",
  start: "Spring 2027",
  message: "Two sections of PHAR 512.\nWe pay by purchase order.",
};

function valid(over: Record<string, unknown> = {}): ProgramInquiry {
  const r = validateInquiry({ ...GOOD, ...over });
  assert.ok(r.ok, JSON.stringify(r));
  return r.data;
}

function errorsFor(over: Record<string, unknown>) {
  const r = validateInquiry({ ...GOOD, ...over });
  assert.equal(r.ok, false);
  return (r as { ok: false; errors: Record<string, string> }).errors;
}

describe("program inquiry validation", () => {
  it("accepts a normal inquiry and cleans it up", () => {
    const d = valid({ name: "  Pat\n\tLee ", email: " Pat.Lee@School.Example.EDU ", seats: "1,200", message: "  Line one\r\nLine two\u0007  " });
    assert.equal(d.name, "Pat Lee");
    assert.equal(d.email, "pat.lee@school.example.edu");
    assert.equal(d.seats, 1200);
    assert.equal(d.years, 2);
    assert.equal(d.message, "Line one\nLine two");
  });

  it("fills optional fields and defaults the term to one year", () => {
    const r = validateInquiry({ name: "A", email: "a@b.co", organization: "O", programType: "Other", seats: 3 });
    assert.ok(r.ok);
    assert.deepEqual(r.data, { name: "A", email: "a@b.co", organization: "O", role: "", programType: "Other", seats: 3, years: 1, start: "", message: "" });
  });

  it("names every missing required field", () => {
    const r = validateInquiry({});
    assert.equal(r.ok, false);
    if (!r.ok) assert.deepEqual(Object.keys(r.errors).sort(), ["email", "name", "organization", "programType", "seats"]);
    for (const raw of [null, undefined, "nope", 42, []]) assert.equal(validateInquiry(raw).ok, false);
  });

  it("caps the length of every text field", () => {
    for (const [field, max] of Object.entries(INQUIRY_LIMITS)) {
      if (field === "email") continue;
      assert.match(errorsFor({ [field]: "x".repeat(max + 1) })[field]!, /under/, field);
      valid({ [field]: "x".repeat(max) });
    }
    assert.ok(errorsFor({ email: `${"a".repeat(250)}@b.co` }).email);
  });

  it("checks the email format", () => {
    for (const bad of ["", "pat", "pat@", "@school.edu", "pat@school", "pat lee@school.edu", "a@b.co\nBcc: x@y.z"]) {
      assert.ok(errorsFor({ email: bad }).email, bad);
    }
  });

  it("takes seats from 1 to 100,000 as whole numbers", () => {
    for (const bad of ["", "0", "-1", "2.5", "abc", "100001", 0, 100_001, 1.5, null]) assert.ok(errorsFor({ seats: bad }).seats, String(bad));
    for (const ok of ["1", "100000", 1, 100_000, " 2 500 "]) valid({ seats: ok });
  });

  it("takes only the listed program types and terms", () => {
    for (const p of PROGRAM_TYPES) valid({ programType: p });
    assert.ok(errorsFor({ programType: "Hospital" }).programType);
    assert.ok(errorsFor({ programType: "" }).programType);
    assert.ok(errorsFor({ years: "4" }).years);
    assert.ok(errorsFor({ years: "0" }).years);
  });

  it("spots a filled honeypot", () => {
    assert.equal(HONEYPOT_FIELD, "homepage");
    assert.equal(isHoneypotHit({ ...GOOD, homepage: "http://spam.example" }), true);
    assert.equal(isHoneypotHit({ ...GOOD, homepage: "   " }), false);
    assert.equal(isHoneypotHit({ ...GOOD, homepage: "" }), false);
    assert.equal(isHoneypotHit(GOOD), false);
    assert.equal(isHoneypotHit(null), false);
  });
});

describe("program inquiry text", () => {
  it("builds the subject from organization, seats and tier", () => {
    assert.equal(inquirySubject(valid()), "Program inquiry: Cascade College of Pharmacy (40 seats, Program)");
    assert.equal(inquirySubject(valid({ seats: "1" })), "Program inquiry: Cascade College of Pharmacy (1 seat, Team)");
    assert.equal(inquirySubject(valid({ seats: "1200" })), "Program inquiry: Cascade College of Pharmacy (1,200 seats, Site)");
  });

  it("puts the computed quote in the body", () => {
    const d = valid();
    const q = programQuote(40, 2);
    const body = inquiryBody(d);
    for (const line of [
      "Name: Pat Lee",
      "Work email: pat.lee@school.example.edu",
      "Organization: Cascade College of Pharmacy",
      "Role: Course director",
      "Program type: Pharmacy schools",
      "Approximate seats: 40",
      "Term: 2 years",
      "Desired start: Spring 2027",
      "Two sections of PHAR 512.\nWe pay by purchase order.",
      `Tier: Program (up to 100 people)`,
      `Total for 2 years: ${formatUsd(q.total)} (10% off)`,
      `Per year: ${formatUsd(q.perYear)}`,
      `Per seat per year: ${formatUsdCents(q.perSeatPerYear)}`,
      `1 year: ${formatUsd(programQuote(40, 1).total)} total`,
      `3 years: ${formatUsd(programQuote(40, 3).total)} total (15% off)`,
    ]) {
      assert.ok(body.includes(line), line);
    }
    assert.equal(q.total, 3420);
  });

  it("builds a mailto fallback with the whole inquiry", () => {
    const d = valid();
    const link = inquiryMailto(d);
    assert.ok(link.startsWith(`mailto:${FOR_PROGRAMS_EMAIL}?subject=`));
    const url = new URL(link);
    assert.equal(url.searchParams.get("subject"), inquirySubject(d));
    assert.equal(url.searchParams.get("body"), inquiryBody(d).replace(/\n/g, "\r\n"));
    assert.ok(!link.includes("+"), "spaces are %20, not +");
  });
});

/* ---------------- the route ---------------- */

const saved = { ...process.env };
const realFetch = globalThis.fetch;
let mails: Array<{ url: string; headers: Record<string, string>; body: any }> = [];

function mockResend(ok = true) {
  mails = [];
  globalThis.fetch = (async (url: any, init: any) => {
    mails.push({ url: String(url), headers: init.headers, body: JSON.parse(init.body) });
    return new Response("{}", { status: ok ? 200 : 500 });
  }) as typeof fetch;
}

function req(payload: unknown, ip = "203.0.113.7") {
  return new Request("https://desk.test/api/programs/inquiry", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `${ip}, 10.0.0.1` },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}

async function call(payload: unknown, ip?: string) {
  const res = await handleInquiryRequest(req(payload, ip));
  return { status: res.status, body: (await res.json()) as { ok: boolean; message: string; errors?: Record<string, string> } };
}

describe("POST /api/programs/inquiry", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test_placeholder";
    process.env.PROGRAMS_INBOX = "programs-inbox@firstpass.example";
    delete process.env.LICENSE_FROM;
    resetInquiryLimits();
    mockResend(true);
  });
  afterEach(() => {
    process.env = { ...saved };
    globalThis.fetch = realFetch;
  });

  it("sends one email to the operator only, with reply-to set to the inquirer", async () => {
    const r = await call(GOOD);
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { ok: true, message: INQUIRY_SENT });
    assert.equal(mails.length, 1);
    const m = mails[0]!;
    assert.equal(m.url, "https://api.resend.com/emails");
    assert.deepEqual(m.body.to, ["programs-inbox@firstpass.example"]);
    assert.equal(m.body.reply_to, GOOD.email);
    assert.equal(m.body.cc, undefined);
    assert.equal(m.body.bcc, undefined);
    assert.ok(!JSON.stringify(m.body.to).includes(GOOD.email), "never emails the inquirer");
    assert.equal(m.body.from, "FirstPass <onboarding@resend.dev>");
    assert.equal(m.body.subject, "Program inquiry: Cascade College of Pharmacy (40 seats, Program)");
    assert.ok(m.body.text.includes(`Total for 2 years: ${formatUsd(programQuote(40, 2).total)}`));
    assert.match(m.headers["Idempotency-Key"]!, /^fp-program-inquiry-[0-9a-f]{40}$/);
    assert.equal(m.headers.Authorization, "Bearer re_test_placeholder");
  });

  it("uses LICENSE_FROM as the sender and falls back to the public address as inbox", async () => {
    process.env.LICENSE_FROM = "FirstPass <keys@firstpass.example>";
    delete process.env.PROGRAMS_INBOX;
    assert.equal(programsInbox(), FOR_PROGRAMS_EMAIL);
    await call(GOOD);
    assert.deepEqual(mails[0]!.body.to, [FOR_PROGRAMS_EMAIL]);
    assert.equal(mails[0]!.body.from, "FirstPass <keys@firstpass.example>");
    process.env.PROGRAMS_INBOX = "not an address, x@y.z";
    assert.equal(programsInbox(), FOR_PROGRAMS_EMAIL);
  });

  it("gives the same idempotency key to the same inquiry", async () => {
    assert.equal(inquiryIdempotencyKey(valid()), inquiryIdempotencyKey(valid({ name: " Pat  Lee " })));
    assert.notEqual(inquiryIdempotencyKey(valid()), inquiryIdempotencyKey(valid({ seats: "41" })));
    await call(GOOD);
    await call(GOOD);
    assert.equal(mails[0]!.headers["Idempotency-Key"], mails[1]!.headers["Idempotency-Key"]);
  });

  it("drops honeypot hits with a 200 and sends nothing", async () => {
    const r = await call({ ...GOOD, [HONEYPOT_FIELD]: "https://spam.example" });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { ok: true, message: INQUIRY_SENT });
    assert.equal(mails.length, 0);
    const junk = await call({ [HONEYPOT_FIELD]: "x" });
    assert.equal(junk.status, 200);
    assert.equal(mails.length, 0);
  });

  it("answers 400 with field errors and sends nothing", async () => {
    const r = await call({ ...GOOD, email: "nope", seats: "0" });
    assert.equal(r.status, 400);
    assert.equal(r.body.ok, false);
    assert.equal(r.body.message, INQUIRY_INVALID);
    assert.deepEqual(Object.keys(r.body.errors!).sort(), ["email", "seats"]);
    for (const broken of ["", "{", "null", "[]"]) assert.equal((await call(broken)).status, 400, broken);
    assert.equal(mails.length, 0);
  });

  it("answers 413 for an oversized body", async () => {
    const r = await call({ ...GOOD, message: "x".repeat(INQUIRY_MAX_BYTES) });
    assert.equal(r.status, 413);
    assert.equal(r.body.message, INQUIRY_TOO_LARGE);
    assert.equal(mails.length, 0);
  });

  it("answers 503 with a friendly message when Resend isn't configured", async () => {
    delete process.env.RESEND_API_KEY;
    const r = await call(GOOD);
    assert.equal(r.status, 503);
    assert.deepEqual(r.body, { ok: false, message: INQUIRY_UNCONFIGURED });
    assert.match(INQUIRY_UNCONFIGURED, /email link/);
    assert.equal(mails.length, 0);
  });

  it("answers 502 when Resend refuses the send", async () => {
    mockResend(false);
    const r = await call(GOOD);
    assert.equal(r.status, 502);
    assert.equal(r.body.message, INQUIRY_FAILED);
  });

  it("limits each IP", async () => {
    const { max } = INQUIRY_RATE_LIMITS.ip;
    for (let i = 0; i < max; i += 1) assert.equal((await call({ ...GOOD, email: `p${i}@school.example.edu` })).status, 200);
    const r = await call({ ...GOOD, email: "another@school.example.edu" });
    assert.equal(r.status, 429);
    assert.equal(r.body.message, INQUIRY_LIMITED);
    assert.equal((await call({ ...GOOD, email: "another@school.example.edu" }, "198.51.100.9")).status, 200);
    assert.equal(mails.length, max + 1);
  });

  it("limits each email address across IPs", async () => {
    const { max } = INQUIRY_RATE_LIMITS.email;
    for (let i = 0; i < max; i += 1) assert.equal((await call(GOOD, `198.51.100.${i + 1}`)).status, 200);
    const r = await call({ ...GOOD, email: GOOD.email.toUpperCase() }, "198.51.100.200");
    assert.equal(r.status, 429);
    assert.equal(mails.length, max);
  });
});
