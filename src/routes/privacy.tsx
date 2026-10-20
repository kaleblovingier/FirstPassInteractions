import { createFileRoute } from "@tanstack/react-router";
import { LegalView } from "@/components/seo/legal-page";
import { PRIVACY_DOC as DOC, legalUrl } from "@/lib/seo/legal";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: DOC.title },
      { name: "description", content: DOC.description },
    ],
    links: [{ rel: "canonical", href: legalUrl(DOC) }],
  }),
  component: () => <LegalView doc={DOC} />,
});
