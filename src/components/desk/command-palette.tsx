import { useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { Search, X } from "lucide-react";
import { isPaletteShortcut, paletteGroups, type PaletteItem } from "@/lib/drugs/palette";
import { useDesk } from "@/lib/drugs/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Ctrl+K / ⌘K palette: go to a desk view, clinical station or page, or add a
 * drug to the tray. The header button opens it on touch screens.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = useDesk((s) => s.selected);
  const groups = useMemo(() => paletteGroups(query), [query]);
  const opener = useRef<HTMLElement | null>(null);
  // Off when the pick moves focus itself: to a station, a new page, or the checkout drawer a full tray opens.
  const restore = useRef(true);

  function show(from: Element | null) {
    opener.current = from instanceof HTMLElement && from !== document.body ? from : null;
    restore.current = true;
    setQuery("");
    setOpen(true);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!isPaletteShortcut(e)) return;
      // Another open dialog (checkout, clinical packet) keeps the keyboard.
      if (!open && document.querySelector('[aria-modal="true"]')) return;
      e.preventDefault();
      if (e.repeat) return;
      if (open) setOpen(false);
      else show(document.activeElement);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function run(item: PaletteItem) {
    const desk = useDesk.getState();
    if (item.kind === "view") desk.setView(item.id);
    else if (item.kind === "station") {
      restore.current = false;
      desk.openStation(item.id);
    } else if (item.kind === "page") {
      restore.current = false;
      window.location.assign(item.id);
    } else if (!desk.add(item.id)) restore.current = false;
    setOpen(false);
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        className="h-11 w-full justify-start sm:h-9 sm:w-auto"
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K"
        onClick={(e) => show(e.currentTarget)}
      >
        <Search className="size-4 text-muted" aria-hidden />
        Search everything
        <kbd aria-hidden className="ml-auto hidden rounded-xs bg-bg-sunken px-1.5 py-0.5 font-mono text-[10px] text-subtle sm:inline">
          Ctrl K
        </kbd>
      </Button>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
          <Dialog.Content
            className="fixed inset-x-4 top-4 z-50 mx-auto max-w-xl overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)] sm:top-[12vh]"
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              if (restore.current) (opener.current?.isConnected ? opener.current : document.getElementById("main"))?.focus();
            }}
          >
            <Dialog.Title className="sr-only">Search everything</Dialog.Title>
            <Dialog.Description className="sr-only">
              Go to a desk view, clinical station or page, or add a drug to the tray.
            </Dialog.Description>
            <Command label="Search everything" shouldFilter={false} vimBindings={false}>
              <div className="flex items-center gap-2 border-b border-border p-3">
                <Command.Input asChild value={query} onValueChange={setQuery}>
                  <Input placeholder="Drug, station, view or page" />
                </Command.Input>
                <Dialog.Close asChild>
                  <Button variant="ghost" size="icon" aria-label="Close">
                    <X className="size-4" aria-hidden />
                  </Button>
                </Dialog.Close>
              </div>
              <Command.List label="Results" className="max-h-[min(24rem,60vh)] overflow-y-auto overscroll-contain p-2">
                {groups.map((g) => (
                  <Command.Group
                    key={g.kind}
                    heading={
                      <span className="block px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-wide text-muted">
                        {g.kind === "station" && !selected.length ? `${g.label} · add a drug to the tray first` : g.label}
                      </span>
                    }
                  >
                    {g.items.map((item) => {
                      const onTray = item.kind === "drug" && selected.includes(item.id);
                      const locked = item.kind === "station" && !selected.length;
                      return (
                        <Command.Item
                          key={item.id}
                          value={`${item.kind}:${item.id}`}
                          disabled={onTray || locked}
                          onSelect={() => run(item)}
                          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-2 data-[disabled=true]:cursor-default data-[selected=true]:bg-accent-soft data-[selected=true]:shadow-[inset_0_0_0_2px_var(--color-accent)]"
                        >
                          <span className="min-w-0 flex-1">
                            <span className={cn("block truncate text-sm font-medium", locked ? "text-muted" : "text-fg")}>
                              {item.label}
                            </span>
                            {item.hint ? <span className="block truncate text-xs text-muted">{item.hint}</span> : null}
                          </span>
                          {onTray ? (
                            <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-subtle">On desk</span>
                          ) : null}
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                ))}
              </Command.List>
              <p role="status" className={groups.length ? "sr-only" : "px-4 pb-5 text-center text-sm text-muted"}>
                {groups.length ? "" : `No match for “${query.trim()}”. Try a drug's generic or brand name, or a station such as QT.`}
              </p>
            </Command>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
