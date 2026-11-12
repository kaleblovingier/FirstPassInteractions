/** Narrow a select's string value to one of its known options, or undefined when it is none of them. */
export function oneOf<T extends string>(options: readonly T[], value: string): T | undefined {
  return options.find((o) => o === value);
}
