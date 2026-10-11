/**
 * Spaced review for study cards.
 * A miss is due immediately. Got it waits 1 day, then 3, then 7, then 21.
 * Teaching intervals only — not a dosing schedule.
 */

export type StudyGrade = "got" | "miss";

export interface StudyMark {
  mark: StudyGrade;
  /** Epoch ms when the card should return to the Due pile. */
  nextReview: number;
  /** Successful recalls in a row. A miss resets this to 0. */
  streak: number;
}

const DAY = 86_400_000;
const HOUR = 3_600_000;
/** Index 0 is the first successful recall. Further recalls stay at 21 days. */
const GOT_DAYS = [1, 3, 7, 21] as const;

export function scheduleStudyMark(
  prev: StudyMark | undefined,
  grade: StudyGrade,
  now = Date.now(),
): StudyMark {
  if (grade === "miss") return { mark: "miss", nextReview: now, streak: 0 };
  const streak = (prev?.mark === "got" ? prev.streak : 0) + 1;
  const days = GOT_DAYS[Math.min(streak, GOT_DAYS.length) - 1];
  return { mark: "got", nextReview: now + days * DAY, streak };
}

export function isDue(mark: StudyMark | undefined, now = Date.now()): boolean {
  return Boolean(mark && mark.nextReview <= now);
}

export function duePhrase(mark: StudyMark, now = Date.now()): string {
  const delta = mark.nextReview - now;
  if (delta <= 0) return "due now";
  const hours = Math.round(delta / HOUR);
  if (hours < 24) return hours <= 1 ? "due in 1 hour" : `due in ${hours} hours`;
  const days = Math.round(hours / 24);
  return days === 1 ? "due in 1 day" : `due in ${days} days`;
}

/** Accepts the current object shape and the older `"got" | "miss"` strings in localStorage. */
export function normalizeStudyMarks(raw: unknown, now = Date.now()): Record<string, StudyMark> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, StudyMark> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    const mark = coerceStudyMark(value, now);
    if (mark) out[id] = mark;
  }
  return out;
}

function coerceStudyMark(value: unknown, now: number): StudyMark | null {
  if (value === "miss") return { mark: "miss", nextReview: now, streak: 0 };
  if (value === "got") return { mark: "got", nextReview: now + DAY, streak: 1 };
  if (!value || typeof value !== "object") return null;
  const row = value as { mark?: unknown; nextReview?: unknown; streak?: unknown };
  if (row.mark !== "got" && row.mark !== "miss") return null;
  const nextReview =
    typeof row.nextReview === "number" && Number.isFinite(row.nextReview)
      ? row.nextReview
      : row.mark === "miss"
        ? now
        : now + DAY;
  if (row.mark === "miss") return { mark: "miss", nextReview: Math.min(nextReview, now), streak: 0 };
  const streak =
    typeof row.streak === "number" && Number.isFinite(row.streak) && row.streak > 0
      ? Math.floor(row.streak)
      : 1;
  return { mark: "got", nextReview, streak };
}
