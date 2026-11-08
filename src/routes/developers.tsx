import { createFileRoute } from "@tanstack/react-router";
import { breadcrumbMeta, HOME_CRUMB } from "@/lib/seo/breadcrumbs";
import { siteOgMeta } from "@/lib/seo/og-meta";
import { DevelopersView } from "@/components/seo/developers-page";
import { DEVELOPERS_DESCRIPTION, DEVELOPERS_TITLE, DEVELOPERS_URL } from "@/lib/seo/developers";

export const Route = createFileRoute("/developers")({
  head: () => ({
    meta: [
      breadcrumbMeta([HOME_CRUMB, { name: "Developers", url: DEVELOPERS_URL }]),
      { title: DEVELOPERS_TITLE },
      { name: "description", content: DEVELOPERS_DESCRIPTION },
      ...siteOgMeta({ title: DEVELOPERS_TITLE, description: DEVELOPERS_DESCRIPTION, url: DEVELOPERS_URL }),
    ],
    links: [{ rel: "canonical", href: DEVELOPERS_URL }],
  }),
  component: DevelopersView,
});
