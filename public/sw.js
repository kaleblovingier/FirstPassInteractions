/*
 * FirstPass offline reading for classrooms and labs.
 * Precaches the public reference pages (drug, pair and enzyme pages with their
 * label quotes, plus their indexes) and the hashed CSS/JS they load, so pages
 * already published can be read without a connection.
 *
 * Never cached: anything under /api/ (license, recovery, programs, Stripe),
 * /__grok/, non-GET requests, non-200 or opaque responses, responses that set
 * cookies or say no-store, and any route not on the allow-list below (the desk,
 * unlock, plans and recovery pages stay network-only).
 */
const VERSION = "fp-offline-v1";
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;
const SHELL = ["/", "/pairs", "/enzymes"];
const ROUTE_RE = /^\/(?:drug|pair|enzyme)\/[a-z0-9-]+$|^\/(?:pairs|enzymes)?$/;

const isAsset = (p) => p.startsWith("/assets/") || p === "/favicon.svg";
const isPage = (p) => ROUTE_RE.test(p);
const blocked = (p) => p.startsWith("/api/") || p.startsWith("/__grok/") || /license|gate|recover|checkout|stripe/i.test(p);

function cacheable(res) {
  if (!res || res.status !== 200 || res.type === "opaque" || res.redirected) return false;
  const cc = res.headers.get("cache-control") || "";
  if (/no-store|private/i.test(cc)) return false;
  if (res.headers.has("set-cookie")) return false;
  return true;
}

async function put(cacheName, url) {
  const p = new URL(url, self.location.origin).pathname;
  if (blocked(p)) return null;
  try {
    const res = await fetch(url, { credentials: "omit", cache: "no-cache" });
    if (!cacheable(res)) return null;
    const cache = await caches.open(cacheName);
    await cache.put(p, res.clone());
    return res;
  } catch {
    return null;
  }
}

async function assetsOf(res) {
  if (!res) return [];
  const html = await res.text();
  const out = new Set();
  for (const m of html.matchAll(/(?:href|src)="(\/assets\/[^"?#]+)"/g)) out.add(m[1]);
  return [...out];
}

async function precacheShell() {
  for (const url of SHELL) {
    const res = await put(PAGES, url);
    for (const a of await assetsOf(res && res.clone())) await put(ASSETS, a);
  }
}

async function precacheRoutes() {
  let xml = "";
  try {
    const r = await fetch("/sitemap.xml", { credentials: "omit", cache: "no-cache" });
    if (r.ok) xml = await r.text();
  } catch {
    return;
  }
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => { try { return new URL(m[1]).pathname; } catch { return ""; } })
    .filter((p) => isPage(p) && !SHELL.includes(p));
  const queue = [...new Set(paths)];
  const worker = async () => {
    while (queue.length) {
      const p = queue.shift();
      const res = await put(PAGES, p);
      for (const a of await assetsOf(res && res.clone())) {
        const c = await caches.open(ASSETS);
        if (!(await c.match(a))) await put(ASSETS, a);
      }
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
}

self.addEventListener("install", (e) => {
  e.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (!k.startsWith(VERSION)) await caches.delete(k);
      await self.clients.claim();
      await precacheRoutes();
    })(),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || blocked(url.pathname)) return;

  if (isAsset(url.pathname)) {
    e.respondWith(
      caches.match(url.pathname).then((hit) => hit || fetch(req).then((res) => {
        if (cacheable(res)) { const copy = res.clone(); caches.open(ASSETS).then((c) => c.put(url.pathname, copy)); }
        return res;
      })),
    );
    return;
  }

  if (req.mode === "navigate" && isPage(url.pathname)) {
    // Network first so published updates show; the cached copy is the offline fallback.
    e.respondWith(
      fetch(req).then((res) => {
        if (cacheable(res) && !url.search) { const copy = res.clone(); caches.open(PAGES).then((c) => c.put(url.pathname, copy)); }
        return res;
      }).catch(() => caches.match(url.pathname).then((hit) => hit || Response.error())),
    );
  }
});
