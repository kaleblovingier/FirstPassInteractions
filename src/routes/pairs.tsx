import { createFileRoute } from "@tanstack/react-router";
import { ogMeta, ogImageUrl, STATIC_OG_JOBS, ogAlt } from "@/lib/seo/og";
import { PairsIndexView, type PairIndexEntry } from "@/components/seo/pair-page";
import { breadcrumbMeta, HOME_CRUMB } from "@/lib/seo/breadcrumbs";
import { pairPages } from "@/lib/seo/pair-pages";
import { PAIRS_INDEX_DESCRIPTION, PAIRS_INDEX_TITLE, SITE_URL } from "@/lib/seo/pair-copy";
import { PAIRS_PREFILTER_SCRIPT, parsePairsSearch } from "@/lib/seo/pairs-filter";

export const Route = createFileRoute("/pairs")({
  // ?q= and ?severity= filter the list in the browser. The page is prerendered without them, so a
  // filtered URL keeps the canonical /pairs and every pair link stays in the HTML.
  validateSearch: parsePairsSearch,
  // Only what the index draws. The loader result is inlined into the page as router state, and
  // the full pair records (quotes, grade basis, copy) made /pairs ship over a megabyte of it.
  loader: (): PairIndexEntry[] =>
    pairPages().map(({ slug, nameA, nameB, severityLabel }) => ({ slug, nameA, nameB, severityLabel })),
  // The list is fixed at build time. Without this, each keystroke in the search box re-runs the loader in the browser.
  staleTime: Infinity,
  head: () => ({
    meta: [
      { title: PAIRS_INDEX_TITLE },
      { name: "description", content: PAIRS_INDEX_DESCRIPTION },
      ...ogMeta({ title: PAIRS_INDEX_TITLE, description: PAIRS_INDEX_DESCRIPTION, url: `${SITE_URL}/pairs`, image: ogImageUrl("page", "pairs"), alt: ogAlt(STATIC_OG_JOBS[0]) }),
      breadcrumbMeta([HOME_CRUMB, { name: "Drug pairs", url: `${SITE_URL}/pairs` }]),
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/pairs` }],
    // Before first paint: hide the rows a filtered URL leaves out, so /pairs?q=… opens filtered, without a shift.
    scripts: [{ children: PAIRS_PREFILTER_SCRIPT }],
  }),
  component: PairsRoute,
});

function PairsRoute() {
  const navigate = Route.useNavigate();
  return (
    <PairsIndexView
      pages={Route.useLoaderData()}
      search={Route.useSearch()}
      onSearch={(search) => void navigate({ search, replace: true, resetScroll: false })}
    />
  );
}
