/** A compact brief the three readers may see. They do not get the catalog. */

export type ReaderId = "pair" | "gap" | "trainee";

export type ReaderBrief = {
  names: string[];
  lead: string;
  clock: string;
  watch: string;
  source: string;
  fold: string;
  hands: string;
  rows: { severity: string; line: string; why: string }[];
  quiet: string[];
  food: string[];
};

export type ReaderNote = {
  id: ReaderId;
  title: string;
  text: string;
  ok: boolean;
};

export const READER_TITLES: Record<ReaderId, string> = {
  pair: "Pair reader",
  gap: "Gap reader",
  trainee: "Trainee reader",
};

export function clip(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

export function sanitizeBrief(input: unknown): ReaderBrief {
  const src = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const names = Array.isArray(src.names) ? src.names.map((n) => clip(n, 80)).filter(Boolean).slice(0, 5) : [];
  const rowsIn = Array.isArray(src.rows) ? src.rows : [];
  const rows = rowsIn.slice(0, 6).map((row) => {
    const r = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
    return { severity: clip(r.severity, 24), line: clip(r.line, 180), why: clip(r.why, 240) };
  });
  const quiet = Array.isArray(src.quiet) ? src.quiet.map((n) => clip(n, 120)).filter(Boolean).slice(0, 12) : [];
  const food = Array.isArray(src.food) ? src.food.map((n) => clip(n, 180)).filter(Boolean).slice(0, 4) : [];
  return {
    names,
    lead: clip(src.lead, 320),
    clock: clip(src.clock, 240),
    watch: clip(src.watch, 240),
    source: clip(src.source, 160),
    fold: clip(src.fold, 160),
    hands: clip(src.hands, 240),
    rows,
    quiet,
    food,
  };
}
