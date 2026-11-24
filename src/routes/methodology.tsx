import { createFileRoute } from "@tanstack/react-router";
import { MethodologyView } from "@/components/learn/methodology-view";
import {
  METHODOLOGY_DESCRIPTION,
  METHODOLOGY_TITLE,
  METHODOLOGY_URL,
} from "@/lib/learn/methodology";
import { breadcrumbMeta, HOME_CRUMB } from "@/lib/seo/breadcrumbs";
import { siteOgMeta } from "@/lib/seo/og-meta";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: METHODOLOGY_TITLE },
      { name: "description", content: METHODOLOGY_DESCRIPTION },
      ...siteOgMeta({
        title: METHODOLOGY_TITLE,
        description: METHODOLOGY_DESCRIPTION,
        url: METHODOLOGY_URL,
      }),
      breadcrumbMeta([HOME_CRUMB, { name: "Methodology", url: METHODOLOGY_URL }]),
    ],
    links: [{ rel: "canonical", href: METHODOLOGY_URL }],
  }),
  component: MethodologyView,
});
