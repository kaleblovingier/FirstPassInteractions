import { createServerFn } from "@tanstack/react-start";
import type { ReaderNote } from "./readers";
import { ReaderBriefInput, checkInput } from "../server/rpc-input";

type ReadResult = { ok: true; readers: ReaderNote[] } | { ok: false; error: string };

export const readRegimen = createServerFn({ method: "POST" })
  .validator((input: unknown) => checkInput("readRegimen", ReaderBriefInput, input))
  .handler(async ({ data }): Promise<ReadResult> => {
    if (!data.ok) return { ok: false, error: "The readers could not read this check. Reload the desk and ask again." };
    if (data.value.names.length === 0) return { ok: false, error: "Add a name before asking the readers." };
    const { readWithBots } = await import("./readers.server");
    return readWithBots(data.value);
  });
