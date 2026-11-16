import { createFileRoute } from "@tanstack/react-router";
import { PairEmbedCard } from "@/components/seo/pair-embed";
import { loadPairEmbed } from "@/lib/seo/pair-embed-load";
import { PAIR_DISCLAIMER } from "@/lib/seo/pair-copy";

/**
 * Framable pair card for course pages (iframe, no LTI). Server-rendered rather than
 * prerendered (nothing links here, and prerendering every pair twice would double
 * the build); the CDN caches it. noindex, canonical to /pair/<slug>, not in the sitemap.
 * Only /embed/* may be framed by other sites (vercel.json, scripts/vercel-routes.mjs).
 */
export const Route = createFileRoute("/embed/pair/$slug")({
  loader: ({ params }) => loadPairEmbed(params.slug),
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: `${loaderData.nameA} and ${loaderData.nameB}: ${loaderData.severityLabel} | FirstPass card` },
            { name: "description", content: `FirstPass pair card for ${loaderData.nameA} and ${loaderData.nameB}. ${PAIR_DISCLAIMER}` },
            { name: "robots", content: "noindex, follow" },
          ],
          links: [{ rel: "canonical", href: loaderData.canonical }],
        }
      : { meta: [{ name: "robots", content: "noindex" }] },
  // Cards only change on deploy (which clears the CDN), so let the CDN keep them. 404s are not cached.
  headers: ({ loaderData }) =>
    loaderData ? { "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800" } : undefined,
  component: EmbedPairRoute,
  notFoundComponent: () => (
    <main style={{ padding: 16, font: "14px system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 16, margin: 0 }}>Pair card not found</h1>
      <p>
        <a href="/pairs" target="_blank" rel="noopener">
          Browse FirstPass drug pairs
        </a>
      </p>
    </main>
  ),
});

function EmbedPairRoute() {
  return <PairEmbedCard card={Route.useLoaderData()} />;
}
