import { createFileRoute } from "@tanstack/react-router";
import { WorkupView } from "@/components/learn/workup-view";
import { workupCases } from "@/lib/learn/workup";
import { WORKUP_DESCRIPTION, WORKUP_TITLE, workupCaseSearch } from "@/lib/learn/workup-meta";
import { SITE_URL } from "@/lib/seo/pair-copy";

export const Route = createFileRoute("/workup")({
  validateSearch: workupCaseSearch,
  loader: () => workupCases(),
  head: () => ({
    meta: [{ title: WORKUP_TITLE }, { name: "description", content: WORKUP_DESCRIPTION }],
    links: [{ rel: "canonical", href: `${SITE_URL}/workup` }],
  }),
  component: WorkupRoute,
});

function WorkupRoute() {
  return <WorkupView cases={Route.useLoaderData()} caseId={Route.useSearch().case} />;
}
