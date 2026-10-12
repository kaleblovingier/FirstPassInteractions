import { createFileRoute } from "@tanstack/react-router";
import { PairsIndexView } from "@/components/seo/pair-page";
import { pairPages } from "@/lib/seo/pair-pages";
import { PAIRS_INDEX_DESCRIPTION, PAIRS_INDEX_TITLE, SITE_URL } from "@/lib/seo/pair-copy";

export const Route = createFileRoute("/pairs")({
  loader: () => pairPages(),
  head: () => ({
    meta: [
      { title: PAIRS_INDEX_TITLE },
      { name: "description", content: PAIRS_INDEX_DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/pairs` }],
  }),
  component: () => <PairsIndexView pages={Route.useLoaderData()} />,
});
