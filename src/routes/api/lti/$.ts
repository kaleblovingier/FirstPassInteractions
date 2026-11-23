import { createFileRoute } from "@tanstack/react-router";

const dispatchLti = async ({ request }: { request: Request }) => {
  const { handleLtiRequest } = await import("@/lib/lti/lti.server");
  return handleLtiRequest(request);
};

/**
 * LTI 1.3 course links (login, launch, deep-link content picker, jwks, config).
 * Off unless LTI_ENABLED is "1": 404 otherwise.
 */
export const Route = createFileRoute("/api/lti/$")({
  server: {
    handlers: {
      GET: dispatchLti,
      POST: dispatchLti,
      PUT: dispatchLti,
      DELETE: dispatchLti,
      PATCH: dispatchLti,
      OPTIONS: dispatchLti,
    },
  },
});
