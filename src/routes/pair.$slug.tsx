import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { ogMeta, ogImageUrl, pairOgJob, ogAlt } from "@/lib/seo/og";
import { PairPageView } from "@/components/seo/pair-page";
import { breadcrumbMeta, HOME_CRUMB } from "@/lib/seo/breadcrumbs";
import { legacyPairRedirect, pairPageBySlug } from "@/lib/seo/pair-pages";
import { SITE_URL } from "@/lib/seo/pair-copy";

export const Route = createFileRoute("/pair/$slug")({
  loader: ({ params }) => {
    const moved = legacyPairRedirect(params.slug);
    if (moved) throw redirect({ to: "/pair/$slug", params: { slug: moved }, statusCode: 301 });
    const page = pairPageBySlug(params.slug);
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: loaderData.title },
            { name: "description", content: loaderData.description },
            ...ogMeta({ title: loaderData.title, description: loaderData.description, url: loaderData.canonical, image: ogImageUrl("pair", loaderData.slug), alt: ogAlt(pairOgJob(loaderData)) }),
            breadcrumbMeta([
              HOME_CRUMB,
              { name: "Drug pairs", url: `${SITE_URL}/pairs` },
              { name: `${loaderData.nameA} and ${loaderData.nameB}`, url: loaderData.canonical },
            ]),
          ],
          links: [{ rel: "canonical", href: loaderData.canonical }],
        }
      : {},
  component: PairRoute,
  notFoundComponent: () => (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p>That pair page doesn't exist. <a className="underline" href="/pairs">See all pairs</a>.</p>
    </main>
  ),
});

function PairRoute() {
  return <PairPageView page={Route.useLoaderData()} />;
}
