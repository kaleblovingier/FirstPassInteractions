/**
 * Count object fields and array slots before a schema walks them.
 * zod before 4.6.6 checks every element of an oversized array before `.max()` refuses it,
 * so callers check this budget first. A cycle runs out of budget instead of spinning.
 */

export const MAX_INPUT_NODES = 1_000;

export function withinNodeBudget(value: unknown, budget = MAX_INPUT_NODES): boolean {
  const stack: unknown[] = [value];
  let left = budget;
  while (stack.length) {
    const v = stack.pop();
    if (!v || typeof v !== "object") continue;
    const kids = Array.isArray(v) ? v : Object.values(v);
    left -= kids.length;
    if (left < 0) return false;
    stack.push(...kids); // at most `budget` items, so the spread stays small
  }
  return true;
}
