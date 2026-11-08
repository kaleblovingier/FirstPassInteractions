import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stats")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleStatsRequest } = await import("@/lib/analytics/stats.server");
        return handleStatsRequest(request);
      },
    },
  },
});
