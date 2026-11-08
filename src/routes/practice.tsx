import { createFileRoute } from "@tanstack/react-router";
import { PracticeView } from "@/components/learn/practice-view";
import { practiceQuestions } from "@/lib/learn/practice";
import { PRACTICE_DESCRIPTION, PRACTICE_TITLE, parsePracticeSearch } from "@/lib/learn/practice-meta";
import { SITE_URL } from "@/lib/seo/pair-copy";

export const Route = createFileRoute("/practice")({
  validateSearch: parsePracticeSearch,
  loader: () => practiceQuestions(),
  // The questions are fixed at build time. Without this, each filter change re-runs the loader, which now lives in its own chunk.
  staleTime: Infinity,
  head: () => ({
    meta: [{ title: PRACTICE_TITLE }, { name: "description", content: PRACTICE_DESCRIPTION }],
    links: [{ rel: "canonical", href: `${SITE_URL}/practice` }],
  }),
  component: PracticeRoute,
});

function PracticeRoute() {
  const navigate = Route.useNavigate();
  return (
    <PracticeView
      questions={Route.useLoaderData()}
      search={Route.useSearch()}
      onSearch={(search) => void navigate({ search, replace: true, resetScroll: false })}
    />
  );
}
