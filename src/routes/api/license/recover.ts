import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/license/recover")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleRecoverRequest } = await import("@/lib/billing/recover.server");
        return handleRecoverRequest(request);
      },
    },
  },
});
