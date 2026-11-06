import { createServerFn } from "@tanstack/react-start";
import {
  billingRejected,
  checkBillingInput,
  CollectInput,
  DraftCollectedInput,
  type BillingChecked,
} from "./rpc-input";
import type { CollectRow } from "./collect.server";

type CollectBody = BillingChecked<{ pin: string; plan: "pro" | "lab" | "life"; names: string; hunt: string }>;
type DraftBody = BillingChecked<{ pin: string; rows: CollectRow[] }>;

type DraftResult =
  | { ok: false; reason: string; loginUrl?: string }
  | { ok: true; drafted: number };

export async function handleCollectLicenses(data: CollectBody) {
  if (!data.ok) return billingRejected();
  const { collectLicenses: run } = await import("./collect.server");
  return run(data.value);
}

export async function handleDraftCollected(data: DraftBody): Promise<DraftResult> {
  if (!data.ok) return billingRejected();
  const { draftCollected: run } = await import("./collect.server");
  return run(data.value);
}

export const collectLicenses = createServerFn({ method: "POST" })
  .validator((input: unknown) => checkBillingInput("collectLicenses", CollectInput, input))
  .handler(async ({ data }) => handleCollectLicenses(data));

export const draftCollected = createServerFn({ method: "POST" })
  .validator((input: unknown) => checkBillingInput("draftCollected", DraftCollectedInput, input))
  .handler(async ({ data }) => handleDraftCollected(data));
