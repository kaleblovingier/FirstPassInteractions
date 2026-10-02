import { createServerFn } from "@tanstack/react-start";
import { sanitizeBrief } from "./readers";

export const readRegimen = createServerFn({ method: "POST" })
  .validator((input: unknown) => sanitizeBrief(input))
  .handler(async ({ data }) => {
    const { readWithBots } = await import("./readers.server");
    return readWithBots(data);
  });
