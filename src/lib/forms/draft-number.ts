/**
 * Number inputs that keep what the reader types and clamp only on blur.
 *
 * Clamping inside onChange rewrites the field on every keystroke: with a 20 kg floor,
 * typing "1" of "120" snaps to 20, and a cleared field snaps back to its default.
 * Here the text stays as typed; the calculation sees a value only once it is in range,
 * and leaving the field clamps it (a blank or unreadable field goes back to its default).
 */

import { useState, type ChangeEvent } from "react";

export type NumberBounds = { min: number; max?: number; fallback: number };

/** The typed number when it is in range, else null (keep the draft, leave the calculation alone). */
export function draftValue(raw: string, { min, max = Infinity }: NumberBounds): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

/** The value to keep when the field loses focus: clamped into range, or the default for blank / junk. */
export function settleDraft(raw: string, { min, max = Infinity, fallback }: NumberBounds): number {
  if (raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Props for a controlled number input: spread `{...field}` in place of value / onChange. */
export function useDraftNumber(value: number, commit: (next: number) => void, bounds: NumberBounds) {
  const [draft, setDraft] = useState<string | null>(null);
  return {
    value: draft ?? String(value),
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setDraft(raw);
      const next = draftValue(raw, bounds);
      if (next !== null) commit(next);
    },
    onBlur: () => {
      if (draft === null) return;
      commit(settleDraft(draft, bounds));
      setDraft(null);
    },
  };
}
