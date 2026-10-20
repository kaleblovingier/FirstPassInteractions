import { createFileRoute } from "@tanstack/react-router";
import { PairsIndexView } from "@/components/seo/pair-page";
import { breadcrumbMeta, HOME_CRUMB } from "@/lib/seo/breadcrumbs";
import { pairPages } from "@/lib/seo/pair-pages";
import { PAIRS_INDEX_DESCRIPTION, PAIRS_INDEX_TITLE, SITE_URL } from "@/lib/seo/pair-copy";

export const Route = createFileRoute("/pairs")({
  loader: () => pairPages(),
  head: () => ({
    meta: [
      { title: PAIRS_INDEX_TITLE },
      { name: "description", content: PAIRS_INDEX_DESCRIPTION },
      breadcrumbMeta([HOME_CRUMB, { name: "Drug pairs", url: `${SITE_URL}/pairs` }]),
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/pairs` }],
  }),
  component: PairsRoute,
});

function PairsRoute() {
  return <PairsIndexView pages={Route.useLoaderData()} />;
}
