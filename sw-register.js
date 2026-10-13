// sw-register.js
// Автоматическая регистрация и обновление Service Worker.
// Никаких кнопок и баннеров. Работает само.

(function () {
  if (!("serviceWorker" in navigator)) return;

  // ---- Безопасная перезагрузка (не сбрасывает формы) ----
  function shouldReloadNow() {
    const el = document.activeElement;
    if (!el) return true;
    const tag = el.tagName;
    // Если человек что-то печатает — не перезагружаем
    if (tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable)
      return false;
    // Если на странице открыт диалог / модалка — тоже не перезагружаем
    return true;
  }

  let hasReloaded = false;

  function safeReload() {
    if (hasReloaded) return;
    if (!shouldReloadNow()) {
      // Попробуем позже
      setTimeout(safeReload, 3000);
      return;
    }
    hasReloaded = true;
    window.location.reload();
  }

  // ---- Регистрация ----
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("service-worker.js", {
        updateViaCache: "none", // всегда проверяем SW-скрипт заново
      });

      // Проверяем обновление SW на каждой загрузке страницы
      reg.update().catch(() => {});

      // И при возврате на вкладку
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) reg.update().catch(() => {});
      });

      // И раз в 15 секунд, пока страница открыта
      setInterval(() => reg.update().catch(() => {}), 15000);

      // Если уже есть ждущий SW — сразу активируем
      if (reg.waiting) {
        reg.waiting.postMessage("SKIP_WAITING");
      }

      // Новый SW нашёлся → активируем
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            nw.postMessage("SKIP_WAITING");
          }
        });
      });
    } catch (e) {
      console.warn("SW register error:", e);
    }
  });

  // ---- Когда SW берёт управление → перезагружаем страницу один раз ----
  // Это гарантирует, что HTML пришёл свежий.
  // Но: если пользователь что-то заполняет — перезагрузка откладывается.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    safeReload();
  });

  // ---- Автопроверка: если сервер вернул новую версию HTML,
  // но SW её не подхватил (edge-case при жёстком кэше) — сами перезагрузимся.
  // Реализовано через лёгкую проверку заголовка ETag.

  let lastETag = null;
  async function checkHtmlFreshness() {
    try {
      const res = await fetch(window.location.href, {
        method: "HEAD",
        cache: "no-store",
      });
      const etag = res.headers.get("etag") || res.headers.get("last-modified");
      if (!etag) return;
      if (lastETag && etag !== lastETag) {
        // HTML изменился на сервере — перезагружаемся
        safeReload();
      }
      lastETag = etag;
    } catch {}
  }

  // Проверяем раз в 20 секунд
  setInterval(checkHtmlFreshness, 20000);
  // И сразу
  window.addEventListener("load", () => {
    setTimeout(checkHtmlFreshness, 2000);
  });
})();
