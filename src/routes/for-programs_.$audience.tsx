import { createFileRoute, notFound } from "@tanstack/react-router";
import { breadcrumbMeta, HOME_CRUMB } from "@/lib/seo/breadcrumbs";
import { ogMeta, ogImageUrl, audienceOgJob, ogAlt } from "@/lib/seo/og";
import { FOR_PROGRAMS_URL } from "@/lib/seo/for-programs";
import { audienceJsonLd, audienceUrl } from "@/lib/seo/for-programs-audiences";
import { audiencePageData } from "@/lib/seo/for-programs-audience-pages";
import { ForProgramsAudienceView } from "@/components/seo/for-programs-audience-page";
import { NotFoundView } from "@/components/not-found";

/* "for-programs_" keeps this route out of /for-programs' layout: /for-programs renders its own page with no <Outlet />. */
export const Route = createFileRoute("/for-programs_/$audience")({
  loader: ({ params }) => {
    const data = audiencePageData(params.audience);
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const a = loaderData.audience;
    const url = audienceUrl(a.slug);
    return {
      meta: [
        breadcrumbMeta([HOME_CRUMB, { name: "For programs", url: FOR_PROGRAMS_URL }, { name: a.name, url }]),
        { title: a.title },
        { name: "description", content: a.description },
        ...ogMeta({ title: a.title, description: a.description, url, image: ogImageUrl("page", `for-programs-${a.slug}`), alt: ogAlt(audienceOgJob(a)) }),
        { "script:ld+json": audienceJsonLd(a) } as unknown as { name: string; content: string },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: AudienceRoute,
  notFoundComponent: () => <NotFoundView what="program page" back={{ href: "/for-programs", label: "For programs" }} />,
});

function AudienceRoute() {
  return <ForProgramsAudienceView data={Route.useLoaderData()} />;
}
