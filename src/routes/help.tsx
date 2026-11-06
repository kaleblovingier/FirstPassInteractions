import { createFileRoute } from "@tanstack/react-router";
import { breadcrumbMeta, HOME_CRUMB } from "@/lib/seo/breadcrumbs";
import { siteOgMeta } from "@/lib/seo/og-meta";
import { HelpView } from "@/components/seo/help-page";
import { HELP_DESCRIPTION, HELP_TITLE, HELP_URL } from "@/lib/seo/help";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      breadcrumbMeta([HOME_CRUMB, { name: "Find help", url: HELP_URL }]),
      { title: HELP_TITLE },
      { name: "description", content: HELP_DESCRIPTION },
      ...siteOgMeta({ title: HELP_TITLE, description: HELP_DESCRIPTION, url: HELP_URL }),
    ],
    links: [{ rel: "canonical", href: HELP_URL }],
  }),
  component: HelpView,
});
