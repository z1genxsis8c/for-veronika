// service-worker.js · v3
// HTML → stale-while-revalidate (мгновенно из кэша + фоновая подмена)
// Прочее → cache-first с фоновым обновлением
// Внешние → не трогаем

const HTML_CACHE = "veronika-html-v3";
const STATIC_CACHE = "veronika-static-v3";
const PRECACHE = ["./manifest.json"];

// ---------- INSTALL ----------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        Promise.allSettled(PRECACHE.map((u) => cache.add(u).catch(() => {}))),
      ),
  );
  self.skipWaiting();
});

// ---------- ACTIVATE ----------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== HTML_CACHE && k !== STATIC_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// ---------- MESSAGE ----------
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

// ---------- FETCH ----------
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Range-запросы (для audio/video на iOS) — не перехватываем
  if (req.headers.get("range")) return;

  const isHTML =
    req.headers.get("accept")?.includes("text/html") || req.mode === "navigate";

  if (isHTML) {
    event.respondWith(staleWhileRevalidate(req, HTML_CACHE));
  } else {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
  }
});

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);

  const networkFetch = fetch(req, { cache: "no-store" })
    .then((res) => {
      if (res && res.ok) {
        cache.put(req, res.clone()).catch(() => {});
      }
      return res;
    })
    .catch(() => null);

  // Мгновенно отдаём кэш, свежак тянем в фоне
  if (cached) return cached;

  const fresh = await networkFetch;
  if (fresh) return fresh;

  return new Response(
    `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Оффлайн</title></head>
    <body style="font-family:Georgia,serif;background:#f3ede4;color:#1e1a16;padding:40px;text-align:center;line-height:1.6">
    <h1 style="font-size:32px;font-weight:400;font-style:italic">Страница пока недоступна</h1>
    <p>Проверь соединение и попробуй ещё раз.</p></body></html>`,
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) {
    // Фоновое обновление
    fetch(req)
      .then((res) => {
        if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
      })
      .catch(() => {});
    return cached;
  }
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}
