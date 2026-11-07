/**
 * What the server says about a key a desk already holds (`recheckLicense` in ./license).
 *
 * - valid: the signature verifies, and a program key has not ended. Plan and term come from the key.
 * - invalid: the server checked, and the key is not one FirstPass issued or its program term is over.
 * - unavailable: the server could not check (license secrets unset). Says nothing about the key.
 *
 * A desk that cannot reach the server at all (offline, or a static copy with no server functions)
 * gets no verdict and keeps what it has, so this raises the bar without locking out paid desks.
 */
import type { ProgramGrant } from "./program-license";

export type LicenseVerdict =
  | { status: "valid"; plan: "pro" | "lab"; lifetime: boolean; license: string; program: ProgramGrant | null }
  | { status: "invalid" }
  | { status: "unavailable" };

/** Shown once when a saved key fails the server check and the desk goes back to free. */
export const KEY_NOT_VERIFIED_NOTE =
  "The key saved on this desk did not verify, so this desk is back to free. Redeem the key you were sent on Plans, or use Lost key to have it sent again.";
