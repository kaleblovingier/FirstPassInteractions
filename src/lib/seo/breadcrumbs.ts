import type { JSX } from "react";
import { SITE_URL } from "./pair-copy";

export interface Crumb {
  name: string;
  /** Absolute URL on SITE_URL. */
  url: string;
}

/** The first crumb on every public SEO page. */
export const HOME_CRUMB: Crumb = { name: "FirstPass", url: `${SITE_URL}/` };

/**
 * schema.org BreadcrumbList for a page's trail. Navigation only: it says where
 * the page sits on the site, nothing about the drugs on it.
 */
export function breadcrumbJsonLd(trail: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

/**
 * Head meta entry TanStack Router renders as <script type="application/ld+json">,
 * with <, > and & escaped (router-core MetaDescriptor "script:ld+json"). The
 * React adapter types meta entries as <meta> props only, so the type is widened here.
 */
export function breadcrumbMeta(trail: Crumb[]): JSX.IntrinsicElements["meta"] {
  return { "script:ld+json": breadcrumbJsonLd(trail) } as unknown as JSX.IntrinsicElements["meta"];
}
