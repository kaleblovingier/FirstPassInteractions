import { createFileRoute } from "@tanstack/react-router";
import { DrugEmbedCard } from "@/components/seo/hub-embed";
import { loadDrugEmbed } from "@/lib/seo/hub-embed-load";
import { PAIR_DISCLAIMER } from "@/lib/seo/pair-copy";

/**
 * Framable drug card for course pages (iframe, no LTI), as /embed/pair/$slug is for
 * a pair. Server-rendered rather than prerendered; the CDN caches it. noindex,
 * canonical to /drug/<slug>, not in the sitemap. Only /embed/* may be framed by
 * other sites (vercel.json, scripts/vercel-routes.mjs).
 */
export const Route = createFileRoute("/embed/drug/$slug")({
  loader: ({ params }) => loadDrugEmbed(params.slug),
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: `${loaderData.name}: drug pairs | FirstPass card` },
            { name: "description", content: `FirstPass drug card for ${loaderData.name}. ${PAIR_DISCLAIMER}` },
            { name: "robots", content: "noindex, follow" },
          ],
          links: [{ rel: "canonical", href: loaderData.canonical }],
        }
      : { meta: [{ name: "robots", content: "noindex" }] },
  // Cards only change on deploy (which clears the CDN), so let the CDN keep them. 404s are not cached.
  headers: ({ loaderData }) =>
    loaderData ? { "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800" } : undefined,
  component: EmbedDrugRoute,
  notFoundComponent: () => (
    <main style={{ padding: 16, font: "14px system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 16, margin: 0 }}>Drug card not found</h1>
      <p>
        <a href="/pairs" target="_blank" rel="noopener">
          Browse FirstPass drug pairs
        </a>
      </p>
    </main>
  ),
});

function EmbedDrugRoute() {
  return <DrugEmbedCard card={Route.useLoaderData()} />;
}
