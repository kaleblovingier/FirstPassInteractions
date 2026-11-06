import { createServerFn } from "@tanstack/react-start";
import { assertNoClientInput } from "@/lib/server/empty-input";

export type ConnectorReadiness = { ready: boolean };

/** Reads the connector token already on the request. The body carries no fields. */
export const getConnectorReadiness = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    assertNoClientInput(input);
    return input;
  })
  .handler(async (): Promise<ConnectorReadiness> => {
    const { isConnectorTokenReady } = await import("./client.server.ts");
    return { ready: isConnectorTokenReady() };
  });
