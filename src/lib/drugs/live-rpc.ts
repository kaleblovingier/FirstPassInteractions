import { createServerFn } from "@tanstack/react-start";
import { DRUG_BY_ID } from "./catalog";
import { EMPTY_LIVE, type LiveSources, type RxnavReport, type TrialResult } from "./live";
import { CpicInput, DESK_MAX_IDS, IdsInput, LiveInput, SearchInput, checkInput } from "../server/rpc-input";

function miss(query: string, reason: string, ok = false): LiveSources {
  return { ok, query, ...EMPTY_LIVE, reason };
}

export const lookupLiveSources = createServerFn({ method: "POST" })
  .validator((input: unknown) => checkInput("lookupLiveSources", LiveInput, input))
  .handler(async ({ data }): Promise<LiveSources> => {
    if (!data.ok) return miss("", "Not on this shelf.");
    const drug = DRUG_BY_ID[data.value.id]!;
    const { lookupLive } = await import("./live.server");
    return lookupLive(drug.id, drug.name);
  });

export const lookupRxnavInteractions = createServerFn({ method: "POST" })
  .validator((input: unknown) => checkInput("lookupRxnavInteractions", IdsInput, input))
  .handler(async ({ data }): Promise<RxnavReport> => {
    const ids = data.ok ? data.value.ids.filter((id) => DRUG_BY_ID[id]!.kind === "drug").slice(0, DESK_MAX_IDS) : [];
    if (ids.length < 2) {
      return { ok: true, rxcuis: [], pairs: [], classes: [], reason: "Put two labeled drugs on the desk." };
    }
    const { lookupInteractions } = await import("./rxnav.server");
    return lookupInteractions(ids);
  });

export const searchTrials = createServerFn({ method: "POST" })
  .validator((input: unknown) => checkInput("searchTrials", SearchInput, input))
  .handler(async ({ data }): Promise<TrialResult> => {
    if (!data.ok) return { ok: false, query: "", hits: [], reason: "Query too short." };
    const names = data.value.ids.map((id) => DRUG_BY_ID[id]!.name);
    const q = data.value.query.trim() || names.slice(0, 2).join(" ");
    if (q.length < 3) return { ok: false, query: q, hits: [], reason: "Query too short." };
    const { searchLiveTrials } = await import("./trials.server");
    return searchLiveTrials(q);
  });

export const lookupCpicGuideline = createServerFn({ method: "POST" })
  .validator((input: unknown) => checkInput("lookupCpicGuideline", CpicInput, input))
  .handler(async ({ data }) => {
    if (!data.ok) return { ok: false, query: "", hits: [], reason: "Not on this shelf." };
    const { lookupCpic } = await import("./cpic.server");
    return lookupCpic(data.value.name);
  });
