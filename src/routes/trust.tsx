import { createFileRoute } from "@tanstack/react-router";
import { breadcrumbMeta, HOME_CRUMB } from "@/lib/seo/breadcrumbs";
import { siteOgMeta } from "@/lib/seo/og-meta";
import { TrustView } from "@/components/seo/trust-page";
import { TRUST_DESCRIPTION, TRUST_TITLE, TRUST_URL } from "@/lib/seo/trust";

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      breadcrumbMeta([HOME_CRUMB, { name: "Trust", url: TRUST_URL }]),
      { title: TRUST_TITLE },
      { name: "description", content: TRUST_DESCRIPTION },
      ...siteOgMeta({ title: TRUST_TITLE, description: TRUST_DESCRIPTION, url: TRUST_URL }),
    ],
    links: [{ rel: "canonical", href: TRUST_URL }],
  }),
  component: TrustView,
});
