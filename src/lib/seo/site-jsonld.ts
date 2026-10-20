/**
 * Site-wide schema.org JSON-LD (WebSite + Organization). Identity only: no
 * prices, offers, ratings or clinical claims. Kept free of pair/drug data so
 * the root route can import it cheaply.
 */
import type { JSX } from "react";
import { SITE_URL } from "./pair-copy";

export const ORG_EMAIL = "FirstPassInteractions@gmail.com";

export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "FirstPass",
        url: `${SITE_URL}/`,
        inLanguage: "en-US",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "FirstPass",
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/favicon.svg`,
        email: ORG_EMAIL,
      },
    ],
  };
}

export function siteJsonLdMeta(): JSX.IntrinsicElements["meta"] {
  return { "script:ld+json": siteJsonLd() } as unknown as JSX.IntrinsicElements["meta"];
}
