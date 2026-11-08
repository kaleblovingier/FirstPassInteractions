import { createServerFn } from "@tanstack/react-start";
import {
  billingRejected,
  checkBillingInput,
  MintApiInput,
  MintBatchInput,
  MintLicenseInput,
  MintProgramInput,
  RedeemInput,
  type BillingChecked,
} from "./rpc-input";
import type { LicenseVerdict } from "./license-verdict";

type RedeemBody = BillingChecked<{ key: string }>;
type MintBody = BillingChecked<{ pin: string; plan: "pro" | "lab" | "life"; soldTo: string }>;
type ProgramBody = BillingChecked<{ pin: string; tier: "team" | "program" | "site"; org: string; end: string }>;
type ApiBody = BillingChecked<{ pin: string; tier: "developer" | "education"; org: string; end: string }>;
type BatchBody = BillingChecked<{ pin: string; plan: "pro" | "lab" | "life"; names: string }>;

export async function handleRedeemLicense(data: RedeemBody) {
  if (!data.ok) return billingRejected();
  const { verifyKey } = await import("./license.server");
  if (!data.value.key.trim()) return { ok: false as const, reason: "Paste a key." };
  return verifyKey(data.value.key);
}

/**
 * Server check of a key the desk saved earlier. The paid unlock lives in the browser, so the desk
 * asks this on load rather than trusting its own storage. Mints nothing, stores nothing, and does
 * not echo why a key failed.
 */
export async function handleRecheckLicense(data: RedeemBody): Promise<LicenseVerdict> {
  if (!data.ok || !data.value.key.trim()) return { status: "invalid" };
  const { licenseSecretsReady, verifyKey } = await import("./license.server");
  if (!licenseSecretsReady()) return { status: "unavailable" };
  const res = verifyKey(data.value.key);
  if (!res.ok) return { status: "invalid" };
  return { status: "valid", plan: res.plan, lifetime: res.lifetime, license: res.license, program: res.program ?? null };
}

export async function handleMintLicenseKey(data: MintBody) {
  if (!data.ok) return billingRejected();
  const { mintKey, mintKeyFromNote, pinOk, defaultPinSet, defaultPepperSet } = await import("./license.server");
  try {
    if (!(await pinOk(data.value.pin))) {
      return { ok: false as const, reason: "Operator PIN is wrong." };
    }
    const plan = data.value.plan;
    const soldTo = data.value.soldTo.trim();
    return {
      ok: true as const,
      key: soldTo ? mintKeyFromNote(plan, soldTo) : mintKey(plan),
      plan,
      defaultPin: defaultPinSet(),
      defaultPepper: defaultPepperSet(),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "License secrets are not configured.";
    return { ok: false as const, reason: msg };
  }
}

/**
 * Program key for a whole organization (FP-ORG-…). PIN-checked like
 * mintLicenseKey. `end` is the last month the key works, as "YYYY-MM".
 */
export async function handleMintProgramLicense(data: ProgramBody) {
  if (!data.ok) return billingRejected();
  const { mintProgramForOperator } = await import("./license.server");
  return mintProgramForOperator(data.value);
}

/**
 * API key for /api/cds/* (FP-API-…). PIN-checked like every operator mint.
 * `end` is the last month the key works, as "YYYY-MM".
 */
export async function handleMintApiKey(data: ApiBody) {
  if (!data.ok) return billingRejected();
  const { mintApiKeyForOperator } = await import("./api-keys.server");
  return mintApiKeyForOperator(data.value);
}

export async function handleMintLicenseBatch(data: BatchBody) {
  if (!data.ok) return billingRejected();
  const { mintKeyedRows, parseNameList, pinOk, defaultPinSet, defaultPepperSet } = await import("./license.server");
  try {
    if (!(await pinOk(data.value.pin))) {
      return { ok: false as const, reason: "Operator PIN is wrong." };
    }
    const names = parseNameList(data.value.names);
    if (!names.length) {
      return { ok: false as const, reason: "Add at least one name — one per line." };
    }
    const plan = data.value.plan;
    return {
      ok: true as const,
      plan,
      keys: mintKeyedRows(plan, names),
      defaultPin: defaultPinSet(),
      defaultPepper: defaultPepperSet(),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "License secrets are not configured.";
    return { ok: false as const, reason: msg };
  }
}

export const redeemLicense = createServerFn({ method: "POST" })
  .validator((input: unknown) => checkBillingInput("redeemLicense", RedeemInput, input))
  .handler(async ({ data }) => handleRedeemLicense(data));

export const recheckLicense = createServerFn({ method: "POST" })
  .validator((input: unknown) => checkBillingInput("recheckLicense", RedeemInput, input))
  .handler(async ({ data }) => handleRecheckLicense(data));

export const mintLicenseKey = createServerFn({ method: "POST" })
  .validator((input: unknown) => checkBillingInput("mintLicenseKey", MintLicenseInput, input))
  .handler(async ({ data }) => handleMintLicenseKey(data));

export const mintProgramLicense = createServerFn({ method: "POST" })
  .validator((input: unknown) => checkBillingInput("mintProgramLicense", MintProgramInput, input))
  .handler(async ({ data }) => handleMintProgramLicense(data));

export const mintApiLicense = createServerFn({ method: "POST" })
  .validator((input: unknown) => checkBillingInput("mintApiLicense", MintApiInput, input))
  .handler(async ({ data }) => handleMintApiKey(data));

export const mintLicenseBatch = createServerFn({ method: "POST" })
  .validator((input: unknown) => checkBillingInput("mintLicenseBatch", MintBatchInput, input))
  .handler(async ({ data }) => handleMintLicenseBatch(data));
