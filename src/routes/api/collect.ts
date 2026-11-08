import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/collect")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleCollectRequest } = await import("@/lib/analytics/collect.server");
        return handleCollectRequest(request);
      },
    },
  },
});
