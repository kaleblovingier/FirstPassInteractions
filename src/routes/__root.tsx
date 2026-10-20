import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { siteOgMeta } from "@/lib/seo/og-meta";
import { SITE_URL } from "@/lib/seo/pair-copy";
import { siteJsonLdMeta } from "@/lib/seo/site-jsonld";
import appCss from "../styles.css?url";

const APP_NAME = "FirstPass";
const SITE_DESCRIPTION =
  "FirstPass is an educational drug-interaction reference for teaching: label-sourced pairs in the FDA label's own wording, with DailyMed links. Educational reference only. Not FDA-cleared. The Prescribing Information governs.";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "description", content: SITE_DESCRIPTION },
      ...siteOgMeta({ title: APP_NAME, description: SITE_DESCRIPTION, url: `${SITE_URL}/` }),
      { name: "theme-color", content: "#efece4" },
      siteJsonLdMeta(),
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      // Non-blocking web fonts: fetched as print media, switched to all once
      // loaded by the inline script below. display=optional: text renders at once in the fallback and never swaps fonts mid-view (no layout shift); cached fonts are used on later views.
      {
        rel: "stylesheet",
        media: "print",
        id: "fp-fonts",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=optional",
      },
    ],
    scripts: [
      {
        children:
          "(function(){var l=document.getElementById('fp-fonts');if(!l)return;var on=function(){l.media='all'};if(l.sheet)on();else l.addEventListener('load',on);})();",
      },
      {
        // Before first paint: hide server-rendered placeholders that this visitor's saved desk
        // state would remove after hydration (disclaimer already acknowledged, paid plan), so the
        // page does not shift. Read-only; the store remains the source of truth after hydration.
        children:
          "(function(){try{var s=JSON.parse(localStorage.getItem('firstpass.desk.v7')||'{}').state||{},d=document.documentElement;if(s.hcpAck)d.setAttribute('data-fp-ack','');if(s.plan&&s.plan!=='free')d.setAttribute('data-fp-paid','')}catch(e){}})();",
      },
      {
        // Offline reading of published reference pages (public/sw.js). Skipped inside frames (previews).
        children:
          "if('serviceWorker'in navigator&&window.top===window&&(location.protocol==='https:'||location.hostname==='127.0.0.1'||location.hostname==='localhost'))addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})});",
      },
    ],
  }),
  component: () => (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-bg text-fg">
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
