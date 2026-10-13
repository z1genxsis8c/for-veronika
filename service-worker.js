// service-worker.js
// Версии НЕ НУЖНЫ. HTML всегда берётся из сети.
// Меняете файл на сервере — у пользователя сразу свежая версия.

const CACHE_NAME = "veronika-static"; // единый кэш для картинок/шрифтов/иконок

// Прекэш только статических ресурсов (не HTML!)
const PRECACHE = ["./manifest.json"];

// ---------- INSTALL ----------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(PRECACHE.map((u) => cache.add(u).catch(() => {}))),
      ),
  );
  // Активируемся сразу, без ожидания закрытия старых вкладок
  self.skipWaiting();
});

// ---------- ACTIVATE ----------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Оставляем только наш актуальный кэш
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
      );
      // Перехватываем управление сразу
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
  // Внешние домены (шрифты, погода) — не трогаем
  if (url.origin !== self.location.origin) return;

  // Всё, что не HTML — cache-first с фоновым обновлением
  const isHTML =
    req.headers.get("accept")?.includes("text/html") || req.mode === "navigate";

  if (isHTML) {
    // HTML — ВСЕГДА из сети (обходим HTTP-кэш браузера)
    event.respondWith(networkFirst(req));
  } else {
    event.respondWith(cacheFirst(req));
  }
});

async function networkFirst(req) {
  try {
    // cache: 'no-store' — обходим даже HTTP-кэш браузера
    const res = await fetch(req, { cache: "no-store" });
    // Кэшируем свежую копию (на случай офлайна)
    const copy = res.clone();
    caches
      .open(CACHE_NAME)
      .then((c) => c.put(req, copy))
      .catch(() => {});
    return res;
  } catch {
    // Офлайн — отдаём последнюю сохранённую версию
    const cached = await caches.match(req);
    return cached || new Response("Offline", { status: 503 });
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) {
    // Обновляем в фоне
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches
          .open(CACHE_NAME)
          .then((c) => c.put(req, copy))
          .catch(() => {});
      })
      .catch(() => {});
    return cached;
  }
  try {
    const res = await fetch(req);
    const copy = res.clone();
    caches
      .open(CACHE_NAME)
      .then((c) => c.put(req, copy))
      .catch(() => {});
    return res;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}
