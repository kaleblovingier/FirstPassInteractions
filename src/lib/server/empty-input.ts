import { z } from "zod";

/**
 * Server functions that read no client fields. `undefined` is the call with no
 * argument; `null` and `{}` are the same call after JSON. Any other shape is refused.
 */
export const NoClientInput = z.union([z.undefined(), z.null(), z.strictObject({})]);

export function assertNoClientInput(input: unknown): void {
  if (!NoClientInput.safeParse(input).success) {
    throw new Error("Invalid input.");
  }
}
