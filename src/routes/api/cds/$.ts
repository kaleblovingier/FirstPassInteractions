import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/cds/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { handleCdsRequest } = await import("@/lib/server/api/cds-handler.server");
        return handleCdsRequest(request);
      },
      POST: async ({ request }) => {
        const { handleCdsRequest } = await import("@/lib/server/api/cds-handler.server");
        return handleCdsRequest(request);
      },
    },
  },
});

