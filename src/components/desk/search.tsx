import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { DRUG_BY_ID, searchDrugs } from "@/lib/drugs/catalog";
import { combinationParts, findCombination, planCombination, type CombinationHit } from "@/lib/drugs/combos";
import { availableQuickChips } from "@/lib/drugs/quick-chips";
import { ITEM_KIND_LABEL, type EnzymeRole } from "@/lib/drugs/types";
import { suggestSpellings } from "@/lib/drugs/spelling";
import { isMatDesk } from "@/lib/drugs/window";
import { plateForDrug } from "@/lib/drugs/visuals";
import { useDesk, usePlan } from "@/lib/drugs/store";
import { maxDrugs } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

const SLASH_STORAGE_KEY = "firstpass.slash.v1";

function slashShortcutOff(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SLASH_STORAGE_KEY) === "off";
  } catch {
    return false;
  }
}

function ignoresSlash(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return true;
  }
  if (target instanceof HTMLElement && target.isContentEditable) return true;
  return target.closest('[contenteditable="true"]') !== null;
}

export function DrugSearch() {
  const selected = useDesk((s) => s.selected);
  const add = useDesk((s) => s.add);
  const setView = useDesk((s) => s.setView);
  const plan = usePlan();
  const cap = maxDrugs(plan);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [slashOff, setSlashOff] = useState(false);
  const [note, setNote] = useState("");
  const slashOffRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchDrugs(q), [q]);
  // A combination name (Percocet) leads the list as one option that adds every ingredient.
  const combo = useMemo(() => findCombination(q), [q]);
  const lead = combo ? 1 : 0;
  const comboOnDesk = combo ? combo.ids.every((id) => selected.includes(id)) : false;
  // Click-only "Did you mean": kept out of the listbox so Enter never adds a look-alike guess.
  const suggestions = useMemo(
    () => (q.trim() && results.length === 0 && !combo ? suggestSpellings(q) : []),
    [q, results, combo],
  );

  useEffect(() => {
    setActive(0);
  }, [q, results.length]);

  useEffect(() => {
    const off = slashShortcutOff();
    slashOffRef.current = off;
    setSlashOff(off);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Storage is the source of truth unless a write failed and only the ref updated.
    const stored = slashShortcutOff();
    if (stored === slashOff) slashOffRef.current = stored;
    function onKey(e: KeyboardEvent) {
      if (slashOffRef.current) return;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      if (ignoresSlash(e.target)) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slashOff]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const full = selected.length >= cap;
  const mat = isMatDesk(selected);

  function pick(id: string) {
    add(id);
    setNote("");
    setQ("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function pickCombo(c: CombinationHit) {
    const plan = planCombination(c, selected, cap);
    for (const id of plan.add) add(id);
    setNote(plan.message);
    if (plan.add.length) setQ("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function toggleSlash() {
    const nextOff = !slashOff;
    if (typeof window !== "undefined") {
      try {
        if (nextOff) window.localStorage.setItem(SLASH_STORAGE_KEY, "off");
        else window.localStorage.removeItem(SLASH_STORAGE_KEY);
      } catch {
        /* storage blocked; the in-memory switch still applies */
      }
    }
    const stored = slashShortcutOff();
    const off = stored === nextOff ? stored : nextOff;
    slashOffRef.current = off;
    setSlashOff(off);
  }

  return (
    <div>
      {/* Wraps below about 400px: the / key switch drops under the field, so the field and its
          placeholder keep the full row on a phone instead of losing a third of it. */}
      <div className="flex flex-wrap items-start justify-end gap-2">
      <div
        ref={rootRef}
        className="relative min-w-[min(100%,16rem)] flex-1"
        onBlur={(e) => {
          // WCAG 2.4.11 / 1.4.13: close the suggestion list when keyboard focus leaves the
          // search, so the open list can't cover the controls that receive focus next.
          const next = e.relatedTarget as Node | null;
          if (next && !e.currentTarget.contains(next)) setOpen(false);
        }}
      >
        <label className="sr-only" htmlFor="drug-search">
          Search medicines and other substances
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <input
        id="drug-search"
        ref={inputRef}
        value={q}
        disabled={full}
        onChange={(e) => {
          setQ(e.target.value);
          setNote("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && !full && (results.length > 0 || Boolean(q.trim()))}
        aria-controls="drug-search-results"
        aria-activedescendant={
          !open
            ? undefined
            : combo && active === 0
              ? "drug-option-combination"
              : results[active - lead]
                ? `drug-option-${results[active - lead].id}`
                : undefined
        }
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, Math.max(results.length + lead - 1, 0)));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (combo && active === 0) {
              pickCombo(combo);
              return;
            }
            const hit = results[active - lead];
            if (hit && !selected.includes(hit.id)) pick(hit.id);
          } else if (e.key === "Escape") {
            // Close the list but keep focus in the field (blurring dropped focus to <body>).
            setOpen(false);
          }
        }}
        placeholder={
          full
            ? `${cap} items added · remove one to add another`
            : selected.length === 1
              ? "Add a second item: brand, generic, or salt form"
              : mat
                ? "Try methadone, clonidine, or naloxone"
                : "Try Ozempic, xylazine, or metformin HCl"
        }
        className="h-12 w-full rounded-lg bg-surface-2 pl-10 pr-10 text-sm text-fg shadow-[var(--shadow-border)] placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-60"
        autoComplete="off"
        spellCheck={false}
        />
        {q ? (
          <button
          type="button"
          aria-label="Clear search"
          className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-sm text-subtle hover:bg-bg-sunken hover:text-fg"
          onClick={() => {
            setQ("");
            inputRef.current?.focus();
          }}
        >
          <X className="size-4" />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-xs bg-bg-sunken px-1.5 py-0.5 font-mono text-[10px] text-subtle sm:inline">
            /
          </kbd>
        )}

      {open && (results.length > 0 || combo) && !full ? (
        <ul
          id="drug-search-results"
          role="listbox"
          aria-label="Matching medicines and substances"
          className="absolute z-30 mt-2 max-h-80 w-full overflow-auto rounded-lg bg-surface-2 py-1 shadow-[var(--shadow-border)]"
        >
          {combo ? (
            <li>
              <button
                id="drug-option-combination"
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={active === 0}
                aria-disabled={comboOnDesk ? true : undefined}
                className={cn(
                  "flex w-full items-start gap-3 px-3 py-2.5 text-left",
                  active === 0 ? "bg-accent-soft" : "hover:bg-bg-sunken",
                )}
                onMouseEnter={() => setActive(0)}
                onClick={() => pickCombo(combo)}
              >
                <img
                  src={plateForDrug(DRUG_BY_ID[combo.ids[0]])}
                  alt=""
                  className="mt-0.5 size-10 shrink-0 rounded-sm object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-fg">
                    {combo.name} → {combinationParts(combo.ids)}
                  </span>
                  <span className="block truncate text-xs text-muted" title={combo.source}>
                    Combination · label: {combo.source}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-subtle">
                  {comboOnDesk ? "On desk" : combo.ids.length > 1 ? `Adds ${combo.ids.length}` : "Own row"}
                </span>
              </button>
            </li>
          ) : null}
          {results.map((drug, i) => {
            const onDesk = selected.includes(drug.id);
            return (
            <li key={drug.id}>
              <button
                id={`drug-option-${drug.id}`}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={i + lead === active}
                aria-disabled={onDesk ? true : undefined}
                aria-label={onDesk ? `${drug.name}, already on the desk` : undefined}
                className={cn(
                  "flex w-full items-start gap-3 px-3 py-2.5 text-left",
                  i + lead === active ? "bg-accent-soft" : "hover:bg-bg-sunken",
                )}
                onMouseEnter={() => setActive(i + lead)}
                onClick={() => {
                  if (onDesk) return;
                  pick(drug.id);
                }}
              >
                <img
                  src={plateForDrug(drug)}
                  alt=""
                  className="mt-0.5 size-10 shrink-0 rounded-sm object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-fg">{drug.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {drug.kind !== "drug" ? `${ITEM_KIND_LABEL[drug.kind]} · ` : ""}
                    {drug.cls}
                    {drug.brands.length ? ` · ${drug.brands.slice(0, 2).join(", ")}` : ""}
                    {drug.aliases[0] ? ` · also ${drug.aliases[0]}` : ""}
                  </span>
                </span>
                {onDesk ? (
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-subtle">
                    On desk
                  </span>
                ) : (
                <span
                  className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-subtle"
                  title="Mapped enzyme involvement; see the result details for an explanation."
                >
                  {drug.enzymes
                    .filter(
                      (e): e is Extract<EnzymeRole, { kind: "inhibitor" | "inducer" }> =>
                        e.kind !== "substrate",
                    )
                    .slice(0, 2)
                    .map((e) => `${e.strength} ${e.enzyme.replace("CYP", "")}`)
                    .join(" ") ||
                    (() => {
                      const first = drug.enzymes[0];
                      if (!first || first.kind !== "substrate") return first?.enzyme;
                      const label = `${first.sensitivity} ${first.enzyme.replace("CYP", "")}`;
                      return first.pathway === "activation" ? `${label} activation` : label;
                    })() ||
                    ITEM_KIND_LABEL[drug.kind]}
                </span>
                )}
              </button>
            </li>
            );
          })}
        </ul>
      ) : null}
        {open && !full && q.trim() && results.length === 0 && !combo ? (
          <div
            role="status"
            className="absolute z-30 mt-2 w-full rounded-lg bg-surface-2 px-4 py-3 text-sm leading-relaxed text-muted shadow-[var(--shadow-border)]"
          >
            <p>No match for “{q.trim()}”. Try the generic, a brand, or drop the salt (HCl, XL, ER).</p>
            <p className="mt-1 text-xs">No match does not mean an interaction is absent or a combination is safe.</p>
            {suggestions.length ? (
              <div className="mt-2">
                <p className="text-xs font-medium text-fg">
                  Did you mean {suggestions.length === 1 ? "this" : `one of these ${suggestions.length}`}? Click to add;
                  Enter won’t pick a guess.
                  {suggestions.length > 1 ? " These names look alike: check the class before you add one." : ""}
                </p>
                <ul aria-label="Spelling suggestions" className="mt-1.5 flex flex-wrap gap-1.5">
                  {suggestions.map((s) => {
                    const ids = s.drug ? [s.drug.id] : s.combo.ids;
                    const onDesk = ids.every((id) => selected.includes(id));
                    return (
                      <li key={ids.join("+")}>
                        <button
                          type="button"
                          disabled={onDesk}
                          className="min-h-9 rounded-md bg-bg-sunken px-2.5 py-1 text-left text-xs text-fg hover:bg-accent-soft disabled:opacity-60 pointer-coarse:min-h-11"
                          onClick={() => (s.drug ? pick(s.drug.id) : pickCombo(s.combo))}
                        >
                          <span className="font-medium">{s.label}</span>
                          <span className="text-muted">
                            {s.drug
                              ? ` · ${s.label === s.drug.name ? "" : `${s.drug.name} · `}${s.drug.cls}`
                              : ` · Combination: ${combinationParts(s.combo.ids)}`}
                            {onDesk ? " · on desk" : ""}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {["grapefruit", "clarithromycin", "xylazine", "semaglutide"].map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    className="min-h-9 rounded-full bg-bg-sunken px-2.5 py-1 text-xs font-medium text-fg hover:bg-accent-soft pointer-coarse:min-h-11"
                    onClick={() => {
                      setQ(hint);
                      setOpen(true);
                      inputRef.current?.focus();
                    }}
                  >
                    Try {hint}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              className="mt-2 min-h-10 rounded-md px-2 text-sm pointer-coarse:min-h-11 font-medium text-accent underline underline-offset-2 hover:bg-accent-soft"
              onClick={() => setView("library")}
            >
              Browse the full library
            </button>
          </div>
        ) : null}
      </div>
        <button
          type="button"
          aria-pressed={slashOff}
          onClick={toggleSlash}
          className="h-12 shrink-0 whitespace-nowrap rounded-lg bg-bg-sunken px-3 text-xs font-medium text-fg shadow-[var(--shadow-border)] hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          {slashOff ? "Turn on / key" : "Turn off / key"}
        </button>
      </div>
      {note ? (
        <p role="status" className="mt-2 px-1 text-xs leading-relaxed text-fg">
          {note}
        </p>
      ) : null}
      {!q && !full ? (
        <div className="mt-2 space-y-2 px-1">
          {selected.length < 2 ? (
            <p className="text-xs leading-relaxed text-muted">
              {slashOff ? (
                "The / key is off. Search a name, or tap a starter below. Add two items to see mapped pair findings."
              ) : (
                <>
                  <span className="pointer-coarse:hidden">
                    Press <kbd className="rounded-xs bg-bg-sunken px-1 font-mono text-[10px]">/</kbd> to focus.{" "}
                  </span>
                  Search a name, or tap a starter below. Add two items to see mapped pair findings.
                </>
              )}
            </p>
          ) : null}
          <div role="group" className="flex flex-wrap gap-1.5" aria-label="Quick-add teaching starters">
            {availableQuickChips(selected).map((chip) => (
              <button
                key={chip.id}
                type="button"
                title={chip.hint}
                onClick={() => pick(chip.id)}
                className="h-9 rounded-full bg-bg-sunken px-3 text-xs font-medium text-fg hover:bg-accent-soft pointer-coarse:h-11"
              >
                {chip.label}
                <span className="ml-1.5 text-[10px] font-normal text-muted">{chip.hint}</span>
              </button>
            ))}
          </div>
        </div>
      ) : selected.length < 2 && !q ? (
        <p className="mt-2 px-1 text-xs leading-relaxed text-muted">
          <span className="pointer-coarse:hidden">
            Press <kbd className="rounded-xs bg-bg-sunken px-1 font-mono text-[10px]">/</kbd> to focus.{" "}
          </span>
          Search generic, brand, salt form, or street name, then add a second item to see pair findings.
        </p>
      ) : null}
    </div>
  );
}
