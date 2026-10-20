import { z } from "zod";
import { programQuote } from "@/lib/billing/programs";
import {
  discountLabel,
  estimateLines,
  formatUsd,
  FOR_PROGRAMS_EMAIL,
  MAX_SEATS,
  PROGRAM_TYPES,
  yearsLabel,
} from "@/lib/seo/for-programs";

/**
 * The /for-programs inquiry form: one schema for the browser and the server
 * route, plus the subject and body that both the operator email and the
 * mailto fallback use. Nothing here is stored.
 */

/** Hidden field. People never see it; form-filling bots do. A value means drop the request. */
export const HONEYPOT_FIELD = "homepage";

export const INQUIRY_FIELDS = ["name", "email", "organization", "role", "programType", "seats", "years", "start", "message"] as const;
export type InquiryField = (typeof INQUIRY_FIELDS)[number];

export const INQUIRY_LIMITS = { name: 120, email: 254, organization: 160, role: 120, start: 80, message: 2000 } as const;

/** Largest JSON body the route reads. Every field at its cap fits well under this. */
export const INQUIRY_MAX_BYTES = 16_384;

const tooLong = (max: number) => `Keep this under ${max} characters.`;
const SEATS_MSG = `Enter about how many people, from 1 to ${MAX_SEATS.toLocaleString("en-US")}.`;

const isControl = (ch: string) => {
  const c = ch.charCodeAt(0);
  return c < 0x20 || c === 0x7f;
};

/** One line of text: control characters and runs of whitespace become one space. */
function oneLine(v: unknown) {
  if (typeof v !== "string") return v;
  return Array.from(v, (ch) => (isControl(ch) ? " " : ch))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** Free text: keep line breaks and tabs, drop other control characters. */
function multiLine(v: unknown) {
  if (typeof v !== "string") return v;
  return Array.from(v.replace(/\r\n?/g, "\n"))
    .filter((ch) => ch === "\n" || ch === "\t" || !isControl(ch))
    .join("")
    .trim();
}

function required(max: number, missing: string) {
  return z.preprocess(oneLine, z.string({ error: missing }).min(1, missing).max(max, tooLong(max)));
}

function optional(max: number) {
  return z.preprocess(oneLine, z.string().max(max, tooLong(max)).default(""));
}

export const ProgramInquirySchema = z.object({
  name: required(INQUIRY_LIMITS.name, "Enter your name."),
  email: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
    z
      .string({ error: "Enter your work email." })
      .min(1, "Enter your work email.")
      .max(INQUIRY_LIMITS.email, tooLong(INQUIRY_LIMITS.email))
      .pipe(z.email("Enter a work email like name@school.edu.")),
  ),
  organization: required(INQUIRY_LIMITS.organization, "Enter your school, program or organization."),
  role: optional(INQUIRY_LIMITS.role),
  programType: z.enum(PROGRAM_TYPES, { error: "Choose a program type." }),
  seats: z.preprocess(
    (v) => (typeof v === "string" ? (v.replace(/[,\s]/g, "") === "" ? NaN : Number(v.replace(/[,\s]/g, ""))) : v),
    z.number({ error: SEATS_MSG }).int(SEATS_MSG).min(1, SEATS_MSG).max(MAX_SEATS, SEATS_MSG),
  ),
  years: z.preprocess(
    (v) => (v === undefined || v === null || v === "" ? 1 : Number(v)),
    z.union([z.literal(1), z.literal(2), z.literal(3)], { error: "Choose 1, 2 or 3 years." }),
  ),
  start: optional(INQUIRY_LIMITS.start),
  message: z.preprocess(multiLine, z.string().max(INQUIRY_LIMITS.message, tooLong(INQUIRY_LIMITS.message)).default("")),
});

export type ProgramInquiry = z.output<typeof ProgramInquirySchema>;
export type InquiryErrors = Partial<Record<InquiryField, string>>;

export type InquiryValidation = { ok: true; data: ProgramInquiry } | { ok: false; errors: InquiryErrors };

/** Validate a raw form or JSON body. Errors are keyed by field, one message each. */
export function validateInquiry(raw: unknown): InquiryValidation {
  const parsed = ProgramInquirySchema.safeParse(raw && typeof raw === "object" ? raw : {});
  if (parsed.success) return { ok: true, data: parsed.data };
  const errors: InquiryErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && (INQUIRY_FIELDS as readonly string[]).includes(field)) {
      errors[field as InquiryField] ??= issue.message;
    }
  }
  return { ok: false, errors };
}

/** True when the hidden field came back filled in. */
export function isHoneypotHit(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const v = (raw as Record<string, unknown>)[HONEYPOT_FIELD];
  return typeof v === "string" ? v.trim() !== "" : v !== undefined && v !== null && v !== false;
}

export function inquiryQuote(data: ProgramInquiry) {
  return programQuote(data.seats, data.years);
}

/** "Program inquiry: Cascade College (40 seats, Program)". */
export function inquirySubject(data: ProgramInquiry): string {
  const q = inquiryQuote(data);
  return `Program inquiry: ${data.organization} (${q.seats.toLocaleString("en-US")} ${q.seats === 1 ? "seat" : "seats"}, ${q.tier.name})`;
}

/** The inquiry as plain text, with the page's estimate. Used for the operator email and the mailto fallback. */
export function inquiryBody(data: ProgramInquiry): string {
  const q = inquiryQuote(data);
  const others = ([1, 2, 3] as const)
    .filter((y) => y !== data.years)
    .map((y) => {
      const off = discountLabel(y);
      return `${yearsLabel(y)}: ${formatUsd(programQuote(data.seats, y).total)} total${off ? ` (${off})` : ""}`;
    });
  return [
    `Name: ${data.name}`,
    `Work email: ${data.email}`,
    `Organization: ${data.organization}`,
    `Role: ${data.role || "(not given)"}`,
    `Program type: ${data.programType}`,
    `Approximate seats: ${q.seats.toLocaleString("en-US")}`,
    `Term: ${yearsLabel(data.years)}`,
    `Desired start: ${data.start || "(not given)"}`,
    "",
    "Message:",
    data.message || "(none)",
    "",
    "Estimate from the page (draft prices, confirmed in writing):",
    ...estimateLines(q),
    "",
    "Other terms at this seat count:",
    ...others,
  ].join("\n");
}

/**
 * A mailto link with the whole inquiry filled in, for when the form can't send.
 * Line breaks are CRLF, as RFC 6068 asks.
 */
export function inquiryMailto(data: ProgramInquiry, to: string = FOR_PROGRAMS_EMAIL): string {
  const enc = (s: string) => encodeURIComponent(s.replace(/\r?\n/g, "\r\n"));
  return `mailto:${to}?subject=${enc(inquirySubject(data))}&body=${enc(inquiryBody(data))}`;
}

/** What the route answers. `errors` only on 400. */
export interface InquiryResponse {
  ok: boolean;
  message: string;
  errors?: InquiryErrors;
}
