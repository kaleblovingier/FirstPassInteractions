import { createFileRoute } from "@tanstack/react-router";

/** LTI 1.3 course links (login, launch, jwks, config). Off unless LTI_ENABLED is "1": 404 otherwise. */
export const Route = createFileRoute("/api/lti/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { handleLtiRequest } = await import("@/lib/lti/lti.server");
        return handleLtiRequest(request);
      },
      POST: async ({ request }) => {
        const { handleLtiRequest } = await import("@/lib/lti/lti.server");
        return handleLtiRequest(request);
      },
    },
  },
});
