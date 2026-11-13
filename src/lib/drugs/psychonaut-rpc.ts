import { createServerFn } from "@tanstack/react-start";
import type { PsychonautPack } from "./psychonaut";
import { DESK_MAX_IDS, IdsInput, checkInput } from "../server/rpc-input";

export const lookupPsychonaut = createServerFn({ method: "POST" })
  .validator((input: unknown) => checkInput("lookupPsychonaut", IdsInput, input))
  .handler(async ({ data }): Promise<PsychonautPack> => {
    const ids = data.ok ? data.value.ids.slice(0, DESK_MAX_IDS) : [];
    if (ids.length === 0) return { ok: false, pages: [], combos: [] };
    const { lookupPsychonaut: pull } = await import("./psychonaut.server");
    return pull(ids);
  });
