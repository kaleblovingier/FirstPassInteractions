import { createServerFn } from "@tanstack/react-start";
import { DRUG_BY_ID } from "./catalog";
import type { LiveResult } from "./pubmed";
import { SearchInput, checkInput } from "../server/rpc-input";

export const searchPubmed = createServerFn({ method: "POST" })
  .validator((input: unknown) => checkInput("searchPubmed", SearchInput, input))
  .handler(async ({ data }): Promise<LiveResult> => {
    if (!data.ok) return { ok: false, hits: [], reason: "Query too short.", query: "" };
    const names = data.value.ids.map((id) => DRUG_BY_ID[id]!.name);
    const q =
      data.value.query.trim() ||
      (names.length >= 2
        ? `${names[0]} AND ${names[1]} AND (drug interaction OR CYP OR cytochrome)`
        : names.length === 1
          ? `${names[0]} AND (drug interaction OR pharmacokinetics OR CYP)`
          : "");
    if (q.length < 3) return { ok: false, hits: [], reason: "Query too short.", query: q };
    const { searchLive } = await import("./pubmed.server");
    return searchLive(q);
  });
