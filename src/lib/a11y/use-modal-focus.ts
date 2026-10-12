import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Keyboard behavior for a modal dialog (WCAG 2.4.3, 2.1.2):
 * focus moves into the dialog when it opens, Tab and Shift+Tab stay inside,
 * Escape closes it, and focus goes back to the element that opened it. When
 * that element is gone (a sticky bar button unmounts as the dialog opens),
 * focus falls back to #main so the next Tab continues from the page content.
 *
 * The dialog element needs tabIndex={-1}; it receives focus on open so the
 * screen reader reads its name, then Tab reaches the first control.
 */
export function useModalFocus(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onClose: () => void,
) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!active) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      const dialog = ref.current;
      if (!dialog) return;
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.getClientRects().length > 0 && el.getAttribute("aria-disabled") !== "true",
      );
      if (items.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (!dialog.contains(current) || current === dialog) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && current === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (opener && opener !== document.body && opener.isConnected) opener.focus();
      else document.getElementById("main")?.focus();
    };
  }, [active, ref]);
}
