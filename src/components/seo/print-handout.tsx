import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { printDate, printedFromAddress, printPage } from "@/lib/seo/print";

/*
 * Printing the public teaching pages (pair, class, drug hub, course kit) as handouts.
 * The rules live in src/styles.css under @media print and key off three attributes:
 *   data-print-handout  on the page's <main>: black on white, no fills or shadows,
 *                       external source links followed by their address
 *   data-print-hide     screen-only chrome inside the page (buttons, embed box, in-page nav)
 *   data-print-only     shown only on paper (the "Printed from" line)
 *   data-print-open     a <details> that holds label-source lines, opened for print
 */

export const PRINT_BUTTON_LABEL = "Print this page";

/** "Print this page": a real button (Enter and Space work), at least 44px tall, never on paper. */
export function PrintButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      data-print-hide=""
      data-testid="print-button"
      onClick={printPage}
      className={cn(buttonVariants({ variant: "secondary" }), "min-h-[44px]", className)}
    >
      <Printer aria-hidden="true" className="size-4" />
      {PRINT_BUTTON_LABEL}
    </button>
  );
}

/**
 * Details marked data-print-open are opened while printing so their source lines reach the
 * paper, then the ones that were closed are closed again. CSS (::details-content) covers
 * browsers that print without firing beforeprint.
 */
function openForPrint(): () => void {
  const opened: HTMLDetailsElement[] = [];
  for (const d of document.querySelectorAll<HTMLDetailsElement>("[data-print-handout] details[data-print-open]")) {
    if (!d.open) {
      d.open = true;
      opened.push(d);
    }
  }
  return () => {
    for (const d of opened) d.open = false;
  };
}

/**
 * The last line on a printed handout: where it came from and when. Hidden on screen.
 * The server renders the address only (deterministic); the date is filled in on the
 * client after hydration and again right before printing, so it is always the print day.
 */
export function PrintFooter({ canonical }: { canonical: string }) {
  const [date, setDate] = useState("");
  useEffect(() => {
    setDate(printDate());
    let restore: (() => void) | null = null;
    const before = () => {
      setDate(printDate());
      restore?.();
      restore = openForPrint();
    };
    const after = () => {
      restore?.();
      restore = null;
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
  return (
    <p data-print-only="" data-testid="print-footer" className="mt-6 border-t border-border pt-2 text-xs">
      Printed from {printedFromAddress(canonical)}
      {date ? <> on {date}</> : null}.
    </p>
  );
}
