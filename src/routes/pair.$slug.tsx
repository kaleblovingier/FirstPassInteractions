import { createFileRoute, notFound } from "@tanstack/react-router";
import { PairPageView } from "@/components/seo/pair-page";
import { pairPageBySlug } from "@/lib/seo/pair-pages";

export const Route = createFileRoute("/pair/$slug")({
  loader: ({ params }) => {
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
            { property: "og:title", content: loaderData.title },
            { property: "og:description", content: loaderData.description },
            { property: "og:url", content: loaderData.canonical },
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
