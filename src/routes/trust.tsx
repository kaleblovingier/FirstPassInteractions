import { createFileRoute } from "@tanstack/react-router";
import { TrustView } from "@/components/seo/trust-page";
import { TRUST_DESCRIPTION, TRUST_TITLE, TRUST_URL } from "@/lib/seo/trust";

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: TRUST_TITLE },
      { name: "description", content: TRUST_DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: TRUST_URL }],
  }),
  component: TrustView,
});
