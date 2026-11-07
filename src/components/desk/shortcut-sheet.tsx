import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Keyboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDesk } from "@/lib/drugs/store";
import { SHORTCUT_GROUPS, shortcutAction } from "@/lib/drugs/shortcuts";

/** Focus the desk's drug search, switching to the desk first when another view is open. */
function focusDrugSearch() {
  const desk = useDesk.getState();
  if (desk.view !== "desk") desk.setView("desk");
  let tries = 0;
  const attempt = () => {
    const el = document.getElementById("drug-search");
    if (el instanceof HTMLInputElement && !el.disabled) {
      el.focus();
      el.scrollIntoView({ block: "center" });
      return;
    }
    if (el) el.scrollIntoView({ block: "center" });
    if (++tries < 20) window.requestAnimationFrame(attempt);
  };
  attempt();
}

function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      {keys.map((k) => (
        <kbd key={k} className="min-w-6 rounded-xs bg-bg-sunken px-1.5 py-0.5 text-center font-mono text-[11px] text-fg shadow-[var(--shadow-border)]">
          {k}
        </kbd>
      ))}
    </span>
  );
}

/**
 * "?" opens a sheet of the desk's keyboard shortcuts and "/" jumps to the drug
 * search. Neither fires while typing in a field or while another dialog is open.
 * The footer button opens the sheet on touch screens.
 */
export function ShortcutSheet() {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (open) return;
      const action = shortcutAction(e, e.target instanceof Element ? (e.target as HTMLElement) : null);
      if (!action) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      e.preventDefault();
      if (action === "sheet") {
        opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setOpen(true);
      } else focusDrugSearch();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-keyshortcuts="?"
          onClick={(e) => {
            opener.current = e.currentTarget;
          }}
          className="inline-flex min-h-11 items-center gap-1 underline sm:min-h-0"
        >
          <Keyboard aria-hidden className="size-3" />
          Keyboard shortcuts
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Content
          className="fixed inset-x-4 top-4 z-50 mx-auto max-h-[calc(100vh-2rem)] max-w-md overflow-y-auto rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:top-[12vh]"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            (opener.current?.isConnected ? opener.current : document.getElementById("main"))?.focus();
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="font-serif text-xl tracking-tight text-fg">Keyboard shortcuts</Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-muted">
                Single keys work when you are not typing in a field.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close">
                <X className="size-4" aria-hidden />
              </Button>
            </Dialog.Close>
          </div>
          {SHORTCUT_GROUPS.map((g) => (
            <section key={g.title} className="mt-4">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{g.title}</h3>
              <dl className="mt-2 space-y-2">
                {g.items.map((s) => (
                  <div key={s.label} className="flex items-center justify-between gap-3 rounded-md bg-bg px-3 py-2">
                    <dt className="text-sm text-fg">{s.label}</dt>
                    <dd className="flex flex-col items-end gap-1">
                      <Keys keys={s.keys} />
                      {s.mac ? (
                        <span className="flex items-center gap-1 text-[10px] text-subtle">
                          Mac <Keys keys={s.mac} />
                        </span>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
