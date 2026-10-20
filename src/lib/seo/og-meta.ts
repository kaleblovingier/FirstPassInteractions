/**
 * Lightweight og/twitter meta builders (no pair/drug data imports), safe for
 * the root route that ships in every client bundle.
 */
import { SITE_URL } from "./pair-copy";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** og + twitter meta tags for a page. */
export function ogMeta(o: { title: string; description: string; url: string; image: string; alt: string }) {
  return [
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "FirstPass" },
    { property: "og:title", content: o.title },
    { property: "og:description", content: o.description },
    { property: "og:url", content: o.url },
    { property: "og:image", content: o.image },
    { property: "og:image:width", content: String(OG_WIDTH) },
    { property: "og:image:height", content: String(OG_HEIGHT) },
    { property: "og:image:alt", content: o.alt },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: o.title },
    { name: "twitter:description", content: o.description },
    { name: "twitter:image", content: o.image },
    { name: "twitter:image:alt", content: o.alt },
  ];
}

/** Site-wide default share card (the /pairs card), for pages without their own. */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og/page/pairs.png`;
export const DEFAULT_OG_ALT = "FirstPass: Label-sourced drug interaction pairs. The FDA label's own wording, with a DailyMed link.";

/** og + twitter meta for a page that uses the default share card. */
export const siteOgMeta = (o: { title: string; description: string; url: string }) =>
  ogMeta({ ...o, image: DEFAULT_OG_IMAGE, alt: DEFAULT_OG_ALT });
