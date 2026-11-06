import { createServerFn } from "@tanstack/react-start";
import {
  billingRejected,
  checkBillingInput,
  MintBatchInput,
  MintLicenseInput,
  MintProgramInput,
  RedeemInput,
  type BillingChecked,
} from "./rpc-input";

type RedeemBody = BillingChecked<{ key: string }>;
type MintBody = BillingChecked<{ pin: string; plan: "pro" | "lab" | "life"; soldTo: string }>;
type ProgramBody = BillingChecked<{ pin: string; tier: "team" | "program" | "site"; org: string; end: string }>;
type BatchBody = BillingChecked<{ pin: string; plan: "pro" | "lab" | "life"; names: string }>;

export async function handleRedeemLicense(data: RedeemBody) {
  if (!data.ok) return billingRejected();
  const { verifyKey } = await import("./license.server");
  if (!data.value.key.trim()) return { ok: false as const, reason: "Paste a key." };
  return verifyKey(data.value.key);
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

export const mintLicenseKey = createServerFn({ method: "POST" })
  .validator((input: unknown) => checkBillingInput("mintLicenseKey", MintLicenseInput, input))
  .handler(async ({ data }) => handleMintLicenseKey(data));

export const mintProgramLicense = createServerFn({ method: "POST" })
  .validator((input: unknown) => checkBillingInput("mintProgramLicense", MintProgramInput, input))
  .handler(async ({ data }) => handleMintProgramLicense(data));

export const mintLicenseBatch = createServerFn({ method: "POST" })
  .validator((input: unknown) => checkBillingInput("mintLicenseBatch", MintBatchInput, input))
  .handler(async ({ data }) => handleMintLicenseBatch(data));
