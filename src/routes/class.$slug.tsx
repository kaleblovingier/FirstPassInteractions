import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { siteOgMeta } from "@/lib/seo/og-meta";
import { ClassPageView } from "@/components/seo/class-page";
import { breadcrumbMeta, HOME_CRUMB } from "@/lib/seo/breadcrumbs";
import { classHubBySlug, classHubRedirect } from "@/lib/seo/class-hubs";
import { SITE_URL } from "@/lib/seo/pair-copy";
import { NotFoundView } from "@/components/not-found";

export const Route = createFileRoute("/class/$slug")({
  loader: ({ params }) => {
    const moved = classHubRedirect(params.slug);
    if (moved) throw redirect({ to: "/class/$slug", params: { slug: moved }, statusCode: 301 });
    const hub = classHubBySlug(params.slug);
    if (!hub) throw notFound();
    return hub;
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: loaderData.title },
            { name: "description", content: loaderData.description },
            ...siteOgMeta({ title: loaderData.title, description: loaderData.description, url: loaderData.canonical }),
            breadcrumbMeta([
              HOME_CRUMB,
              { name: "Classes", url: `${SITE_URL}/classes` },
              { name: loaderData.name, url: loaderData.canonical },
            ]),
          ],
          links: [{ rel: "canonical", href: loaderData.canonical }],
        }
      : {},
  component: ClassRoute,
  notFoundComponent: () => <NotFoundView what="class page" back={{ href: "/classes", label: "All drug classes" }} />,
});

function ClassRoute() {
  return <ClassPageView hub={Route.useLoaderData()} />;
}
