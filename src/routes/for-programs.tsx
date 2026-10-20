import { createFileRoute } from "@tanstack/react-router";
import { ForProgramsView } from "@/components/seo/for-programs-page";
import { FOR_PROGRAMS_DESCRIPTION, FOR_PROGRAMS_TITLE, FOR_PROGRAMS_URL, forProgramsJsonLd } from "@/lib/seo/for-programs";

export const Route = createFileRoute("/for-programs")({
  head: () => ({
    meta: [
      { title: FOR_PROGRAMS_TITLE },
      { name: "description", content: FOR_PROGRAMS_DESCRIPTION },
      { "script:ld+json": forProgramsJsonLd() },
    ],
    links: [{ rel: "canonical", href: FOR_PROGRAMS_URL }],
  }),
  component: ForProgramsView,
});
