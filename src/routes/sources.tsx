import { createFileRoute } from "@tanstack/react-router";
import { SourcesView } from "@/components/seo/sources-page";
import { breadcrumbMeta, HOME_CRUMB } from "@/lib/seo/breadcrumbs";
import { siteOgMeta } from "@/lib/seo/og-meta";
import { SOURCES_DESCRIPTION, SOURCES_TITLE, SOURCES_URL } from "@/lib/seo/sources-meta";
import { fdaDdiIndex, labelLibrary, otherLabels } from "@/lib/seo/sources";

export const Route = createFileRoute("/sources")({
  head: () => ({
    meta: [
      { title: SOURCES_TITLE },
      { name: "description", content: SOURCES_DESCRIPTION },
      ...siteOgMeta({ title: SOURCES_TITLE, description: SOURCES_DESCRIPTION, url: SOURCES_URL }),
      breadcrumbMeta([HOME_CRUMB, { name: "Sources", url: SOURCES_URL }]),
    ],
    links: [{ rel: "canonical", href: SOURCES_URL }],
  }),
  component: SourcesRoute,
});

function SourcesRoute() {
  return <SourcesView labels={labelLibrary()} others={otherLabels()} targets={fdaDdiIndex()} />;
}
