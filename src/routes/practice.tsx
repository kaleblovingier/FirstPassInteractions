import { createFileRoute } from "@tanstack/react-router";
import { PracticeView } from "@/components/learn/practice-view";
import { PRACTICE_DESCRIPTION, PRACTICE_TITLE, practiceQuestions } from "@/lib/learn/practice";
import { SITE_URL } from "@/lib/seo/pair-copy";

export const Route = createFileRoute("/practice")({
  loader: () => practiceQuestions(),
  head: () => ({
    meta: [{ title: PRACTICE_TITLE }, { name: "description", content: PRACTICE_DESCRIPTION }],
    links: [{ rel: "canonical", href: `${SITE_URL}/practice` }],
  }),
  component: PracticeRoute,
});

function PracticeRoute() {
  return <PracticeView questions={Route.useLoaderData()} />;
}
