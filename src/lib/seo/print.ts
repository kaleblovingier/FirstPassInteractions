/** Helpers for printing the public teaching pages as handouts (src/components/seo/print-handout.tsx). */

/** Opens the browser's print dialog. Does nothing on the server. */
export function printPage() {
  if (typeof window !== "undefined" && typeof window.print === "function") window.print();
}

/** The canonical address without the scheme, as it reads on paper. */
export function printedFromAddress(canonical: string): string {
  return canonical.replace(/^https?:\/\//, "");
}

/** The day in the reader's locale, e.g. "November 23, 2026". No time of day. */
export function printDate(now: Date = new Date()): string {
  return now.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}
