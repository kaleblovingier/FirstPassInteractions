import { createFileRoute } from "@tanstack/react-router";
import { GlossaryView } from "@/components/learn/glossary-view";
import { GLOSSARY_DESCRIPTION, GLOSSARY_TITLE, GLOSSARY_URL } from "@/lib/learn/glossary-meta";
import { breadcrumbMeta, HOME_CRUMB } from "@/lib/seo/breadcrumbs";
import { siteOgMeta } from "@/lib/seo/og-meta";

export const Route = createFileRoute("/glossary")({
  head: () => ({
    meta: [
      { title: GLOSSARY_TITLE },
      { name: "description", content: GLOSSARY_DESCRIPTION },
      ...siteOgMeta({ title: GLOSSARY_TITLE, description: GLOSSARY_DESCRIPTION, url: GLOSSARY_URL }),
      breadcrumbMeta([HOME_CRUMB, { name: "Glossary", url: GLOSSARY_URL }]),
    ],
    links: [{ rel: "canonical", href: GLOSSARY_URL }],
  }),
  component: GlossaryView,
});
