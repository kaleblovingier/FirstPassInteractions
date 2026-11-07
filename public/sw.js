/*
 * FirstPass offline reading for classrooms and labs.
 *
 * Install precaches only the shell: the home, /pairs and /enzymes pages and the
 * hashed CSS/JS they load. Reference pages (drug, pair and enzyme pages with
 * their label quotes) are cached as the reader opens them, network first with
 * the cached copy as the offline fallback, so a visit downloads what was read
 * and not the whole site. Pages opened by in-app links are reported by the page
 * (a "fp-visit" message) and fetched once in the background.
 *
 * The page cache keeps the PAGE_CAP most recently cached pages; the asset cache
 * is capped too. VERSION is stamped at build time from the build's hashed file
 * names (scripts/sw-version.mjs), so a deploy installs a new worker, which
 * re-caches the pages the reader had and deletes the old caches.
 *
 * Never cached: anything under /api/ (license, recovery, programs, Stripe),
 * /__grok/, non-GET requests, non-200, redirected or opaque responses,
 * responses that set cookies or say no-store or private, and any route not on
 * the allow-list below (the plans, unlock and recovery pages stay network-only).
 */
const VERSION = "fp-offline-__FP_SW_BUILD__";
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;
const SHELL = ["/", "/pairs", "/enzymes"];
const PAGE_CAP = 150;
const ASSET_CAP = 400;
const ROUTE_RE = /^\/(?:drug|pair|enzyme)\/[a-z0-9-]+$|^\/(?:pairs|enzymes)?$/;

const isAsset = (p) => p.startsWith("/assets/") || p === "/favicon.svg";
const isPage = (p) => ROUTE_RE.test(p);
const blocked = (p) => p.startsWith("/api/") || p.startsWith("/__grok/") || /license|gate|recover|checkout|stripe/i.test(p);
const pathOf = (url) => new URL(url, self.location.origin).pathname;

function cacheable(res) {
  if (!res || res.status !== 200 || res.type === "opaque" || res.redirected) return false;
  const cc = res.headers.get("cache-control") || "";
  if (/no-store|private/i.test(cc)) return false;
  if (res.headers.has("set-cookie")) return false;
  return true;
}

/** Drop the oldest entries past `cap`. Shell pages are never dropped. */
async function trim(cacheName, cap) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  let excess = keys.length - cap;
  for (const req of keys) {
    if (excess <= 0) break;
    if (SHELL.includes(pathOf(req.url))) continue;
    await cache.delete(req);
    excess--;
  }
}

async function store(cacheName, p, res) {
  const cache = await caches.open(cacheName);
  await cache.put(p, res);
  await trim(cacheName, cacheName === PAGES ? PAGE_CAP : ASSET_CAP);
}

async function put(cacheName, url) {
  const p = pathOf(url);
  if (blocked(p)) return null;
  try {
    const res = await fetch(p, { credentials: "omit", cache: "no-cache" });
    if (!cacheable(res)) return null;
    await store(cacheName, p, res.clone());
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

/** Fetch the hashed CSS/JS a cached page loads, skipping what the asset cache already has. */
async function cacheAssetsOf(res) {
  const cache = await caches.open(ASSETS);
  for (const a of await assetsOf(res && res.clone())) {
    if (!(await cache.match(a))) await put(ASSETS, a);
  }
}

/** Cache one reference page and its assets. With `onlyIfMissing`, a page already cached is left as it is. */
async function cachePage(p, onlyIfMissing) {
  if (!isPage(p) || blocked(p)) return;
  if (onlyIfMissing && (await (await caches.open(PAGES)).match(p))) return;
  await cacheAssetsOf(await put(PAGES, p));
}

async function precacheShell() {
  for (const p of SHELL) await cachePage(p, false);
}

/** Pages an older worker had cached, most recent last, so a deploy keeps what the reader had read. */
async function carriedPages(oldNames) {
  const out = [];
  for (const name of oldNames) {
    if (!name.endsWith("-pages")) continue;
    for (const req of await (await caches.open(name)).keys()) {
      const p = pathOf(req.url);
      if (isPage(p) && !blocked(p) && !SHELL.includes(p) && !out.includes(p)) out.push(p);
    }
  }
  return out.slice(-PAGE_CAP);
}

self.addEventListener("install", (e) => {
  e.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const old = (await caches.keys()).filter((k) => k.startsWith("fp-offline-") && !k.startsWith(`${VERSION}-`));
      const carry = await carriedPages(old);
      for (const k of old) await caches.delete(k);
      await self.clients.claim();
      for (const p of carry) await cachePage(p, true);
    })(),
  );
});

self.addEventListener("message", (e) => {
  const data = e.data;
  if (!data || data.type !== "fp-visit" || typeof data.path !== "string") return;
  let url;
  try {
    url = new URL(data.path, self.location.origin);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  keep(e, cachePage(url.pathname, true));
});

/** Let a background cache write finish; it never fails the response or the event. */
function keep(e, work) {
  const done = Promise.resolve(work).catch(() => {});
  try {
    e.waitUntil(done);
  } catch {
    /* the event already settled; the write still runs */
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || blocked(url.pathname)) return;

  if (isAsset(url.pathname)) {
    // Hashed file names never change content, so the cache answers first.
    e.respondWith(
      caches.match(url.pathname).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (cacheable(res)) {
              const copy = res.clone();
              keep(e, store(ASSETS, url.pathname, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === "navigate" && isPage(url.pathname)) {
    // Network first so published updates show; the cached copy is the offline fallback.
    // The CSS/JS this page loads comes through the asset branch above and is cached there.
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (cacheable(res) && !url.search) {
            const copy = res.clone();
            keep(e, store(PAGES, url.pathname, copy));
          }
          return res;
        })
        .catch(() => caches.match(url.pathname).then((hit) => hit || Response.error())),
    );
  }
});
