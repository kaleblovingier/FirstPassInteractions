import { createFileRoute } from "@tanstack/react-router";
import { ClassEmbedCard } from "@/components/seo/hub-embed";
import { loadClassEmbed } from "@/lib/seo/hub-embed-load";
import { PAIR_DISCLAIMER } from "@/lib/seo/pair-copy";

/**
 * Framable drug-class card for course pages (iframe, no LTI), as /embed/pair/$slug
 * is for a pair. Server-rendered rather than prerendered; the CDN caches it.
 * noindex, canonical to /class/<slug>, not in the sitemap. Only /embed/* may be
 * framed by other sites (vercel.json, scripts/vercel-routes.mjs).
 */
export const Route = createFileRoute("/embed/class/$slug")({
  loader: ({ params }) => loadClassEmbed(params.slug),
  head: ({ loaderData }) =>
    loaderData
      ? {
          meta: [
            { title: `${loaderData.name}: drug class | FirstPass card` },
            { name: "description", content: `FirstPass drug-class card for ${loaderData.name}. ${PAIR_DISCLAIMER}` },
            { name: "robots", content: "noindex, follow" },
          ],
          links: [{ rel: "canonical", href: loaderData.canonical }],
        }
      : { meta: [{ name: "robots", content: "noindex" }] },
  // Cards only change on deploy (which clears the CDN), so let the CDN keep them. 404s are not cached.
  headers: ({ loaderData }) =>
    loaderData ? { "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800" } : undefined,
  component: EmbedClassRoute,
  notFoundComponent: () => (
    <main style={{ padding: 16, font: "14px system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 16, margin: 0 }}>Class card not found</h1>
      <p>
        <a href="/classes" target="_blank" rel="noopener">
          Browse FirstPass drug classes
        </a>
      </p>
    </main>
  ),
});

function EmbedClassRoute() {
  return <ClassEmbedCard card={Route.useLoaderData()} />;
}
