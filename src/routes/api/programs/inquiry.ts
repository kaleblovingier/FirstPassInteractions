import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/programs/inquiry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleInquiryRequest } = await import("@/lib/billing/program-inquiry.server");
        return handleInquiryRequest(request);
      },
    },
  },
});
