import { createFileRoute } from "@tanstack/react-router";
import { LegalView } from "@/components/seo/legal-page";
import { TERMS_DOC as DOC, legalUrl } from "@/lib/seo/legal";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: DOC.title },
      { name: "description", content: DOC.description },
    ],
    links: [{ rel: "canonical", href: legalUrl(DOC) }],
  }),
  component: () => <LegalView doc={DOC} />,
});
