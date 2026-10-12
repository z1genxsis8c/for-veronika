/* =========================================================
   Service Worker — БЕЗ версий, с network-first стратегией
   ---------------------------------------------------------
   Логика:
   • HTML / JS / CSS → всегда с сети (кэш = fallback офлайн)
   • Картинки, шрифты, manifest → из кэша + обновление в фоне
   • Версию бампать НЕ НУЖНО — всё подтягивается само
   ========================================================= */

const CACHE_NAME = 'veronika-static';   // без версии!

const PRECACHE = [
  './',
  './index.html',
  './cat.html',
  './timer.html',
  './song.html',
  './reasons.html',
  './surprise.html',
  './map.html',
  './puzzle.html',
  './stars.html',
  './draw.html',
  './love.html',
  './countdown.html',
  './game-thorn.html',
  './game-jump.html',
  './game-doodle.html',
  './game-lock.html',
  './manifest.json',
];

const EXTERNAL_HOSTS = [
  'open-meteo.com',
  'get.geojs.io',
  'formsubmit.co',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

/* =========================================================
   INSTALL
   ========================================================= */
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        PRECACHE.map((url) =>
          cache.add(url).catch((err) =>
            console.warn('⚠️ не закэшировано:', url, err?.message || err)
          )
        )
      )
    )
  );
});

/* =========================================================
   ACTIVATE
   ========================================================= */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .then(() => caches.open(CACHE_NAME))
      .then((cache) =>
        Promise.all(
          PRECACHE.map((url) =>
            cache.add(url).catch(() => {})
          )
        )
      )
      .then(() => self.clients.claim())
  );
});

/* =========================================================
   FETCH
   ========================================================= */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Внешние домены — не трогаем
  if (url.origin !== self.location.origin) return;
  if (EXTERNAL_HOSTS.some((h) => url.hostname.includes(h))) return;

  // ---------- Изображения и шрифты → cache-first + обновление в фоне ----------
  const isStatic =
    req.destination === 'image' ||
    req.destination === 'font' ||
    url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|woff2?|ttf|eot)$/i);

  if (isStatic) {
    event.respondWith(
      caches.match(req).then((cached) => {
        // Обновляем в фоне
        const fetchPromise = fetch(req)
          .then((res) => {
            if (res && res.status === 200 && res.type === 'basic') {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // ---------- HTML / JS / CSS / JSON → network-first ----------
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((r) => r || caches.match('./index.html'))
      )
  );
});

/* =========================================================
   Сообщения со страницы
   ========================================================= */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'CLEAR_ALL') {
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
});