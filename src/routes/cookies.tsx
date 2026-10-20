import { createFileRoute } from "@tanstack/react-router";
import { breadcrumbMeta, HOME_CRUMB } from "@/lib/seo/breadcrumbs";
import { siteOgMeta } from "@/lib/seo/og-meta";
import { LegalView } from "@/components/seo/legal-page";
import { COOKIES_DOC as DOC, legalUrl } from "@/lib/seo/legal";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      breadcrumbMeta([HOME_CRUMB, { name: DOC.title.replace(/ \| FirstPass$/, ""), url: legalUrl(DOC) }]),
      { title: DOC.title },
      { name: "description", content: DOC.description },
      ...siteOgMeta({ title: DOC.title, description: DOC.description, url: legalUrl(DOC) }),
    ],
    links: [{ rel: "canonical", href: legalUrl(DOC) }],
  }),
  component: () => <LegalView doc={DOC} />,
});
