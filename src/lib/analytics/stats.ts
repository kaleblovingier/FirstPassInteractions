import { createServerFn } from "@tanstack/react-start";
import type { StatsRange, StatsResult } from "./contract";

/**
 * Owner-only visitor stats for the Foundry. The server checks the operator PIN before reading.
 * shortcut: stub until the collector lane lands; it then validates input and reads the store in stats.server.ts.
 */
export const getSiteStats = createServerFn({ method: "POST" })
  .validator((input: unknown) => input as { pin: string; days: StatsRange })
  .handler(async ({ data }): Promise<StatsResult> => {
    const { handleGetSiteStats } = await import("./stats.server");
    return handleGetSiteStats(data);
  });
