import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { DrugHubView } from "@/components/seo/pair-page";
import { breadcrumbMeta, HOME_CRUMB } from "@/lib/seo/breadcrumbs";
import { drugHubBySlug, legacyDrugHubRedirect } from "@/lib/seo/drug-hubs";
import { SITE_URL } from "@/lib/seo/pair-copy";

export const Route = createFileRoute("/drug/$slug")({
  loader: ({ params }) => {
    const moved = legacyDrugHubRedirect(params.slug);
    if (moved) throw redirect({ to: "/drug/$slug", params: { slug: moved }, statusCode: 301 });
    const hub = drugHubBySlug(params.slug);
    if (!hub) throw notFound();
    return hub;
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
            breadcrumbMeta([
              HOME_CRUMB,
              { name: "Drug pairs", url: `${SITE_URL}/pairs` },
              { name: loaderData.name, url: loaderData.canonical },
            ]),
          ],
          links: [{ rel: "canonical", href: loaderData.canonical }],
        }
      : {},
  component: DrugHubRoute,
  notFoundComponent: () => (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p>That drug page doesn't exist. <a className="underline" href="/pairs">See all pairs</a>.</p>
    </main>
  ),
});

function DrugHubRoute() {
  return <DrugHubView hub={Route.useLoaderData()} />;
}
