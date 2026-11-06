/** A report whose missing inputs took the sections they size with them; `inputsNeeded` says which. */
export type Unsized<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>> & { inputsNeeded: string };

/**
 * Nothing is sized or scored from a value that was not entered (an API call enters none).
 * Each row names an input, its entered value and the report sections that need it.
 */
export function withoutUnentered<T extends object, K extends keyof T>(
  report: T,
  rows: readonly (readonly [input: string, entered: unknown, sections: readonly K[]])[],
): T | Unsized<T, K> {
  const missing = rows.filter(([, entered]) => entered === undefined);
  const inputsNeeded = notEntered(missing.map(([input]) => input));
  if (inputsNeeded === undefined) return report;
  const kept = { ...report };
  for (const [, , sections] of missing) for (const section of sections) delete kept[section];
  return { ...kept, inputsNeeded };
}

/** The sentence a report carries for inputs that were not entered, if any; a `false` row was not needed. */
export function notEntered(inputs: readonly (string | false)[]): string | undefined {
  const missing = inputs.filter(Boolean);
  if (missing.length === 0) return undefined;
  return `Not entered: ${missing.join(", ")}. Nothing is sized or scored from a value that was not entered; enter them to see those sections.`;
}
