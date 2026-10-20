import { siteOgMeta } from "@/lib/seo/og-meta";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { EnzymePageView } from "@/components/seo/enzyme-page";
import { breadcrumbMeta, HOME_CRUMB } from "@/lib/seo/breadcrumbs";
import { enzymeHubBySlug, enzymeHubRedirect } from "@/lib/seo/enzyme-hubs";
import { SITE_URL } from "@/lib/seo/pair-copy";

export const Route = createFileRoute("/enzyme/$slug")({
  loader: ({ params }) => {
    const moved = enzymeHubRedirect(params.slug);
    if (moved) throw redirect({ to: "/enzyme/$slug", params: { slug: moved }, statusCode: 301 });
    const hub = enzymeHubBySlug(params.slug);
    if (!hub) throw notFound();
    // Head fields only: the lists are rebuilt from the bundled catalog, so they
    // aren't serialized into the page twice.
    return {
      slug: hub.slug,
      enzyme: hub.enzyme,
      title: hub.title,
      description: hub.description,
      canonical: hub.canonical,
      indexable: hub.indexable,
    };
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: loaderData.title },
            { name: "description", content: loaderData.description },
            ...(loaderData.indexable ? [] : [{ name: "robots", content: "noindex, follow" }]),
            ...siteOgMeta({ title: loaderData.title, description: loaderData.description, url: loaderData.canonical }),
            breadcrumbMeta([
              HOME_CRUMB,
              { name: "Enzymes", url: `${SITE_URL}/enzymes` },
              { name: loaderData.enzyme, url: loaderData.canonical },
            ]),
          ],
          links: [{ rel: "canonical", href: loaderData.canonical }],
        }
      : {},
  component: EnzymeRoute,
  notFoundComponent: () => (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p>
        That enzyme page doesn't exist. <a className="underline" href="/enzymes">See all enzymes</a>.
      </p>
    </main>
  ),
});

function EnzymeRoute() {
  const { slug } = Route.useLoaderData();
  return <EnzymePageView hub={enzymeHubBySlug(slug)!} />;
}
