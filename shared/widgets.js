/* ============================================================
   WIDGETS · единый движок для всех страниц
   Версия v2.1 — пре-лоадер, мини-плеер, «золотой ключ»
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Безопасные обёртки над storage ---------- */
  function sGet(store, key, fallback) {
    try {
      const v = store.getItem(key);
      return v === null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }
  function sSet(store, key, val) {
    try {
      store.setItem(key, val);
    } catch (e) {}
  }

  /* ============================================================
     1. PRELOADER — один раз за сессию, скипается
     ============================================================ */
  (function preloader() {
    if (sGet(sessionStorage, "preloader_shown_v1", "") === "1") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      sSet(sessionStorage, "preloader_shown_v1", "1");
      return;
    }
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", preloader);
      return;
    }
    if (document.getElementById("pl-overlay")) return;

    if (!document.getElementById("pl-styles")) {
      const st = document.createElement("style");
      st.id = "pl-styles";
      st.textContent = `
        .pl-overlay{position:fixed;inset:0;z-index:999999;background:#0a0806;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:1;transition:opacity .9s cubic-bezier(.16,1,.3,1),clip-path 1.2s cubic-bezier(.16,1,.3,1);clip-path:inset(0 0 0 0);overflow:hidden}
        .pl-overlay.dismissed{opacity:0;clip-path:inset(50% 0 50% 0);pointer-events:none}
        .pl-overlay::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 60% 50% at 50% 50%,rgba(181,135,148,.14),transparent 70%);pointer-events:none}
        .pl-stage{text-align:center;position:relative;z-index:2}
        .pl-text{font-family:"Instrument Serif",Georgia,serif;font-style:italic;font-size:clamp(52px,11vw,128px);line-height:1;color:#f3ede4;letter-spacing:-.03em;opacity:0;filter:blur(14px);transform:scale(1.06);animation:plIn 1.3s cubic-bezier(.16,1,.3,1) .05s forwards;padding-bottom:8px}
        .pl-hint{margin-top:26px;font-family:"Inter",system-ui,sans-serif;font-size:10.5px;font-weight:500;letter-spacing:.28em;text-transform:uppercase;color:rgba(232,212,216,.42);opacity:0;animation:plHint .7s ease 1s forwards}
        @keyframes plIn{to{opacity:1;filter:blur(0);transform:scale(1)}}
        @keyframes plHint{to{opacity:1}}
        body.pl-locked{overflow:hidden}
      `;
      document.head.appendChild(st);
    }

    const ov = document.createElement("div");
    ov.id = "pl-overlay";
    ov.className = "pl-overlay";
    ov.innerHTML = `
      <div class="pl-stage">
        <div class="pl-text">Для тебя</div>
        <div class="pl-hint">нажми, чтобы войти</div>
      </div>
    `;
    document.body.appendChild(ov);
    document.body.classList.add("pl-locked");

    let done = false;
    function dismiss() {
      if (done) return;
      done = true;
      sSet(sessionStorage, "preloader_shown_v1", "1");
      ov.classList.add("dismissed");
      document.body.classList.remove("pl-locked");
      setTimeout(() => ov.remove(), 1400);
    }

    const auto = setTimeout(dismiss, 1600);
    function skip(e) {
      if (e && e.cancelable) e.preventDefault();
      clearTimeout(auto);
      dismiss();
    }
    ov.addEventListener("click", skip);
    ov.addEventListener("touchstart", skip, { passive: false });
    document.addEventListener("keydown", skip, { once: true });
    document.addEventListener("wheel", skip, { once: true, passive: true });
  })();

  /* ============================================================
     2. SOUNDTRACK — мини-плеер на всех страницах
     ============================================================ */
  function initSoundtrack() {
    if (window.__stLoaded) return;
    window.__stLoaded = true;
    if (!document.body) return;

    const SRC = "music/our-song.mp3";
    const AUDIO_STATE = "st_state_v1";
    const AUDIO_VOL = "st_volume_v1";
    const HIDDEN_STATE = "st_player_hidden_session_v1";

    // Чистим старый ключ localStorage (из предыдущей версии)
    try {
      localStorage.removeItem("st_player_hidden_v1");
    } catch (e) {}

    let vol = parseFloat(sGet(localStorage, AUDIO_VOL, "0.3"));
    if (isNaN(vol)) vol = 0.3;
    const wasPlaying = sGet(localStorage, AUDIO_STATE, "") === "playing";
    const userHidden = sGet(sessionStorage, HIDDEN_STATE, "") === "1";

    const audio = document.createElement("audio");
    audio.src = SRC;
    audio.loop = true;
    audio.volume = vol;
    audio.preload = "metadata";
    audio.style.display = "none";
    document.body.appendChild(audio);

    if (!document.getElementById("st-styles")) {
      const st = document.createElement("style");
      st.id = "st-styles";
      st.textContent = `
        .st-player{position:fixed;bottom:90px;right:20px;z-index:99990;display:flex;align-items:center;gap:10px;padding:8px 12px 8px 8px;background:rgba(253,250,246,.94);backdrop-filter:blur(20px) saturate(160%);-webkit-backdrop-filter:blur(20px) saturate(160%);border:1px solid rgba(30,26,22,.14);border-radius:999px;box-shadow:0 20px 40px rgba(30,26,22,.16),0 4px 12px rgba(30,26,22,.06);transition:transform .5s cubic-bezier(.16,1,.3,1),opacity .5s;max-width:calc(100vw - 40px);font-family:"Inter",system-ui,sans-serif}
        .st-player.hidden{transform:translateY(130%);opacity:0;pointer-events:none}
        .st-toggle{width:40px;height:40px;border-radius:50%;background:#1e1a16;color:#f3ede4;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .3s cubic-bezier(.34,1.56,.64,1),background .3s;flex-shrink:0;padding:0}
        .st-toggle:hover{transform:scale(1.06);background:#000}
        .st-toggle svg{width:15px;height:15px;display:block}
        .st-pause{display:none}
        .st-player.playing .st-play{display:none}
        .st-player.playing .st-pause{display:block}
        .st-info{display:flex;flex-direction:column;gap:3px;min-width:82px}
        .st-label{font-family:"Instrument Serif",Georgia,serif;font-style:italic;font-size:13px;color:#1e1a16;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .st-progress{height:2px;background:rgba(30,26,22,.12);border-radius:2px;overflow:hidden}
        .st-fill{height:100%;background:#8f6472;width:0%;transition:width .15s linear;display:block}
        .st-vol{-webkit-appearance:none;appearance:none;width:64px;height:2px;background:rgba(30,26,22,.14);border-radius:2px;outline:none;cursor:pointer;flex-shrink:0;border:none}
        .st-vol::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;border-radius:50%;background:#8f6472;border:2px solid #fdfaf6;cursor:pointer;box-shadow:0 2px 4px rgba(30,26,22,.15)}
        .st-vol::-moz-range-thumb{width:12px;height:12px;border-radius:50%;background:#8f6472;border:2px solid #fdfaf6;cursor:pointer}
        .st-vol::-moz-range-track{height:2px;background:rgba(30,26,22,.14);border-radius:2px;border:none}
        .st-vol::-moz-range-progress{height:2px;background:#8f6472;border-radius:2px}
        .st-close{width:24px;height:24px;border-radius:50%;border:none;background:transparent;color:rgba(30,26,22,.4);cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;transition:all .3s;flex-shrink:0;padding:0;line-height:1;font-family:inherit}
        .st-close:hover{background:rgba(30,26,22,.08);color:#1e1a16}
        @media (max-width:560px){.st-player{bottom:84px;right:14px;padding:6px 10px 6px 6px;gap:8px}.st-toggle{width:36px;height:36px}.st-info{min-width:64px}.st-label{font-size:12px}.st-vol{width:44px}}
      `;
      document.head.appendChild(st);
    }

    const pl = document.createElement("div");
    pl.className = "st-player" + (userHidden ? " hidden" : "");
    pl.innerHTML = `
      <button class="st-toggle" aria-label="Воспроизвести">
        <svg class="st-play" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
        <svg class="st-pause" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
      </button>
      <div class="st-info">
        <span class="st-label">Наша песня</span>
        <div class="st-progress"><div class="st-fill"></div></div>
      </div>
      <input type="range" class="st-vol" min="0" max="100" value="${Math.round(vol * 100)}" aria-label="Громкость"/>
      <button class="st-close" aria-label="Свернуть" title="Свернуть">✕</button>
    `;
    document.body.appendChild(pl);

    const toggle = pl.querySelector(".st-toggle");
    const fill = pl.querySelector(".st-fill");
    const volEl = pl.querySelector(".st-vol");
    const closeBtn = pl.querySelector(".st-close");

    function setUI(playing) {
      pl.classList.toggle("playing", playing);
      toggle.setAttribute("aria-label", playing ? "Пауза" : "Воспроизвести");
    }

    function doPlay() {
      return audio
        .play()
        .then(() => {
          setUI(true);
          sSet(localStorage, AUDIO_STATE, "playing");
          sSet(sessionStorage, HIDDEN_STATE, "0");
          pl.classList.remove("hidden");
          scheduleHide();
        })
        .catch((err) => {
          // Показываем ошибку только если это не автоплей-политика
          if (
            err &&
            err.name !== "NotAllowedError" &&
            err.name !== "AbortError"
          ) {
            if (window.toast) {
              window.toast(
                "🎵 Файл песни не найден — добавь music/our-song.mp3",
                3500,
              );
            }
          }
        });
    }

    function doPause() {
      audio.pause();
      setUI(false);
      sSet(localStorage, AUDIO_STATE, "paused");
    }

    toggle.addEventListener("click", () => {
      if (audio.paused) doPlay();
      else doPause();
    });

    audio.addEventListener("timeupdate", () => {
      if (audio.duration && fill) {
        fill.style.width = (audio.currentTime / audio.duration) * 100 + "%";
      }
    });

    volEl.addEventListener("input", () => {
      const v = volEl.value / 100;
      audio.volume = v;
      sSet(localStorage, AUDIO_VOL, String(v));
    });

    closeBtn.addEventListener("click", () => {
      pl.classList.add("hidden");
      sSet(sessionStorage, HIDDEN_STATE, "1");
    });

    let hideTimer;
    function scheduleHide() {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        if (!audio.paused) pl.classList.add("hidden");
      }, 8000);
    }
    pl.addEventListener("mouseenter", () => {
      clearTimeout(hideTimer);
      pl.classList.remove("hidden");
    });
    pl.addEventListener("mouseleave", scheduleHide);

    // Пытаемся восстановить воспроизведение, если было playing
    if (wasPlaying) {
      doPlay().catch(() => {
        const unlock = () => {
          doPlay();
          document.removeEventListener("click", unlock);
          document.removeEventListener("touchstart", unlock);
          document.removeEventListener("keydown", unlock);
        };
        document.addEventListener("click", unlock);
        document.addEventListener("touchstart", unlock);
        document.addEventListener("keydown", unlock);
      });
    } else {
      setUI(false);
    }

    window.soundtrack = {
      audio,
      play: doPlay,
      pause: doPause,
      toggle: () => toggle.click(),
    };
  }

  /* ============================================================
     3. GOLDEN KEY — ссылка на комнату из топбара
     ============================================================ */
  function addGoldenKey() {
    const topbar = document.querySelector("header.topbar");
    if (!topbar) return;
    if (topbar.querySelector(".golden-key")) return;

    // На самой странице home.html ключ не нужен
    if (/home(\.html)?\/?$/.test(window.location.pathname)) return;

    if (!document.getElementById("gk-styles")) {
      const st = document.createElement("style");
      st.id = "gk-styles";
      st.textContent = `
        .golden-key{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#ecd39a 0%,#c9a35b 45%,#8a6f4d 100%);color:#1e1a16;font-size:15px;text-decoration:none;box-shadow:0 1px 0 rgba(255,240,200,.7) inset,0 6px 14px rgba(138,111,77,.35),0 0 0 1px rgba(138,111,77,.5);transition:transform .35s cubic-bezier(.34,1.56,.64,1),box-shadow .35s;margin-left:auto;margin-right:14px;flex-shrink:0;line-height:1;filter:saturate(1.05)}
        .golden-key:hover{transform:rotate(-12deg) scale(1.08);box-shadow:0 1px 0 rgba(255,240,200,.8) inset,0 10px 22px rgba(138,111,77,.5),0 0 0 1px rgba(138,111,77,.7),0 0 20px rgba(201,163,91,.55)}
        @media (max-width:640px){.golden-key{width:30px;height:30px;font-size:13px;margin-right:10px}}
      `;
      document.head.appendChild(st);
    }

    const a = document.createElement("a");
    a.className = "golden-key";
    a.href = "home.html";
    a.title = "Комната Вероники";
    a.setAttribute("aria-label", "Комната Вероники");
    a.textContent = "🔑";

    const meta = topbar.querySelector(".topbar-meta");
    if (meta) topbar.insertBefore(a, meta);
    else topbar.appendChild(a);
  }

  /* ============================================================
     4. РЕЕСТР СТРАНИЦ
     ============================================================ */
  const ALL_PAGES = {
    timer: { href: "timer.html", icon: "⏳", name: "История в цифрах" },
    song: { href: "song.html", icon: "🎵", name: "Наша песня" },
    reasons: { href: "reasons.html", icon: "💗", name: "100 причин" },
    love: { href: "love.html", icon: "💌", name: "Что я в тебе люблю" },
    surprise: { href: "surprise.html", icon: "🎁", name: "Открой меня" },
    draw: { href: "draw.html", icon: "🎨", name: "Нарисуй мне" },
    puzzle: { href: "puzzle.html", icon: "🧩", name: "Собери моё сердце" },
    map: { href: "map.html", icon: "📍", name: "Карта наших мест" },
    heartmap: { href: "heartmap.html", icon: "🗺", name: "Карта моего сердца" },
    stars: { href: "stars.html", icon: "✨", name: "Созвездие Вероники" },
    sky: { href: "sky.html", icon: "🌌", name: "Небо сегодня" },
    passport: { href: "passport.html", icon: "📋", name: "Паспорт Вероники" },
    wiki: { href: "wiki.html", icon: "📚", name: "Энциклопедия" },
    medcard: { href: "medcard.html", icon: "🩺", name: "История болезни" },
    manual: {
      href: "manual.html",
      icon: "📖",
      name: "Инструкция по применению",
    },
    boarding: { href: "boarding.html", icon: "✈️", name: "Билет в будущее" },
    slots: { href: "slots.html", icon: "🎰", name: "Слот-машина" },
    court: { href: "court.html", icon: "⚖️", name: "Суд над сердцем" },
    auction: { href: "auction.html", icon: "🏷️", name: "Аукцион · Лот №1" },
    countdown: { href: "countdown.html", icon: "📅", name: "Наши даты" },
    movie: { href: "movie.html", icon: "🎬", name: "Наш фильм" },
    credits: { href: "credits.html", icon: "🎞️", name: "Титры нашей жизни" },
    capsule: { href: "capsule.html", icon: "⏳", name: "Капсула времени" },
    horoscope: { href: "horoscope.html", icon: "🌟", name: "Гороскоп на нас" },
    temple: { href: "temple.html", icon: "🏛", name: "Храм любви" },
    menu: { href: "menu.html", icon: "🍽️", name: "Ресторан «Анатолий»" },
    clock: { href: "clock.html", icon: "🕰", name: "Часы нашей любви" },
    playlist: { href: "playlist.html", icon: "🎧", name: "Плейлист" },
    wanted: { href: "wanted.html", icon: "📰", name: "Wanted" },
    album: { href: "album.html", icon: "📸", name: "Наш фотоальбом" },
    call: { href: "call.html", icon: "📞", name: "Звонок от меня" },
    cat: { href: "cat.html", icon: "🐱", name: "Домик котика" },
    home: { href: "home.html", icon: "🏠", name: "Комната Вероники" },
    wishlist: { href: "wishlist.html", icon: "🎁", name: "Мои желания" },
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

  /* ---------- ПОГОДА (кэш 60 минут) ---------- */
  const WEATHER_CITY = { name: "Улан-Удэ" };
  const WEATHER_CACHE_KEY = "widgets_weather_v2";
  const WEATHER_CACHE_MS = 60 * 60 * 1000;

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
  function renderAutoNav() {
    const nav = document.querySelector("nav.auto-nav");
    if (!nav) return;
    nav.classList.add("nav-wrap");

    const raw = nav.getAttribute("data-nav") || "";
    const keys = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    let items;
    if (keys.length) {
      items = keys.map((k) => ALL_PAGES[k]).filter(Boolean);
    } else {
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

  /* ---------- Время в статус-бар ---------- */
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
    initSoundtrack();
    addGoldenKey();

    updateTimeWidget();
    setInterval(updateTimeWidget, 1000);

    updateStatusBarTime();
    setInterval(updateStatusBarTime, 30000);

    loadWeather(false);
    setInterval(() => loadWeather(false), 60 * 60 * 1000);

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

  window.toast = toast;
  window.escapeHtml = escapeHtml;
  window.fmtDateRu = fmtDateRu;
  window.ALL_PAGES = ALL_PAGES;
})();
