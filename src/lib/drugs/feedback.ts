/**
 * Analytics-free feedback: a prefilled mailto the visitor sends themselves.
 * Nothing is tracked or posted. The body carries the desk link and tray names
 * (public formulary names only) so a note like "this pair looks wrong" can be
 * reproduced, and it tells the sender not to include patient information.
 */
export interface FeedbackInput {
  email: string;
  /** Current desk URL (so the pair can be reopened). */
  url?: string;
  /** Names of the items on the tray, in order. */
  names?: readonly string[];
}

export const FEEDBACK_SUBJECT = "FirstPass desk feedback";

export function feedbackBody({ url, names }: Pick<FeedbackInput, "url" | "names">): string {
  const lines = [
    "What were you trying to do?",
    "",
    "",
    "What was missing, confusing, or wrong?",
    "",
    "",
    "Who are you (student, clinic, pharmacy, other)? Optional:",
    "",
    "",
    "---",
  ];
  if (names && names.length > 0) lines.push(`Tray: ${names.join(" + ")}`);
  if (url) lines.push(`Desk link: ${url}`);
  lines.push(
    "Please do not include patient names or other identifying health information.",
    "FirstPass is educational only and not FDA-cleared.",
  );
  return lines.join("\n");
}

export function feedbackMailto(input: FeedbackInput): string {
  const params = new URLSearchParams({
    subject: FEEDBACK_SUBJECT,
    body: feedbackBody(input),
  });
  // mailto wants %20, not "+", for spaces.
  return `mailto:${input.email}?${params.toString().replace(/\+/g, "%20")}`;
}
