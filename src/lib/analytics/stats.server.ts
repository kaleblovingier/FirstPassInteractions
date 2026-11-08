import { STATS_RANGES, type StatsRange, type StatsResult } from "./contract";
import { getSiteStatsFromStore } from "./store.server";
import { pinRefusal } from "../billing/license.server";

export async function handleGetSiteStats(data: { pin: string; days: StatsRange }): Promise<StatsResult> {
  if (!data || typeof data !== "object") {
    return { ok: false, reason: "Invalid request payload." };
  }

  const refusal = await pinRefusal(data.pin ?? "");
  if (refusal) {
    return { ok: false, reason: refusal };
  }

  const days: StatsRange = STATS_RANGES.includes(data.days) ? data.days : 30;
  const stats = await getSiteStatsFromStore(days);
  return { ok: true, stats };
}
