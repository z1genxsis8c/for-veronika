/* ============================================================
   WIDGETS · единый движок для всех страниц
   Подключается как <script src="shared/widgets.js" defer></script>
   ============================================================ */

(function () {
  "use strict";

  /* ============================================================
     РЕЕСТР ВСЕХ СТРАНИЦ
     Добавляешь новую — просто дописываешь сюда одну строку.
     ============================================================ */
  const ALL_PAGES = {
    // --- Блок 1: история ---
    timer: { href: "timer.html", icon: "⏳", name: "История в цифрах" },
    song: { href: "song.html", icon: "🎵", name: "Наша песня" },
    reasons: { href: "reasons.html", icon: "💗", name: "100 причин" },
    love: { href: "love.html", icon: "💌", name: "Что я в тебе люблю" },
    // --- Блок 2: сюрпризы ---
    surprise: { href: "surprise.html", icon: "🎁", name: "Открой меня" },
    draw: { href: "draw.html", icon: "🎨", name: "Нарисуй мне" },
    puzzle: { href: "puzzle.html", icon: "🧩", name: "Собери моё сердце" },
    // --- Блок 3: миры ---
    map: { href: "map.html", icon: "📍", name: "Карта наших мест" },
    heartmap: { href: "heartmap.html", icon: "🗺", name: "Карта моего сердца" },
    stars: { href: "stars.html", icon: "✨", name: "Созвездие Вероники" },
    sky: { href: "sky.html", icon: "🌌", name: "Небо сегодня" },
    // --- Блок 4: документы ---
    passport: { href: "passport.html", icon: "📋", name: "Паспорт Вероники" },
    wiki: { href: "wiki.html", icon: "📚", name: "Энциклопедия" },
    medcard: { href: "medcard.html", icon: "🩺", name: "История болезни" },
    manual: {
      href: "manual.html",
      icon: "📖",
      name: "Инструкция по применению",
    },
    boarding: { href: "boarding.html", icon: "✈️", name: "Билет в будущее" },
    // --- Блок 5: игры ---
    slots: { href: "slots.html", icon: "🎰", name: "Слот-машина" },
    court: { href: "court.html", icon: "⚖️", name: "Суд над сердцем" },
    auction: { href: "auction.html", icon: "🏷️", name: "Аукцион · Лот №1" },
    // --- Блок 6: настроение ---
    countdown: { href: "countdown.html", icon: "📅", name: "Наши даты" },
    movie: { href: "movie.html", icon: "🎬", name: "Наш фильм" },
    credits: { href: "credits.html", icon: "🎞️", name: "Титры нашей жизни" },
    capsule: { href: "capsule.html", icon: "⏳", name: "Капсула времени" },
    horoscope: { href: "horoscope.html", icon: "🌟", name: "Гороскоп на нас" },
    // --- Блок 7: места ---
    temple: { href: "temple.html", icon: "🏛", name: "Храм любви" },
    menu: { href: "menu.html", icon: "🍽️", name: "Ресторан «Анатолий»" },
    clock: { href: "clock.html", icon: "🕰", name: "Часы нашей любви" },
    playlist: { href: "playlist.html", icon: "🎧", name: "Плейлист" },
    wanted: { href: "wanted.html", icon: "📰", name: "Wanted" },
    album: { href: "album.html", icon: "📸", name: "Наш фотоальбом" },
    call: { href: "call.html", icon: "📞", name: "Звонок от меня" },
    // ... добавляй сюда новые
  };

  /* ---------- Утилиты ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) =>
    Array.from((root || document).querySelectorAll(sel));

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fmtDateRu(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  /* ---------- ТОСТ ---------- */
  let toastTimer = null;
  function toast(msg, ms) {
    ms = ms || 2200;
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), ms);
  }

  /* ---------- ЧАСЫ ---------- */
  function updateTimeWidget() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const t = document.getElementById("timeText");
    if (t) t.textContent = `${hh}:${mm}`;
    const h = now.getHours();
    let icon = "🌙";
    if (h >= 5 && h < 12) icon = "🌅";
    else if (h >= 12 && h < 18) icon = "☀️";
    else if (h >= 18 && h < 23) icon = "🌆";
    const ti = document.getElementById("timeIcon");
    if (ti) ti.textContent = icon;
  }

  /* ---------- ПОГОДА ---------- */
  const WEATHER_CITY = { name: "Улан-Удэ" };
  const WEATHER_CACHE_KEY = "widgets_weather_v1";
  const WEATHER_CACHE_MS = 30 * 60 * 1000;

  function pickIconFromDesc(desc) {
    desc = (desc || "").toLowerCase();
    if (desc.includes("sun") || desc.includes("clear")) return "☀️";
    if (desc.includes("partly") || desc.includes("mostly sun")) return "🌤️";
    if (desc.includes("cloud") || desc.includes("overcast")) return "☁️";
    if (desc.includes("rain") || desc.includes("drizzle")) return "🌧️";
    if (desc.includes("snow") || desc.includes("sleet")) return "❄️";
    if (desc.includes("thunder") || desc.includes("storm")) return "⛈️";
    if (desc.includes("fog") || desc.includes("mist")) return "🌫️";
    return "🌤️";
  }

  function seasonalWeather() {
    const m = new Date().getMonth();
    let icon, temp;
    if (m === 11 || m === 0 || m === 1) {
      icon = "❄️";
      temp = -18;
    } else if (m === 2 || m === 3) {
      icon = "🌨️";
      temp = -5;
    } else if (m === 4) {
      icon = "🌱";
      temp = 8;
    } else if (m >= 5 && m <= 7) {
      icon = "☀️";
      temp = 24;
    } else if (m === 8) {
      icon = "🍂";
      temp = 12;
    } else {
      icon = "🌧️";
      temp = 2;
    }
    return { icon, temp };
  }

  function applyWeather(data) {
    const iconEl = document.getElementById("weatherIcon");
    const textEl = document.getElementById("weatherText");
    if (!iconEl || !textEl) return;
    iconEl.textContent = data.icon;
    textEl.textContent = (data.temp > 0 ? "+" : "") + data.temp + "°C";
  }

  function readWeatherCache() {
    try {
      const raw = localStorage.getItem(WEATHER_CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.ts || Date.now() - obj.ts > WEATHER_CACHE_MS)
        return null;
      return obj.data;
    } catch (e) {
      return null;
    }
  }
  function writeWeatherCache(data) {
    try {
      localStorage.setItem(
        WEATHER_CACHE_KEY,
        JSON.stringify({ ts: Date.now(), data }),
      );
    } catch (e) {}
  }

  async function loadWeather(force) {
    const iconEl = document.getElementById("weatherIcon");
    const textEl = document.getElementById("weatherText");
    if (!iconEl || !textEl) return;

    if (!force) {
      const cached = readWeatherCache();
      if (cached) {
        applyWeather(cached);
        return;
      }
    }

    iconEl.textContent = "⛅";
    textEl.textContent = "...";
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(
        `https://wttr.in/${encodeURIComponent(WEATHER_CITY.name)}?format=j1`,
        { signal: ctrl.signal, cache: "no-store" },
      );
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const cur = data.current_condition && data.current_condition[0];
        if (cur && cur.temp_C !== undefined) {
          const temp = parseInt(cur.temp_C, 10);
          const desc =
            cur.weatherDesc && cur.weatherDesc[0]
              ? cur.weatherDesc[0].value
              : "";
          const out = { icon: pickIconFromDesc(desc), temp };
          applyWeather(out);
          writeWeatherCache(out);
          return;
        }
      }
    } catch (e) {}
    const w = seasonalWeather();
    applyWeather(w);
    writeWeatherCache(w);
  }

  /* ---------- АВТО-НАВИГАЦИЯ ---------- */
  /*
    Использование в HTML:
      <nav class="auto-nav" data-nav="temple,slots,passport"></nav>
    или без data-nav — покажутся 4 случайных страницы.
  */
  function renderAutoNav() {
    const nav = document.querySelector("nav.auto-nav");
    if (!nav) return;

    nav.classList.add("nav-wrap"); // ← ЭТА СТРОКА — чтобы сработали стили из base.css

    const raw = nav.getAttribute("data-nav") || "";
    const keys = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    let items;
    if (keys.length) {
      items = keys.map((k) => ALL_PAGES[k]).filter(Boolean);
    } else {
      // если не указано — берём 4 случайных
      const all = Object.values(ALL_PAGES);
      const shuffled = all.slice().sort(() => Math.random() - 0.5);
      items = shuffled.slice(0, 4);
    }

    const home = `
      <a href="index.html" class="back-link">
        <span class="arrow">←</span>
        <span>На главную</span>
      </a>
    `;
    const links = items
      .map(
        (p) => `
        <a href="${p.href}" class="nav-link-secondary">
          <span class="icon">${p.icon}</span>
          <span>${escapeHtml(p.name)}</span>
        </a>`,
      )
      .join("");

    nav.innerHTML = home + links;
  }

  /* ---------- SERVICE WORKER ---------- */
  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", async () => {
      try {
        const reg = await navigator.serviceWorker.register(
          "service-worker.js",
          { updateViaCache: "none" },
        );
        setInterval(() => reg.update().catch(() => {}), 30000);
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            if (
              nw.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              nw.postMessage("SKIP_WAITING");
            }
          });
        });
      } catch (e) {}
    });

    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  }

  /* ---------- Авто-подстановка времени в статус-бар (если есть) ---------- */
  function updateStatusBarTime() {
    const el = document.getElementById("statusTime");
    if (!el) return;
    const now = new Date();
    el.textContent =
      now.getHours() + ":" + String(now.getMinutes()).padStart(2, "0");
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    updateTimeWidget();
    setInterval(updateTimeWidget, 1000);

    updateStatusBarTime();
    setInterval(updateStatusBarTime, 30000);

    loadWeather(false);
    setInterval(() => loadWeather(false), 30 * 60 * 1000);

    const iw = document.getElementById("infoWidget");
    if (iw) iw.addEventListener("click", () => loadWeather(true));

    renderAutoNav();
    registerServiceWorker();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* ---------- Экспорт в window ---------- */
  window.toast = toast;
  window.escapeHtml = escapeHtml;
  window.fmtDateRu = fmtDateRu;
  window.ALL_PAGES = ALL_PAGES;
})();
