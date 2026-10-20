import { createFileRoute } from "@tanstack/react-router";
import { siteOgMeta } from "@/lib/seo/og-meta";
import { TrustView } from "@/components/seo/trust-page";
import { TRUST_DESCRIPTION, TRUST_TITLE, TRUST_URL } from "@/lib/seo/trust";

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: TRUST_TITLE },
      { name: "description", content: TRUST_DESCRIPTION },
      ...siteOgMeta({ title: TRUST_TITLE, description: TRUST_DESCRIPTION, url: TRUST_URL }),
    ],
    links: [{ rel: "canonical", href: TRUST_URL }],
  }),
  component: TrustView,
});
