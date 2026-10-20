import { createFileRoute } from "@tanstack/react-router";
import { siteOgMeta } from "@/lib/seo/og-meta";
import { EnzymesIndexView } from "@/components/seo/enzyme-page";
import { breadcrumbMeta, HOME_CRUMB } from "@/lib/seo/breadcrumbs";
import { enzymeHubs } from "@/lib/seo/enzyme-hubs";
import { ENZYMES_INDEX_DESCRIPTION, ENZYMES_INDEX_TITLE, SITE_URL } from "@/lib/seo/pair-copy";

export const Route = createFileRoute("/enzymes")({
  head: () => ({
    meta: [
      { title: ENZYMES_INDEX_TITLE },
      { name: "description", content: ENZYMES_INDEX_DESCRIPTION },
      ...siteOgMeta({ title: ENZYMES_INDEX_TITLE, description: ENZYMES_INDEX_DESCRIPTION, url: `${SITE_URL}/enzymes` }),
      breadcrumbMeta([HOME_CRUMB, { name: "Enzymes", url: `${SITE_URL}/enzymes` }]),
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/enzymes` }],
  }),
  component: () => <EnzymesIndexView hubs={enzymeHubs()} />,
});
