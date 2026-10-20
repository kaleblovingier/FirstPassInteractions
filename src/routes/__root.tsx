import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { siteOgMeta } from "@/lib/seo/og-meta";
import { SITE_URL } from "@/lib/seo/pair-copy";
import { siteJsonLdMeta } from "@/lib/seo/site-jsonld";
import appCss from "../styles.css?url";

const APP_NAME = "FirstPass";
const SITE_DESCRIPTION =
  "FirstPass is a medicine-interaction learning desk: plain-language summaries first, then clinical pathway detail and sources.";

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
      // loaded by the inline script below (display=swap keeps text visible).
      {
        rel: "stylesheet",
        media: "print",
        id: "fp-fonts",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap",
      },
    ],
    scripts: [
      {
        children:
          "(function(){var l=document.getElementById('fp-fonts');if(!l)return;var on=function(){l.media='all'};if(l.sheet)on();else l.addEventListener('load',on);})();",
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
