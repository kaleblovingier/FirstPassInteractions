import { createFileRoute } from "@tanstack/react-router";
import { siteOgMeta } from "@/lib/seo/og-meta";
import { ClassesIndexView } from "@/components/seo/class-page";
import { breadcrumbMeta, HOME_CRUMB } from "@/lib/seo/breadcrumbs";
import { classIndex } from "@/lib/seo/class-hubs";
import { CLASSES_INDEX_DESCRIPTION, CLASSES_INDEX_TITLE, SITE_URL } from "@/lib/seo/pair-copy";

export const Route = createFileRoute("/classes")({
  // Built from the catalog at build time; the page gets only the small index rows.
  loader: () => classIndex(),
  head: () => ({
    meta: [
      { title: CLASSES_INDEX_TITLE },
      { name: "description", content: CLASSES_INDEX_DESCRIPTION },
      ...siteOgMeta({ title: CLASSES_INDEX_TITLE, description: CLASSES_INDEX_DESCRIPTION, url: `${SITE_URL}/classes` }),
      breadcrumbMeta([HOME_CRUMB, { name: "Classes", url: `${SITE_URL}/classes` }]),
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/classes` }],
  }),
  component: ClassesRoute,
});

function ClassesRoute() {
  return <ClassesIndexView classes={Route.useLoaderData()} />;
}
