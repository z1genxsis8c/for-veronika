/* =========================================================
   НАСТРОЙКИ
   ========================================================= */
const CONFIG = {
  playerName: "Котик",
  girlName: "Любимая",
  finalMessage:
    "Ты — моё самое тёплое место на свете.<br>Спасибо, что ты рядом. 💗",
  maxWave: 200,
  coinPer1000: 100,
  unlockWaveAch: 5,
  unlockScoreAch: 50000,
  upgradeAutoSec: 12,
  upgradeChoices: 4,
  infiniteUnlockWave: 15,
};

/* =========================================================
   УТИЛИТЫ
   ========================================================= */
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const dist2 = (x1, y1, x2, y2) => {
  const dx = x1 - x2,
    dy = y1 - y2;
  return dx * dx + dy * dy;
};
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = rndi(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const _lightenCache = new Map();
function lighten(hex) {
  let v = _lightenCache.get(hex);
  if (v) return v;
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) + 70);
  const g = Math.min(255, ((n >> 8) & 255) + 70);
  const b = Math.min(255, (n & 255) + 70);
  v = `rgb(${r},${g},${b})`;
  _lightenCache.set(hex, v);
  return v;
}

/* =========================================================
   ЗВУК
   ========================================================= */
let actx = null;
function beep(freq, dur, type = "sine", vol = 0.05, slideTo = 0) {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    const t = actx.currentTime;
    const o = actx.createOscillator(),
      g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo)
      o.frequency.exponentialRampToValueAtTime(Math.max(50, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(actx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch (e) {}
}

/* =========================================================
   КАНВАС
   ========================================================= */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let W = 0,
  H = 0,
  DPR = 1,
  bgGrad = null,
  vignette = null;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  bgGrad = ctx.createRadialGradient(
    W * 0.5,
    H * 0.42,
    0,
    W * 0.5,
    H * 0.5,
    Math.max(W, H) * 0.78,
  );
  bgGrad.addColorStop(0, "#241035");
  bgGrad.addColorStop(0.45, "#170a26");
  bgGrad.addColorStop(1, "#0a0412");
  vignette = ctx.createRadialGradient(
    W * 0.5,
    H * 0.5,
    Math.min(W, H) * 0.28,
    W * 0.5,
    H * 0.5,
    Math.max(W, H) * 0.78,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(4,0,10,.78)");
  if (G.player) {
    G.player.x = clamp(G.player.x, 30, W - 30);
    G.player.y = clamp(G.player.y, 30, H - 30);
  }
  for (const e of G.enemies) {
    e.x = clamp(e.x, e.r, W - e.r);
    e.y = clamp(e.y, e.r, H - e.r);
  }
}
window.addEventListener("resize", resize);

/* =========================================================
   СПРАЙТЫ (кэш)
   ========================================================= */
const _enemyBodySprites = new Map();
function getEnemyBodySprite(r, color, flash) {
  const key = color + "|" + Math.round(r) + (flash ? "|f" : "");
  let c = _enemyBodySprites.get(key);
  if (c) return c;
  const pad = 6;
  const size = Math.ceil(r * 2 + pad * 2);
  c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const cx = c.getContext("2d");
  const ox = size / 2,
    oy = size / 2;
  if (flash) {
    cx.fillStyle = "#fff";
  } else {
    const grad = cx.createRadialGradient(
      ox - r * 0.3,
      oy - r * 0.3,
      r * 0.15,
      ox,
      oy,
      r,
    );
    grad.addColorStop(0, lighten(color));
    grad.addColorStop(1, color);
    cx.fillStyle = grad;
  }
  cx.beginPath();
  cx.arc(ox, oy, r, 0, TAU);
  cx.fill();
  _enemyBodySprites.set(key, c);
  return c;
}

const _bulletSprites = new Map();
function getBulletSprite(color, fill) {
  const key = color + "|" + fill;
  let c = _bulletSprites.get(key);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const cx = c.getContext("2d");
  cx.shadowColor = color;
  cx.shadowBlur = 14;
  cx.fillStyle = fill;
  heartPath(cx, 32, 32, 9);
  cx.fill();
  cx.shadowBlur = 0;
  cx.fillStyle = "rgba(255,255,255,.65)";
  heartPath(cx, 32 - 9 * 0.18, 32 - 9 * 0.2, 9 * 0.42);
  cx.fill();
  _bulletSprites.set(key, c);
  return c;
}

/* =========================================================
   СОСТОЯНИЕ
   ========================================================= */
const G = {
  state: "menu",
  t: 0,
  wave: 0,
  waveActive: false,
  spawnQueue: [],
  spawnTimer: 0,
  breather: 1.2,
  enemies: [],
  bullets: [],
  ebullets: [],
  parts: [],
  texts: [],
  player: null,
  upgradesTaken: {},
  kills: 0,
  pendingLevels: 0,
  shake: 0,
  msgTimer: 0,
  score: 0,
  bestScore: 0,
  boss: null,
  bossFlash: 0,
  waveStuckTimer: 0,
  pendingChest: false,
  pendingWaveMsg: null,
  tomesTaken: {},
};

const _hudCache = {
  hp: "",
  shield: "",
  level: -1,
  wave: "",
  score: "",
  kills: "",
  bossHint: "",
};
let _autoUpgradeTimeout = null,
  _upgradeTickId = null,
  _upgradeDeadline = 0;
let currentChoices = []; // ★ объявлена явно
let _inventoryPrevState = null;

try {
  G.bestScore =
    parseInt(localStorage.getItem("thornBestScore") || "0", 10) || 0;
} catch (e) {}

/* =========================================================
   ИГРОК
   ========================================================= */
function makePlayer() {
  return {
    x: W / 2,
    y: H / 2,
    r: 17,
    hp: 100,
    maxHp: 100,
    speed: 228,
    dmg: 12,
    fireRate: 2.4,
    cool: 0,
    bulletSpeed: 570,
    projSize: 9,
    pierce: 0,
    multishot: 1,
    homing: 0,
    crit: 0.05,
    critMult: 2,
    lifesteal: 0,
    regen: 0,
    thorns: 0,
    auraR: 0,
    auraTick: 0,
    level: 1,
    iframe: 0,
    hurtFlash: 0,
    t: 0,
    moving: 0,
    blink: 1,
    auraPulse: 0,
    armor: 0,
    dodge: 0,
    explosive: 0,
    freezeChance: 0,
    ricochet: 0,
    killHeal: 0,
    berserk: 0,
    retaliation: 0,
    secondwind: 0,
    precision: 0,
    tide: 0,
    tideCd: 5,
    burn: 0,
    endurance: 0,
    swordsman: 0,
    sniper: 0,
    reflector: 0,
    shield: 0,
    maxShield: 0,
    shieldRegen: 0,
    shieldRegenDelay: 0,
    glassCannon: false,
    windBonus: 0,
    stillness: false,
    electro: false,
    elementalBoost: 1,
    shotsFired: 0,
  };
}

/* =========================================================
   АПГРЕЙДЫ
   ========================================================= */
const UPGRADES = [
  /* -------- УРОН -------- */
  {
    id: "dmg1",
    name: "Сильный удар",
    icon: "🐾",
    desc: "+20% урона",
    max: 1,
    tree: "dmg",
    tier: 1,
    apply: (p) => {
      p.dmg *= 1.2;
    },
  },
  {
    id: "dmg2",
    name: "Мощный выстрел",
    icon: "💥",
    desc: "+30% урона",
    max: 1,
    tree: "dmg",
    tier: 2,
    required: ["dmg1"],
    apply: (p) => {
      p.dmg *= 1.3;
    },
  },
  {
    id: "dmg3",
    name: "Убийственный удар",
    icon: "☠️",
    desc: "+40% урона, +10% крит. урона",
    max: 1,
    tree: "dmg",
    tier: 3,
    required: ["dmg2"],
    apply: (p) => {
      p.dmg *= 1.4;
      p.critMult += 0.1;
    },
  },
  {
    id: "bigshot",
    name: "Большой выстрел",
    icon: "🎯",
    desc: "+15% урона, +25% размер снаряда",
    max: 3,
    tree: "dmg",
    tier: 2,
    required: ["dmg1"],
    apply: (p) => {
      p.dmg *= 1.15;
      p.projSize *= 1.25;
    },
  },

  /* -------- СКОРОСТРЕЛЬНОСТЬ -------- */
  {
    id: "rate1",
    name: "Быстрая лапка",
    icon: "⚡",
    desc: "+12% скорострельности",
    max: 1,
    tree: "rate",
    tier: 1,
    apply: (p) => {
      p.fireRate *= 1.12;
    },
  },
  {
    id: "rate2",
    name: "Шквал",
    icon: "🌪️",
    desc: "+18% скорострельности",
    max: 1,
    tree: "rate",
    tier: 2,
    required: ["rate1"],
    apply: (p) => {
      p.fireRate *= 1.18;
    },
  },
  {
    id: "rate3",
    name: "Свинцовый дождь",
    icon: "🌧️",
    desc: "+25% скорострельности",
    max: 1,
    tree: "rate",
    tier: 3,
    required: ["rate2"],
    apply: (p) => {
      p.fireRate *= 1.25;
    },
  },
  {
    id: "lightbullets",
    name: "Лёгкие пули",
    icon: "🪶",
    desc: "+10% скорострельности, +1 снаряд, +10% скорость снаряда",
    max: 2,
    tree: "rate",
    tier: 2,
    required: ["rate1"],
    apply: (p) => {
      p.fireRate *= 1.1;
      p.multishot += 1;
      p.bulletSpeed *= 1.1;
    },
  },

  /* -------- СНАРЯДЫ -------- */
  {
    id: "multi1",
    name: "Двойной пуф",
    icon: "✨",
    desc: "+1 снаряд, -10% урона",
    max: 1,
    tree: "multi",
    tier: 1,
    apply: (p) => {
      p.multishot += 1;
      p.dmg *= 0.9;
    },
  },
  {
    id: "multi2",
    name: "Веер",
    icon: "🪭",
    desc: "+1 снаряд",
    max: 1,
    tree: "multi",
    tier: 2,
    required: ["multi1"],
    apply: (p) => {
      p.multishot += 1;
    },
  },
  {
    id: "multi3",
    name: "Фузильяда",
    icon: "🎆",
    desc: "+2 снаряда, -15% урона",
    max: 1,
    tree: "multi",
    tier: 3,
    required: ["multi2"],
    apply: (p) => {
      p.multishot += 2;
      p.dmg *= 0.85;
    },
  },
  {
    id: "splitfire",
    name: "Раздвоение",
    icon: "🔀",
    desc: "+1 снаряд, -3% урон",
    max: 2,
    tree: "multi",
    tier: 2,
    required: ["multi1"],
    apply: (p) => {
      p.multishot += 1;
      p.dmg *= 0.97;
    },
  },

  /* -------- ПРОБИТИЕ -------- */
  {
    id: "pierce1",
    name: "Пробивающий взгляд",
    icon: "🎯",
    desc: "Пробивает +1 врага",
    max: 1,
    tree: "pierce",
    tier: 1,
    apply: (p) => {
      p.pierce += 1;
    },
  },
  {
    id: "pierce2",
    name: "Бронебой",
    icon: "🔩",
    desc: "Пробивает +2 врага",
    max: 1,
    tree: "pierce",
    tier: 2,
    required: ["pierce1"],
    apply: (p) => {
      p.pierce += 2;
    },
  },
  {
    id: "pierce3",
    name: "Реактивный снаряд",
    icon: "🚀",
    desc: "Пробивает +3 врага, +10% урон",
    max: 1,
    tree: "pierce",
    tier: 3,
    required: ["pierce2"],
    apply: (p) => {
      p.pierce += 3;
      p.dmg *= 1.1;
    },
  },

  /* -------- КРИТЫ -------- */
  {
    id: "crit1",
    name: "Меткий котик",
    icon: "🍀",
    desc: "+8% шанс крита",
    max: 1,
    tree: "crit",
    tier: 1,
    apply: (p) => {
      p.crit = Math.min(0.85, p.crit + 0.08);
    },
  },
  {
    id: "crit2",
    name: "Грозный укус",
    icon: "🦷",
    desc: "+30% крит. урона",
    max: 1,
    tree: "crit",
    tier: 2,
    required: ["crit1"],
    apply: (p) => {
      p.critMult += 0.3;
    },
  },
  {
    id: "crit3",
    name: "Смертельный инстинкт",
    icon: "🎯",
    desc: "+10% крит, +40% крит. урона",
    max: 1,
    tree: "crit",
    tier: 3,
    required: ["crit2"],
    apply: (p) => {
      p.crit = Math.min(0.85, p.crit + 0.1);
      p.critMult += 0.4;
    },
  },
  {
    id: "critmastery",
    name: "Мастерство",
    icon: "🏆",
    desc: "+5% крит, +20% крит. урона",
    max: 3,
    tree: "crit",
    tier: 2,
    required: ["crit1"],
    apply: (p) => {
      p.crit = Math.min(0.85, p.crit + 0.05);
      p.critMult += 0.2;
    },
  },

  /* -------- СТИХИИ -------- */
  {
    id: "firestarter",
    name: "Искра",
    icon: "🔥",
    desc: "Снаряды поджигают (DoT)",
    max: 1,
    tree: "elem",
    tier: 1,
    apply: (p) => {
      p.burn += 1;
    },
  },
  {
    id: "explosive1",
    name: "Разрывной удар",
    icon: "💥",
    desc: "Снаряды взрываются (АОЕ)",
    max: 1,
    tree: "elem",
    tier: 1,
    apply: (p) => {
      p.explosive += 1;
    },
  },
  {
    id: "intenseburn",
    name: "Интенсивное горение",
    icon: "🔥",
    desc: "+50% урона от горения",
    max: 1,
    tree: "elem",
    tier: 2,
    required: ["firestarter"],
    apply: (p) => {
      p.burn += 1;
    },
  },
  {
    id: "frostbite",
    name: "Обморожение",
    icon: "❄️",
    desc: "+8% шанс заморозить",
    max: 1,
    tree: "elem",
    tier: 1,
    apply: (p) => {
      p.freezeChance += 0.08;
    },
  },
  {
    id: "deepfreeze",
    name: "Глубокая заморозка",
    icon: "🧊",
    desc: "+12% шанс заморозить",
    max: 1,
    tree: "elem",
    tier: 2,
    required: ["frostbite"],
    apply: (p) => {
      p.freezeChance += 0.12;
    },
  },

  /* -------- HP / ЗАЩИТА -------- */
  {
    id: "hp1",
    name: "Мягкая шубка",
    icon: "💗",
    desc: "+30 макс. HP и лечение",
    max: 1,
    tree: "hp",
    tier: 1,
    apply: (p) => {
      p.maxHp += 30;
      p.hp += 30;
    },
  },
  {
    id: "hp2",
    name: "Плотная шерсть",
    icon: "🧶",
    desc: "+50 макс. HP и полное лечение",
    max: 1,
    tree: "hp",
    tier: 2,
    required: ["hp1"],
    apply: (p) => {
      p.maxHp += 50;
      p.hp = p.maxHp;
    },
  },
  {
    id: "armor1",
    name: "Пушистый доспех",
    icon: "🛡️",
    desc: "-10% получаемого урона",
    max: 1,
    tree: "def",
    tier: 1,
    apply: (p) => {
      p.armor = Math.min(0.6, p.armor + 0.1);
    },
  },
  {
    id: "armor2",
    name: "Стальная шерсть",
    icon: "🔰",
    desc: "-15% получаемого урона",
    max: 1,
    tree: "def",
    tier: 2,
    required: ["armor1"],
    apply: (p) => {
      p.armor = Math.min(0.7, p.armor + 0.15);
    },
  },
  {
    id: "dodge1",
    name: "Кошачья грация",
    icon: "🌀",
    desc: "+8% шанс уклониться",
    max: 1,
    tree: "dodge",
    tier: 1,
    apply: (p) => {
      p.dodge = Math.min(0.5, p.dodge + 0.08);
    },
  },
  {
    id: "shield1",
    name: "Барьер",
    icon: "🔰",
    desc: "+25 щита, восстанавливается",
    max: 1,
    tree: "shield",
    tier: 1,
    apply: (p) => {
      p.maxShield += 25;
      p.shieldRegen += 2;
      p.shield = p.maxShield;
    },
  },

  /* -------- ВОССТАНОВЛЕНИЕ -------- */
  {
    id: "regen1",
    name: "Тёплое местечко",
    icon: "🌿",
    desc: "+0.8 HP/сек",
    max: 1,
    tree: "regen",
    tier: 1,
    apply: (p) => {
      p.regen += 0.8;
    },
  },
  {
    id: "regen2",
    name: "Целительная аура",
    icon: "💚",
    desc: "+1.2 HP/сек",
    max: 1,
    tree: "regen",
    tier: 2,
    required: ["regen1"],
    apply: (p) => {
      p.regen += 1.2;
    },
  },
  {
    id: "lifesteal1",
    name: "Ласковые лапки",
    icon: "💞",
    desc: "+3% вампиризма",
    max: 1,
    tree: "steal",
    tier: 1,
    apply: (p) => {
      p.lifesteal += 0.03;
    },
  },
  {
    id: "killheal1",
    name: "Сладкая кровь",
    icon: "🍯",
    desc: "+2 HP за убийство",
    max: 1,
    tree: "killheal",
    tier: 1,
    apply: (p) => {
      p.killHeal += 2;
    },
  },

  /* -------- АУРА -------- */
  {
    id: "aura1",
    name: "Мурчание",
    icon: "🎵",
    desc: "+30 радиус ауры, +8 урона",
    max: 1,
    tree: "aura",
    tier: 1,
    apply: (p) => {
      p.auraR += 30;
      p.thorns += 8;
    },
  },
  {
    id: "thorns1",
    name: "Шипы",
    icon: "🌵",
    desc: "+15 урона в ауре, +30 радиус",
    max: 1,
    tree: "aura",
    tier: 1,
    apply: (p) => {
      p.thorns += 15;
      p.auraR = Math.max(p.auraR, 30);
    },
  },
  {
    id: "aura2",
    name: "Громкое мурчание",
    icon: "📢",
    desc: "+40 радиус, +12 урона",
    max: 1,
    tree: "aura",
    tier: 2,
    required: ["aura1"],
    apply: (p) => {
      p.auraR += 40;
      p.thorns += 12;
    },
  },

  /* -------- УТИЛИТА -------- */
  {
    id: "speed1",
    name: "Лёгкий шаг",
    icon: "👟",
    desc: "+10% скорости передвижения",
    max: 1,
    tree: "speed",
    tier: 1,
    apply: (p) => {
      p.speed *= 1.1;
    },
  },
  {
    id: "speed2",
    name: "Ветер в лапах",
    icon: "💨",
    desc: "+15% скорости",
    max: 1,
    tree: "speed",
    tier: 2,
    required: ["speed1"],
    apply: (p) => {
      p.speed *= 1.15;
    },
  },
  {
    id: "homing1",
    name: "Мурчащий прицел",
    icon: "🧭",
    desc: "Снаряды наводятся",
    max: 3,
    tree: "util",
    tier: 1,
    apply: (p) => {
      p.homing += 1.5;
    },
  },
  {
    id: "ricochet1",
    name: "Отскок",
    icon: "🎱",
    desc: "Снаряды отскакивают +1",
    max: 3,
    tree: "util",
    tier: 1,
    apply: (p) => {
      p.ricochet += 1;
    },
  },

  /* -------- ОСОБЫЕ (были мёртвыми механиками) -------- */
  {
    id: "retaliation1",
    name: "Возмездие",
    icon: "💢",
    desc: "Взрыв вокруг при получении урона",
    max: 2,
    tree: "special",
    tier: 1,
    apply: (p) => {
      p.retaliation += 1;
    },
  },
  {
    id: "secondwind1",
    name: "Второе дыхание",
    icon: "🌬️",
    desc: "Пережить смертельный удар (+1 заряд)",
    max: 2,
    tree: "special",
    tier: 1,
    apply: (p) => {
      p.secondwind += 1;
    },
  },
  {
    id: "tide1",
    name: "Прилив",
    icon: "🌊",
    desc: "Периодическая неуязвимость",
    max: 2,
    tree: "special",
    tier: 1,
    apply: (p) => {
      p.tide += 1;
    },
  },
  {
    id: "swordsman1",
    name: "Стойка",
    icon: "🗡️",
    desc: "+10% урона, когда стоишь",
    max: 2,
    tree: "special",
    tier: 1,
    apply: (p) => {
      p.swordsman += 1;
    },
  },
  {
    id: "sniper1",
    name: "Дальний глаз",
    icon: "🏹",
    desc: "+15% урона по дальним (>400px)",
    max: 2,
    tree: "special",
    tier: 1,
    apply: (p) => {
      p.sniper += 1;
    },
  },
  {
    id: "reflector1",
    name: "Зеркало",
    icon: "🪞",
    desc: "+5% шанс отразить снаряд",
    max: 2,
    tree: "special",
    tier: 1,
    apply: (p) => {
      p.reflector += 1;
    },
  },

  /* -------- СИНЕРГИИ -------- */
  {
    id: "syn_firestorm",
    name: "Огненный шторм",
    icon: "🌋",
    desc: "Взрывы поджигают врагов",
    max: 1,
    synergy: true,
    required: ["firestarter", "explosive1"],
    apply: (p) => {
      p.burn += 1;
      p.explosive += 1;
    },
  },
  {
    id: "syn_frostfire",
    name: "Ледяное пламя",
    icon: "❄️🔥",
    desc: "Заморозка + горение вместе",
    max: 1,
    synergy: true,
    required: ["frostbite", "firestarter"],
    apply: (p) => {
      p.freezeChance += 0.05;
      p.burn += 1;
    },
  },
  {
    id: "syn_bloodfeast",
    name: "Кровавый пир",
    icon: "🩸",
    desc: "Вампиризм + лечение усилены",
    max: 1,
    synergy: true,
    required: ["lifesteal1", "killheal1"],
    apply: (p) => {
      p.lifesteal += 0.04;
      p.killHeal += 2;
    },
  },
  {
    id: "syn_deadlyaim",
    name: "Смертельный прицел",
    icon: "🏹",
    desc: "Пробитые снаряды +30% урона",
    max: 1,
    synergy: true,
    required: ["pierce1", "crit1"],
    apply: (p) => {
      p.precision += 2;
    },
  },
  {
    id: "syn_ironwill",
    name: "Железная воля",
    icon: "🦾",
    desc: "При HP<40%: +30% урон, +20% броня",
    max: 1,
    synergy: true,
    required: ["hp1", "armor1"],
    apply: (p) => {
      p.berserk += 1;
      p.endurance += 1;
    },
  },
  {
    id: "syn_thunder",
    name: "Громовой удар",
    icon: "⚡",
    desc: "Каждый 8-й выстрел — молния",
    max: 1,
    synergy: true,
    required: ["rate1", "ricochet1"],
    apply: (p) => {
      p.electro = true;
    },
  },
  {
    id: "syn_auraofdeath",
    name: "Аура смерти",
    icon: "💀",
    desc: "Аура наносит +50% урона",
    max: 1,
    synergy: true,
    required: ["aura1", "thorns1"],
    apply: (p) => {
      p.thorns *= 1.5;
    },
  },
  {
    id: "syn_bullethell",
    name: "Свинцовый ад",
    icon: "🎇",
    desc: "+2 снаряда, -10% урона",
    max: 1,
    synergy: true,
    required: ["multi1", "rate1"],
    apply: (p) => {
      p.multishot += 2;
      p.dmg *= 0.9;
    },
  },

  /* -------- БЕСКОНЕЧНЫЕ (появляются с 15-й волны) -------- */
  {
    id: "inf_dmg",
    name: "Точилка когтей",
    icon: "⚔️",
    desc: "+5% урона",
    max: 25,
    infinite: true,
    apply: (p) => {
      p.dmg *= 1.05;
    },
  },
  {
    id: "inf_rate",
    name: "Смазка",
    icon: "💧",
    desc: "+4% скорострельности",
    max: 20,
    infinite: true,
    apply: (p) => {
      p.fireRate *= 1.04;
    },
  },
  {
    id: "inf_hp",
    name: "Питание",
    icon: "🍖",
    desc: "+10 макс. HP",
    max: 20,
    infinite: true,
    apply: (p) => {
      p.maxHp += 10;
      p.hp += 10;
    },
  },
  {
    id: "inf_crit",
    name: "Наблюдательность",
    icon: "👁️",
    desc: "+3% шанс крита",
    max: 12,
    infinite: true,
    apply: (p) => {
      p.crit = Math.min(0.9, p.crit + 0.03);
    },
  },
  {
    id: "inf_critdmg",
    name: "Ярость охотника",
    icon: "🎯",
    desc: "+15% крит. урона",
    max: 12,
    infinite: true,
    apply: (p) => {
      p.critMult += 0.15;
    },
  },
  {
    id: "inf_regen",
    name: "Исцеление",
    icon: "💚",
    desc: "+0.3 HP/сек",
    max: 15,
    infinite: true,
    apply: (p) => {
      p.regen += 0.3;
    },
  },
  {
    id: "inf_speed",
    name: "Разминка",
    icon: "🏃",
    desc: "+3% скорости",
    max: 12,
    infinite: true,
    apply: (p) => {
      p.speed *= 1.03;
    },
  },
  {
    id: "inf_pierce",
    name: "Заточка",
    icon: "🗡️",
    desc: "+1 пробитие",
    max: 5,
    infinite: true,
    apply: (p) => {
      p.pierce += 1;
    },
  },
  {
    id: "inf_steal",
    name: "Голод",
    icon: "🩸",
    desc: "+1% вампиризма",
    max: 10,
    infinite: true,
    apply: (p) => {
      p.lifesteal += 0.01;
    },
  },
  {
    id: "inf_armor",
    name: "Закалка",
    icon: "🦾",
    desc: "+3% брони",
    max: 8,
    infinite: true,
    apply: (p) => {
      p.armor = Math.min(0.75, p.armor + 0.03);
    },
  },
];

const TOMES = [
  {
    id: "tome_power",
    name: "Том Силы",
    icon: "📕",
    desc: "+50% урон, +100% размер, +1 пробитие, -25% скорострельность, -1 HP",
    apply: (p) => {
      p.dmg *= 1.5;
      p.projSize *= 2;
      p.pierce += 1;
      p.fireRate *= 0.75;
      p.maxHp = Math.max(1, p.maxHp - 1);
    },
  },
  {
    id: "tome_glass",
    name: "Том Стекла",
    icon: "📘",
    desc: "Урон ×2, но любой урон убивает",
    apply: (p) => {
      p.dmg *= 2;
      p.glassCannon = true;
    },
  },
  {
    id: "tome_rage",
    name: "Том Ярости",
    icon: "📙",
    desc: "+60% скорострельность, -50% урон",
    apply: (p) => {
      p.fireRate *= 1.6;
      p.dmg *= 0.5;
    },
  },
  {
    id: "tome_speed",
    name: "Том Скорости",
    icon: "📗",
    desc: "+50% скорость, -1 HP",
    apply: (p) => {
      p.speed *= 1.5;
      p.maxHp = Math.max(1, p.maxHp - 1);
    },
  },
  {
    id: "tome_vitality",
    name: "Том Жизни",
    icon: "📒",
    desc: "+50 макс. HP, полное лечение",
    apply: (p) => {
      p.maxHp += 50;
      p.hp = p.maxHp;
    },
  },
  {
    id: "tome_might",
    name: "Том Мощи",
    icon: "📓",
    desc: "+2 урона за каждые 10 макс. HP",
    apply: (p) => {
      p.dmg += Math.floor(p.maxHp / 10) * 2;
    },
  },
  {
    id: "tome_elements",
    name: "Том Стихий",
    icon: "📔",
    desc: "+35% урона от горения/заморозки",
    apply: (p) => {
      p.elementalBoost = 1.35;
    },
  },
  {
    id: "tome_stillness",
    name: "Том Неподвижности",
    icon: "📕",
    desc: "-100% скорость, +100% урон, +1 снаряд",
    apply: (p) => {
      p.speed = 0;
      p.dmg *= 2;
      p.multishot += 1;
      p.stillness = true;
    },
  },
  {
    id: "tome_wind",
    name: "Том Ветра",
    icon: "📗",
    desc: "+10% скорость, урон растёт от скорости",
    apply: (p) => {
      p.speed *= 1.1;
      p.windBonus = 0.5;
    },
  },
  {
    id: "tome_summoning",
    name: "Том Призыва",
    icon: "📘",
    desc: "+50% урон и радиус ауры",
    apply: (p) => {
      p.thorns *= 1.5;
      p.auraR *= 1.5;
    },
  },
  {
    id: "tome_electro",
    name: "Том Электро",
    icon: "📙",
    desc: "+25% скорострельность, -16% урон, молния",
    apply: (p) => {
      p.fireRate *= 1.25;
      p.dmg *= 0.84;
      p.electro = true;
    },
  },
];

function isUpgradeAvailable(u, taken) {
  if ((taken[u.id] || 0) >= u.max) return false;
  if (u.required) {
    for (const req of u.required) if (!(taken[req] > 0)) return false;
  }
  if (u.infinite && G.wave < CONFIG.infiniteUnlockWave) return false;
  return true;
}

function makeHealCard(i) {
  const variants = [
    {
      name: "Подушечка любви",
      icon: "🩹",
      desc: "Восстановить 45 HP",
      apply: (p) => {
        p.hp = Math.min(p.maxHp, p.hp + 45);
      },
    },
    {
      name: "Тёплое молоко",
      icon: "🥛",
      desc: "+5 макс. HP и 30 HP",
      apply: (p) => {
        p.maxHp += 5;
        p.hp = Math.min(p.maxHp, p.hp + 30);
      },
    },
    {
      name: "Рыбка",
      icon: "🐟",
      desc: "Восстановить 100 HP",
      apply: (p) => {
        p.hp = Math.min(p.maxHp, p.hp + 100);
      },
    },
  ];
  const v = variants[i % variants.length];
  return {
    id: "heal_" + i + "_" + Math.random().toString(36).slice(2, 6),
    ...v,
    max: 999,
  };
}

function pickUpgrades(n) {
  const available = UPGRADES.filter((u) =>
    isUpgradeAvailable(u, G.upgradesTaken),
  );
  if (!available.length) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(makeHealCard(i));
    return out;
  }

  function weight(u) {
    let w = 1;
    if (u.synergy) w *= 12;
    if (u.infinite) w *= 0.4;
    if (u.tree) {
      const started = Object.keys(G.upgradesTaken).some((id) => {
        const uu = UPGRADES.find((x) => x.id === id);
        return uu && uu.tree === u.tree;
      });
      if (started) w *= 2;
    }
    return w;
  }

  const pool = available.slice();
  const wpool = pool.map(weight);
  const picked = [];
  while (picked.length < n && pool.length) {
    let total = 0;
    for (const w of wpool) total += w;
    let r = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < wpool.length; i++) {
      r -= wpool[i];
      if (r <= 0) {
        idx = i;
        break;
      }
      idx = i;
    }
    idx = clamp(idx, 0, pool.length - 1);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
    wpool.splice(idx, 1);
  }
  while (picked.length < n) picked.push(makeHealCard(picked.length));
  return picked;
}

function pickBestAuto(choices) {
  if (!choices.length) return null;
  let best = choices[0],
    bestScore = -Infinity;
  for (const u of choices) {
    let score = 0;
    if (u.synergy) score += 100;
    if (u.id && u.id.startsWith("heal")) score -= 50;
    if (u.tree) {
      const started = Object.keys(G.upgradesTaken).some((id) => {
        const uu = UPGRADES.find((x) => x.id === id);
        return uu && uu.tree === u.tree;
      });
      if (started) score += 20;
    }
    if (u.tier === 3) score += 15;
    else if (u.tier === 2) score += 10;
    else if (u.tier === 1) score += 5;
    score -= (G.upgradesTaken[u.id] || 0) * 3;
    if (score > bestScore) {
      bestScore = score;
      best = u;
    }
  }
  return best;
}

/* =========================================================
   ТИПЫ ВРАГОВ
   ========================================================= */
const ENEMY_TYPES = {
  thorn: {
    hp: 18,
    speed: 63,
    dmg: 9,
    score: 10,
    r: 15,
    color: "#8b5cf6",
    spikes: 8,
  },
  swift: {
    hp: 11,
    speed: 110,
    dmg: 7,
    score: 15,
    r: 11,
    color: "#f472b6",
    spikes: 6,
  },
  brute: {
    hp: 56,
    speed: 46,
    dmg: 16,
    score: 30,
    r: 25,
    color: "#a855f7",
    spikes: 10,
  },
  shooter: {
    hp: 26,
    speed: 52,
    dmg: 8,
    score: 25,
    r: 15,
    color: "#fb7185",
    spikes: 7,
    ranged: true,
  },
  bomber: {
    hp: 22,
    speed: 78,
    dmg: 0,
    score: 25,
    r: 15,
    color: "#f97316",
    spikes: 9,
    explodes: true,
  },
  splitter: {
    hp: 32,
    speed: 58,
    dmg: 11,
    score: 28,
    r: 18,
    color: "#22d3ee",
    spikes: 6,
    splitInto: "mini_splitter",
  },
  mini_splitter: {
    hp: 8,
    speed: 105,
    dmg: 5,
    score: 5,
    r: 9,
    color: "#67e8f9",
    spikes: 4,
  },
  shield: {
    hp: 50,
    speed: 52,
    dmg: 12,
    score: 40,
    r: 18,
    color: "#60a5fa",
    spikes: 10,
    shield: 35,
  },
  charger: {
    hp: 34,
    speed: 60,
    dmg: 15,
    score: 30,
    r: 16,
    color: "#fbbf24",
    spikes: 8,
    charges: true,
  },
  ghost: {
    hp: 24,
    speed: 72,
    dmg: 10,
    score: 30,
    r: 15,
    color: "#e0e7ff",
    spikes: 6,
    ghost: true,
  },
  armored: {
    hp: 70,
    speed: 44,
    dmg: 14,
    score: 45,
    r: 20,
    color: "#94a3b8",
    spikes: 12,
    armor: 0.35,
  },
  healer: {
    hp: 38,
    speed: 50,
    dmg: 6,
    score: 40,
    r: 16,
    color: "#4ade80",
    spikes: 8,
    heals: true,
  },
  vampire: {
    hp: 40,
    speed: 62,
    dmg: 13,
    score: 35,
    r: 16,
    color: "#dc2626",
    spikes: 8,
    lifesteal: true,
  },
  teleporter: {
    hp: 30,
    speed: 55,
    dmg: 12,
    score: 35,
    r: 15,
    color: "#c084fc",
    spikes: 7,
    teleports: true,
  },
  sniper: {
    hp: 28,
    speed: 44,
    dmg: 14,
    score: 35,
    r: 14,
    color: "#f87171",
    spikes: 5,
    ranged: true,
    longRange: true,
  },
  summoner: {
    hp: 50,
    speed: 46,
    dmg: 8,
    score: 50,
    r: 18,
    color: "#a78bfa",
    spikes: 9,
    summons: "thorn",
  },

  boss_king: {
    hp: 300,
    speed: 40,
    dmg: 22,
    score: 500,
    r: 52,
    color: "#e11d48",
    spikes: 14,
    boss: true,
    name: "Король Шипов",
  },
  boss_queen: {
    hp: 360,
    speed: 44,
    dmg: 24,
    score: 600,
    r: 54,
    color: "#db2777",
    spikes: 12,
    boss: true,
    name: "Королева Роз",
    ranged: true,
  },
  boss_shadow: {
    hp: 450,
    speed: 38,
    dmg: 28,
    score: 750,
    r: 58,
    color: "#4c1d95",
    spikes: 16,
    boss: true,
    name: "Лорд Тени",
  },
  boss_nightmare: {
    hp: 585,
    speed: 44,
    dmg: 32,
    score: 900,
    r: 60,
    color: "#7c3aed",
    spikes: 14,
    boss: true,
    name: "Кошмар",
  },
  boss_heart: {
    hp: 780,
    speed: 40,
    dmg: 36,
    score: 1200,
    r: 64,
    color: "#be185d",
    spikes: 16,
    boss: true,
    name: "Разбитое Сердце",
    ranged: true,
  },
  boss_splitter: {
    hp: 600,
    speed: 42,
    dmg: 22,
    score: 700,
    r: 52,
    color: "#22d3ee",
    spikes: 12,
    boss: true,
    name: "Мать-Древо",
    summons: "swift",
    splitInto: "mini_splitter",
    splitIntoCount: 3,
    splitIntoScale: 0.4,
  },
  boss_teleporter: {
    hp: 490,
    speed: 60,
    dmg: 24,
    score: 750,
    r: 48,
    color: "#c084fc",
    spikes: 10,
    boss: true,
    name: "Теневой Прыгун",
    teleports: true,
  },
  boss_bullethell: {
    hp: 675,
    speed: 34,
    dmg: 14,
    score: 800,
    r: 54,
    color: "#db2777",
    spikes: 16,
    boss: true,
    name: "Повелитель Хаоса",
    radial: true,
  },
  boss_shielded: {
    hp: 450,
    speed: 40,
    dmg: 22,
    score: 750,
    r: 52,
    color: "#60a5fa",
    spikes: 12,
    boss: true,
    name: "Несокрушимый",
    shield: 300,
    shieldRegen: 25,
  },
  boss_healer: {
    hp: 675,
    speed: 38,
    dmg: 20,
    score: 850,
    r: 54,
    color: "#4ade80",
    spikes: 12,
    boss: true,
    name: "Живой Трон",
    selfRegen: 12,
    heals: true,
  },
  boss_fast: {
    hp: 380,
    speed: 110,
    dmg: 26,
    score: 700,
    r: 42,
    color: "#fbbf24",
    spikes: 8,
    boss: true,
    name: "Вихрь",
  },
  boss_charger: {
    hp: 640,
    speed: 50,
    dmg: 28,
    score: 800,
    r: 50,
    color: "#f97316",
    spikes: 14,
    boss: true,
    name: "Сокрушитель",
    charges: true,
  },
  boss_summoner: {
    hp: 600,
    speed: 40,
    dmg: 18,
    score: 800,
    r: 52,
    color: "#a78bfa",
    spikes: 11,
    boss: true,
    name: "Повелитель Роя",
    summons: "swift",
  },
  boss_ghost: {
    hp: 560,
    speed: 55,
    dmg: 22,
    score: 800,
    r: 50,
    color: "#e0e7ff",
    spikes: 10,
    boss: true,
    name: "Призрак Трона",
    ghost: true,
    teleports: true,
  },
  boss_laser: {
    hp: 710,
    speed: 38,
    dmg: 28,
    score: 900,
    r: 52,
    color: "#dc2626",
    spikes: 14,
    boss: true,
    name: "Лазерный Глаз",
    ranged: true,
    longRange: true,
  },
};

function availableTypes(n) {
  const a = ["thorn"];
  if (n >= 2) a.push("swift");
  if (n >= 4) a.push("brute");
  if (n >= 6) a.push("shooter");
  if (n >= 8) a.push("bomber");
  if (n >= 12) a.push("splitter");
  if (n >= 16) a.push("shield");
  if (n >= 20) a.push("charger");
  if (n >= 24) a.push("ghost");
  if (n >= 28) a.push("armored");
  if (n >= 32) a.push("healer");
  if (n >= 38) a.push("vampire");
  if (n >= 44) a.push("teleporter");
  if (n >= 50) a.push("sniper");
  if (n >= 56) a.push("summoner");
  return a;
}

const BOSS_ORDER = [
  "boss_king",
  "boss_queen",
  "boss_shadow",
  "boss_nightmare",
  "boss_heart",
  "boss_splitter",
  "boss_teleporter",
  "boss_bullethell",
  "boss_shielded",
  "boss_healer",
  "boss_fast",
  "boss_charger",
  "boss_summoner",
  "boss_ghost",
  "boss_laser",
  "boss_king",
  "boss_queen",
  "boss_shadow",
  "boss_nightmare",
  "boss_heart",
];

function bossForWave(n) {
  const idx = Math.min(
    Math.max(0, Math.floor(n / 10) - 1),
    BOSS_ORDER.length - 1,
  );
  return BOSS_ORDER[idx];
}

/* ★ FIX: усиление повторных боссов на 160+ */
function bossHpBoost(n) {
  if (n <= 150) return 1;
  return 1 + (n - 150) * 0.08;
}

function buildWave(n) {
  const isBoss = n % 10 === 0;
  const count = isBoss
    ? Math.min(8 + Math.floor(n * 0.35), 30)
    : Math.min(7 + Math.floor(n * 0.75), 45);
  const types = availableTypes(n);
  const list = [];
  for (let i = 0; i < count; i++) list.push(pick(types));
  shuffle(list);
  if (isBoss) list.unshift(bossForWave(n));
  return list;
}

function spawnEnemy(type) {
  const base = ENEMY_TYPES[type];
  if (!base) return;
  const w = G.wave;
  /* ★ FIX: смягчённый dmgScale */
  const hpScale = 1 + (w - 1) * 0.22 + Math.pow(w / 10, 1.5);
  const dmgScale = 1 + (w - 1) * 0.03;
  const spScale = 1 + Math.min(w - 1, 60) * 0.006;
  const bossBoost = base.boss ? bossHpBoost(w) : 1;

  const pad = base.boss ? 90 : 42;
  const side = rndi(0, 3);
  let x, y;
  if (side === 0) {
    x = rnd(pad, W - pad);
    y = pad;
  } else if (side === 1) {
    x = W - pad;
    y = rnd(pad, H - pad);
  } else if (side === 2) {
    x = rnd(pad, W - pad);
    y = H - pad;
  } else {
    x = pad;
    y = rnd(pad, H - pad);
  }

  const hp = base.hp * hpScale * bossBoost;
  const e = {
    type,
    x,
    y,
    r: base.r,
    color: base.color,
    spikes: base.spikes,
    hp,
    maxHp: hp,
    shield: base.shield ? base.shield * hpScale * 0.5 * bossBoost : 0,
    maxShield: base.shield ? base.shield * hpScale * 0.5 * bossBoost : 0,
    shieldRegen: base.shieldRegen || 0,
    shieldRegenDelay: 0,
    selfRegen: base.selfRegen || 0,
    speed: base.speed * spScale,
    dmg: base.dmg * dmgScale,
    score: base.score,
    ranged: !!base.ranged,
    longRange: !!base.longRange,
    boss: !!base.boss,
    bossName: base.name || "",
    explodes: !!base.explodes,
    splitInto: base.splitInto || null,
    splitIntoCount: base.splitIntoCount || 2,
    splitIntoScale: base.splitIntoScale ?? 1,
    heals: !!base.heals,
    healsTick: 0,
    charges: !!base.charges,
    chargeCd: rnd(1.5, 3),
    chargeT: 0,
    ghost: !!base.ghost,
    teleports: !!base.teleports,
    teleCd: rnd(2, 4),
    armor: base.armor || 0,
    lifesteal: !!base.lifesteal,
    summons: base.summons || null,
    summonCd: rnd(3, 5),
    shootCd: rnd(1.2, 2.4),
    radial: !!base.radial,
    hitCd: 0,
    t: rnd(0, 10),
    flash: 0,
    slowT: 0,
    burnT: 0,
    burnDmg: 0,
  };
  G.enemies.push(e);

  if (base.boss) {
    G.boss = e;
    G.shake = Math.max(G.shake, 16);
    G.bossFlash = 0.45;
    beep(70, 0.8, "sawtooth", 0.09, 40);
    showCenterMsg("⚠ " + base.name.toUpperCase() + " ⚠", 2.2);
    updateBossBar();
  }
}

/* =========================================================
   ЧАСТИЦЫ / ТЕКСТ
   ========================================================= */
function addParticles(x, y, n, color, opts = {}) {
  if (G.parts.length > 400) n = Math.min(n, 3);
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU),
      s = rnd(opts.min || 40, opts.max || 190);
    G.parts.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      r: rnd(2, 5),
      life: rnd(0.3, 0.7),
      max: 0.7,
      color,
      heart: opts.heart || false,
      rot: rnd(0, TAU),
    });
  }
}
function addText(x, y, str, color, size = 18) {
  if (G.texts.length > 40) G.texts.shift();
  G.texts.push({ x, y, str, color, size, life: 0.8, max: 0.8 });
}
function showCenterMsg(str, dur = 1.6) {
  const el = document.getElementById("centerMsg");
  el.innerHTML = str;
  el.classList.add("show");
  G.msgTimer = dur;
}

function showWaveMessage(n) {
  if (n % 10 === 0) {
    const bossType = bossForWave(n);
    const bossName = ENEMY_TYPES[bossType]?.name || "БОСС";
    showCenterMsg(`Волна ${n} — ⚠ ${bossName.toUpperCase()} ⚠`, 2.2);
    G.shake = 14;
  } else {
    showCenterMsg("Волна " + n, 1.0);
  }
}

function resolveWaveMsg() {
  if (G.pendingWaveMsg == null) return;
  const n = G.pendingWaveMsg;
  G.pendingWaveMsg = null;
  showWaveMessage(n);
}

/* =========================================================
   МОНЕТЫ / РЕКОРД
   ========================================================= */
function saveRewardsToKitty(score) {
  const coins = Math.floor(score / 1000) * CONFIG.coinPer1000;
  if (coins <= 0) return 0;
  try {
    const raw = localStorage.getItem("catState");
    const state = raw ? JSON.parse(raw) : {};
    state.coins = (state.coins || 0) + coins;
    state.achievements = Array.isArray(state.achievements)
      ? state.achievements
      : [];
    if (
      G.wave >= CONFIG.unlockWaveAch &&
      !state.achievements.includes("thorn_king")
    )
      state.achievements.push("thorn_king");
    if (
      score >= CONFIG.unlockScoreAch &&
      !state.achievements.includes("thorn_legend")
    )
      state.achievements.push("thorn_legend");
    localStorage.setItem("catState", JSON.stringify(state));
  } catch (e) {
    console.error("saveRewards error", e);
    return 0;
  }
  return coins;
}
function saveBestScore(score) {
  if (score > G.bestScore) {
    G.bestScore = score;
    try {
      localStorage.setItem("thornBestScore", String(score));
    } catch (e) {}
    return true;
  }
  return false;
}

function clearUpgradeTimers() {
  if (_autoUpgradeTimeout) {
    clearTimeout(_autoUpgradeTimeout);
    _autoUpgradeTimeout = null;
  }
  if (_upgradeTickId) {
    clearInterval(_upgradeTickId);
    _upgradeTickId = null;
  }
}

/* =========================================================
   СТАРТ ИГРЫ
   ========================================================= */
function startGame() {
  clearUpgradeTimers();
  G.state = "playing";
  G.t = 0;
  G.wave = 0;
  G.kills = 0;
  G.score = 0;
  G.enemies = [];
  G.bullets = [];
  G.ebullets = [];
  G.parts = [];
  G.texts = [];
  G.upgradesTaken = {};
  G.pendingLevels = 0;
  G.shake = 0;
  G.msgTimer = 0;
  G.spawnQueue = [];
  G.spawnTimer = 0;
  G.breather = 1.6;
  G.waveActive = false;
  G.boss = null;
  G.bossFlash = 0;
  G.waveStuckTimer = 0;
  G.pendingChest = false;
  G.pendingWaveMsg = null;
  G.tomesTaken = {};
  G.player = makePlayer();
  _hudCache.hp = "";
  _hudCache.shield = "";
  _hudCache.level = -1;
  _hudCache.wave = "";
  _hudCache.score = "";
  _hudCache.kills = "";
  _hudCache.bossHint = "";
  hideOverlay();
  document.getElementById("hud").classList.add("show");
  document.getElementById("bossBar").classList.remove("show");
  updateHUD(true);
}

const overlay = document.getElementById("overlay");
function showOverlay(node) {
  overlay.innerHTML = "";
  overlay.appendChild(node);
  overlay.classList.add("show");
}
function hideOverlay() {
  overlay.classList.remove("show");
  overlay.innerHTML = "";
}

function showMenu() {
  G.state = "menu";
  document.getElementById("hud").classList.remove("show");
  document.getElementById("bossBar").classList.remove("show");
  const p = document.createElement("div");
  p.className = "panel";
  p.innerHTML = `
    <div class="hearts-big">💗🐾💗</div>
    <h1>ТЕРНОВЫЙ ТРОН</h1>
    <p class="sub">
      Котик против колючих тварей.<br>
      Двигайся — <b>сердечки сами летят во врага</b>.<br>
      <b>200 волн</b> = <b>200 уровней</b>. Выбор из <b>4 карт</b>.
    </p>
    <p class="sub" style="color:#ffd166;">
      🪙 <b>За каждые 1000 очков — 100 монет</b> для Домика Котика
    </p>
    ${G.bestScore > 0 ? `<p class="tiny">🏆 Твой рекорд: <b style="color:#ffb3dd;">${G.bestScore.toLocaleString("ru-RU")}</b> очков</p>` : ""}
    <button class="btn" id="startBtn">Играть 💗</button>
    <a class="btn ghost" href="index.html">← На главную</a>
    <p class="tiny">
      <b>WASD</b> / <b>стрелки</b> / палец по экрану — движение<br>
      <b>Escape</b> — пауза · <b>Tab</b> — инвентарь<br>
      Выбор апгрейда — клик, клавиши <b>1 2 3 4</b> или <b>Space</b>
    </p>
  `;
  showOverlay(p);
  p.querySelector("#startBtn").onclick = () => startGame();
}

/* =========================================================
   ЭКРАН АПГРЕЙДА
   ========================================================= */
function openUpgrade() {
  G.state = "upgrade";
  currentChoices = pickUpgrades(CONFIG.upgradeChoices);
  const p = document.createElement("div");
  p.className = "panel";
  const isBossWave = G.wave > 0 && G.wave % 10 === 0;
  const bossType = isBossWave ? bossForWave(G.wave) : null;
  const bossName = bossType ? ENEMY_TYPES[bossType]?.name : null;
  p.innerHTML = `<h2>✨ Уровень ${G.player.level} ✨</h2>
    <p class="sub">Новая сила для ${CONFIG.playerName}</p>
    ${isBossWave ? `<p class="sub" style="color:#ff6b8a;">⚠ Впереди: <b>${bossName}</b> ⚠</p>` : ""}`;
  const row = document.createElement("div");
  row.className = "cards";
  currentChoices.forEach((u, i) => {
    const c = document.createElement("button");
    let cls = "card";
    if (u.synergy) cls += " synergy";
    else if (u.tree === "special") cls += " special";
    c.className = cls;
    const lvl = (G.upgradesTaken[u.id] || 0) + 1;
    let label = "УР. " + lvl;
    if (u.id.startsWith("heal")) label = "ЛЕЧЕНИЕ";
    else if (u.synergy) label = "СИНЕРГИЯ";
    else if (u.infinite) label = "∞ " + lvl;
    c.innerHTML = `
      <div class="ic">${u.icon}</div>
      <div class="cn">${u.name}</div>
      <div class="cd">${u.desc}</div>
      <div class="cl">${label}</div>
      <div class="cl" style="background:transparent;color:#b98fd6;">клавиша ${i + 1}</div>
    `;
    c.onclick = () => takeUpgrade(u);
    row.appendChild(c);
  });
  p.appendChild(row);

  const hint = document.createElement("p");
  hint.className = "auto-hint";
  hint.id = "upgradeTimerHint";
  hint.innerHTML = `Space = лучшая карта · авто-выбор через <b>${CONFIG.upgradeAutoSec}</b>с`;
  p.appendChild(hint);

  showOverlay(p);
  beep(660, 0.12, "sine", 0.06, 990);
  setTimeout(() => beep(990, 0.16, "sine", 0.05, 1320), 90);

  clearUpgradeTimers();
  _upgradeDeadline = Date.now() + CONFIG.upgradeAutoSec * 1000;
  _autoUpgradeTimeout = setTimeout(() => {
    _autoUpgradeTimeout = null;
    if (G.state === "upgrade") {
      const best = pickBestAuto(currentChoices);
      if (best) takeUpgrade(best);
    }
  }, CONFIG.upgradeAutoSec * 1000);
  _upgradeTickId = setInterval(() => {
    const el = document.getElementById("upgradeTimerHint");
    if (!el) {
      clearInterval(_upgradeTickId);
      _upgradeTickId = null;
      return;
    }
    const left = Math.max(0, Math.ceil((_upgradeDeadline - Date.now()) / 1000));
    el.innerHTML = `Space = лучшая карта · авто-выбор через <b>${left}</b>с`;
  }, 250);
}

function takeUpgrade(u) {
  clearUpgradeTimers();
  u.apply(G.player);
  G.upgradesTaken[u.id] = (G.upgradesTaken[u.id] || 0) + 1;
  G.pendingLevels--;
  beep(880, 0.1, "triangle", 0.055, 1180);
  hideOverlay();
  if (G.pendingLevels > 0) {
    requestAnimationFrame(openUpgrade);
  } else {
    G.state = "playing";
    resolveWaveMsg();
    updateHUD(true);
  }
}

/* =========================================================
   СУНДУК С БОССА
   ========================================================= */
function openChest() {
  G.state = "chest";
  const available = TOMES.filter((t) => !G.tomesTaken[t.id]);
  const pool = available.slice();
  const choices = [];
  while (choices.length < 3 && pool.length) {
    choices.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  if (!choices.length) {
    G.pendingChest = false;
    if (G.pendingLevels > 0) openUpgrade();
    else {
      G.state = "playing";
      resolveWaveMsg();
    }
    return;
  }
  const p = document.createElement("div");
  p.className = "panel";
  p.innerHTML = `<div style="font-size:52px;filter:drop-shadow(0 0 20px rgba(255,200,80,.8))">🎁</div>
    <h2>Сундук Босса</h2>
    <p class="sub">Выбери один Том — сила с ценой.</p>`;
  const row = document.createElement("div");
  row.className = "cards";
  choices.forEach((t) => {
    const c = document.createElement("button");
    c.className = "card tome";
    c.innerHTML = `<div class="ic">${t.icon}</div><div class="cn">${t.name}</div><div class="cd">${t.desc}</div><div class="cl">ТОМ</div>`;
    c.onclick = () => takeTome(t);
    row.appendChild(c);
  });
  p.appendChild(row);
  showOverlay(p);
  beep(880, 0.15, "sine", 0.06, 1100);
  setTimeout(() => beep(1320, 0.2, "sine", 0.05, 1600), 100);
}

function takeTome(t) {
  t.apply(G.player);
  G.tomesTaken[t.id] = (G.tomesTaken[t.id] || 0) + 1;
  G.pendingChest = false;
  hideOverlay();
  beep(990, 0.12, "triangle", 0.06, 1400);
  if (G.pendingLevels > 0) openUpgrade();
  else {
    G.state = "playing";
    resolveWaveMsg();
    updateHUD(true);
  }
}

/* =========================================================
   ИНВЕНТАРЬ (Tab)
   ========================================================= */
function showInventory() {
  _inventoryPrevState = G.state;
  G.state = "inventory";
  const p = G.player;
  const treeNames = {
    dmg: "Урон",
    rate: "Скорострельность",
    multi: "Снаряды",
    pierce: "Пробитие",
    crit: "Криты",
    elem: "Стихии",
    hp: "Здоровье",
    def: "Броня",
    dodge: "Уклонение",
    shield: "Щит",
    regen: "Регенерация",
    steal: "Вампиризм",
    killheal: "Лечение за килл",
    aura: "Аура",
    speed: "Скорость",
    util: "Утилита",
    special: "Особые",
    infinite: "Бесконечные",
  };
  const groups = {};
  for (const id in G.upgradesTaken) {
    const u = UPGRADES.find((x) => x.id === id);
    if (!u) continue;
    const tree = u.tree || (u.infinite ? "infinite" : "other");
    if (!groups[tree]) groups[tree] = [];
    groups[tree].push({ u, count: G.upgradesTaken[id] });
  }
  const tomes = Object.keys(G.tomesTaken)
    .map((id) => TOMES.find((t) => t.id === id))
    .filter(Boolean);

  let html = `
    <h2>📋 Инвентарь</h2>
    <div class="inventory-stats">
      <div class="stat-row"><span class="stat-label">HP</span><span class="stat-value">${Math.ceil(p.hp)} / ${Math.round(p.maxHp)}</span></div>
      ${p.maxShield > 0 ? `<div class="stat-row"><span class="stat-label">Щит</span><span class="stat-value">${Math.ceil(p.shield)} / ${Math.round(p.maxShield)}</span></div>` : ""}
      <div class="stat-row"><span class="stat-label">Урон</span><span class="stat-value">${p.dmg.toFixed(1)}</span></div>
      <div class="stat-row"><span class="stat-label">Скорострельность</span><span class="stat-value">${p.fireRate.toFixed(2)}/сек</span></div>
      <div class="stat-row"><span class="stat-label">Снаряды</span><span class="stat-value">${p.multishot}</span></div>
      <div class="stat-row"><span class="stat-label">Пробитие</span><span class="stat-value">${p.pierce}</span></div>
      <div class="stat-row"><span class="stat-label">Крит</span><span class="stat-value">${(p.crit * 100).toFixed(0)}% × ${p.critMult.toFixed(1)}</span></div>
      <div class="stat-row"><span class="stat-label">Скорость</span><span class="stat-value">${Math.round(p.speed)}</span></div>
      <div class="stat-row"><span class="stat-label">Броня</span><span class="stat-value">${(p.armor * 100).toFixed(0)}%</span></div>
      <div class="stat-row"><span class="stat-label">Уклонение</span><span class="stat-value">${(p.dodge * 100).toFixed(0)}%</span></div>
      <div class="stat-row"><span class="stat-label">Вампиризм</span><span class="stat-value">${(p.lifesteal * 100).toFixed(1)}%</span></div>
      <div class="stat-row"><span class="stat-label">Реген</span><span class="stat-value">${p.regen.toFixed(1)}/сек</span></div>
      ${p.auraR > 0 ? `<div class="stat-row"><span class="stat-label">Аура</span><span class="stat-value">r=${Math.round(p.auraR)}, dmg=${Math.round(p.thorns)}</span></div>` : ""}
    </div>
    <h3 style="color:#ffd166;margin-top:8px;">Апгрейды</h3>
    <div class="upgrade-list">`;

  for (const tree in groups) {
    const items = groups[tree];
    if (!items.length) continue;
    html += `<div class="tree-title">${treeNames[tree] || tree}</div>`;
    for (const { u, count } of items) {
      html += `<div class="upgrade-item"><span>${u.icon} ${u.name}</span><span class="count">×${count}</span></div>`;
    }
  }
  if (tomes.length) {
    html += `<div class="tree-title" style="color:#ff6666;">Томы</div>`;
    for (const t of tomes) {
      html += `<div class="upgrade-item tome"><span>${t.icon} ${t.name}</span></div>`;
    }
  }
  html += `</div><button class="btn" id="closeInvBtn" style="margin-top:16px;">Закрыть</button>`;

  const panel = document.createElement("div");
  panel.className = "panel";
  const scroll = document.createElement("div");
  scroll.className = "inv-scroll";
  scroll.innerHTML = html;
  panel.appendChild(scroll);
  showOverlay(panel);
  panel.querySelector("#closeInvBtn").onclick = hideInventory;
}
function hideInventory() {
  G.state = _inventoryPrevState || "playing";
  hideOverlay();
}

/* =========================================================
   ПАУЗА / КОНЕЦ
   ========================================================= */
function showPause() {
  G.state = "paused";
  const p = document.createElement("div");
  p.className = "panel";
  p.innerHTML = `<div style="font-size:52px;filter:drop-shadow(0 0 20px rgba(255,110,190,.6))">⏸</div>
    <h1>ПАУЗА</h1>
    <p class="sub">Волна ${G.wave} · уровень ${G.player.level} · ${G.kills} побед</p>
    <button class="btn" id="resumeBtn">Продолжить ▶</button>
    <p class="tiny">Escape — тоже возобновить · Tab — инвентарь</p>`;
  showOverlay(p);
  p.querySelector("#resumeBtn").onclick = resumeGame;
}
function resumeGame() {
  G.state = "playing";
  hideOverlay();
}

function endScreen(isWin) {
  clearUpgradeTimers();
  G.state = isWin ? "win" : "over";
  document.getElementById("hud").classList.remove("show");
  document.getElementById("bossBar").classList.remove("show");
  const coinsEarned = saveRewardsToKitty(G.score);
  const isNewRecord = saveBestScore(G.score);
  const p = document.createElement("div");
  p.className = "panel";
  const bigIcon = isWin ? "👑" : "😿";
  const title = isWin ? "ТРОН ПАЛ!" : "Котик устал…";
  const subtitle = isWin
    ? CONFIG.finalMessage
    : "Но ты всегда можешь попробовать снова — котики не сдаются 💪";
  p.innerHTML = `
    <div style="font-size:52px;filter:drop-shadow(0 0 20px rgba(255,110,190,.6))">${bigIcon}</div>
    <h1>${title}</h1>
    ${isWin ? `<p class="love">${subtitle}</p>` : `<p class="sub">${subtitle}</p>`}
    <div class="stats">
      <div class="stat-box"><b>${G.wave}</b><i>ВОЛНА</i></div>
      <div class="stat-box"><b>${G.kills}</b><i>ПОБЕЖДЕНО</i></div>
      <div class="stat-box"><b>${G.player.level}</b><i>УРОВЕНЬ</i></div>
    </div>
    <div class="coin-box">
      <div class="big">🪙</div>
      <div style="display:flex;flex-direction:column;align-items:flex-start;">
        <div class="amt">+${coinsEarned}</div>
        <div class="lbl">МОНЕТОК КОТИКУ</div>
      </div>
    </div>
    <p class="tiny">Очки: <b style="color:#ffb3dd;">${G.score.toLocaleString("ru-RU")}</b>
      ${isNewRecord ? " · 🏆 <b>НОВЫЙ РЕКОРД!</b>" : ` · рекорд: ${G.bestScore.toLocaleString("ru-RU")}`}
    </p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
      <button class="btn" id="againBtn">Ещё раз 🐾</button>
      <a class="btn gold" href="index.html">🏠 К котику</a>
    </div>
  `;
  showOverlay(p);
  p.querySelector("#againBtn").onclick = () => startGame();
  if (isWin) {
    [0, 150, 300, 480].forEach((d, i) =>
      setTimeout(() => beep(660 + i * 220, 0.25, "sine", 0.06), d),
    );
  } else {
    beep(300, 0.5, "sawtooth", 0.08, 90);
  }
}

/* =========================================================
   ВВОД
   ========================================================= */
const keys = {};
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;

  if (k === "escape") {
    if (G.state === "playing") {
      e.preventDefault();
      showPause();
    } else if (G.state === "paused") {
      e.preventDefault();
      resumeGame();
    } else if (G.state === "inventory") {
      e.preventDefault();
      hideInventory();
    }
    return;
  }

  if (k === "tab" && G.state === "playing") {
    e.preventDefault();
    showInventory();
    return;
  }

  if (G.state === "upgrade") {
    if (k === " " || k === "spacebar") {
      e.preventDefault();
      const best = pickBestAuto(currentChoices);
      if (best) takeUpgrade(best);
      return;
    }
    if (["1", "2", "3", "4"].includes(k)) {
      const u = currentChoices[parseInt(k) - 1];
      if (u) takeUpgrade(u);
      return;
    }
  }
  if (k === " " && G.state === "menu") {
    e.preventDefault();
    startGame();
  }
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k))
    e.preventDefault();
});
window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

let touchId = null,
  tOrigin = { x: 0, y: 0 },
  tVec = { x: 0, y: 0 };
canvas.addEventListener(
  "touchstart",
  (e) => {
    if (G.state !== "playing") return;
    const t = e.changedTouches[0];
    touchId = t.identifier;
    tOrigin = { x: t.clientX, y: t.clientY };
    tVec = { x: 0, y: 0 };
    e.preventDefault();
  },
  { passive: false },
);
canvas.addEventListener(
  "touchmove",
  (e) => {
    if (touchId === null) return;
    for (const t of e.changedTouches) {
      if (t.identifier !== touchId) continue;
      const dx = t.clientX - tOrigin.x,
        dy = t.clientY - tOrigin.y;
      const len = Math.hypot(dx, dy);
      if (len > 14) {
        const m = Math.min(len, 70) / 70;
        tVec = { x: (dx / len) * m, y: (dy / len) * m };
      } else tVec = { x: 0, y: 0 };
    }
    e.preventDefault();
  },
  { passive: false },
);
canvas.addEventListener(
  "touchend",
  (e) => {
    for (const t of e.changedTouches)
      if (t.identifier === touchId) {
        touchId = null;
        tVec = { x: 0, y: 0 };
      }
  },
  { passive: false },
);

/* =========================================================
   UPDATE
   ========================================================= */
function update(dt) {
  G.t += dt;
  const p = G.player;
  p.t += dt;

  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 40);
  if (G.bossFlash > 0) G.bossFlash = Math.max(0, G.bossFlash - dt);
  if (G.msgTimer > 0) {
    G.msgTimer -= dt;
    if (G.msgTimer <= 0)
      document.getElementById("centerMsg").classList.remove("show");
  }

  let mx = 0,
    my = 0;
  if (keys["w"] || keys["arrowup"] || keys["ц"]) my--;
  if (keys["s"] || keys["arrowdown"] || keys["ы"]) my++;
  if (keys["a"] || keys["arrowleft"] || keys["ф"]) mx--;
  if (keys["d"] || keys["arrowright"] || keys["в"]) mx++;
  if (mx || my) {
    const l = Math.hypot(mx, my);
    mx /= l;
    my /= l;
  }
  if (tVec.x || tVec.y) {
    mx = tVec.x;
    my = tVec.y;
  }
  if (p.stillness) {
    mx = 0;
    my = 0;
  }

  p.moving = mx || my ? 1 : 0;
  p.x = clamp(p.x + mx * p.speed * dt, p.r, W - p.r);
  p.y = clamp(p.y + my * p.speed * dt, p.r, H - p.r);
  if (mx !== 0) p.blink = mx > 0 ? 1 : -1;

  if (p.iframe > 0) p.iframe -= dt;
  if (p.hurtFlash > 0) p.hurtFlash -= dt;

  if (p.regen > 0) {
    const lowHP = p.hp < p.maxHp * 0.4;
    const mult = lowHP && p.endurance > 0 ? 1 + 0.5 * p.endurance : 1;
    p.hp = Math.min(p.maxHp, p.hp + p.regen * mult * dt);
  }
  if (p.maxShield > 0) {
    if (p.shieldRegenDelay > 0) p.shieldRegenDelay -= dt;
    else if (p.shield < p.maxShield)
      p.shield = Math.min(p.maxShield, p.shield + p.shieldRegen * dt);
  }
  if (p.tide > 0) {
    p.tideCd -= dt;
    if (p.tideCd <= 0) {
      p.tideCd = Math.max(6, 14 - p.tide * 2);
      p.iframe = Math.max(p.iframe, 1);
      addParticles(p.x, p.y, 12, "#a5f3fc", { min: 80, max: 200 });
      beep(880, 0.12, "sine", 0.035, 1100);
    }
  }
  if (p.auraR > 0) {
    p.auraPulse += dt * 2.4;
    p.auraTick -= dt;
    if (p.auraTick <= 0) {
      p.auraTick = 0.5;
      const R2 = p.auraR * p.auraR;
      for (const e of [...G.enemies]) {
        if (e.hp <= 0) continue;
        if (dist2(e.x, e.y, p.x, p.y) < R2 + e.r * e.r)
          damageEnemy(e, p.thorns, false, "aura");
      }
    }
  }

  p.cool -= dt;
  if (p.cool <= 0) {
    const tgt = nearestEnemy(p.x, p.y, 1100);
    if (tgt) {
      shoot(p, tgt);
      p.cool = 1 / p.fireRate;
    }
  }

  if (G.breather > 0) {
    G.breather -= dt;
    if (G.breather <= 0 && !G.waveActive) startWave(G.wave + 1);
  } else if (G.waveActive) {
    if (G.spawnQueue.length) {
      G.spawnTimer -= dt;
      if (G.spawnTimer <= 0) {
        if (G.enemies.length < 60) spawnEnemy(G.spawnQueue.shift());
        else G.spawnQueue.shift();
        G.spawnTimer = Math.max(0.1, 0.5 - G.wave * 0.005);
      }
    } else if (G.enemies.length === 0) {
      G.waveActive = false;
      G.waveStuckTimer = 0;
      if (G.wave >= CONFIG.maxWave) {
        endScreen(true);
        return;
      }
      G.breather = 2.2;
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.12);
      if (G.wave % 5 === 0) {
        p.maxHp += 5;
        p.hp = Math.min(p.maxHp, p.hp + 5);
      }
      showCenterMsg(`Волна ${G.wave} пройдена! 💗`, 1.5);
      beep(520, 0.18, "sine", 0.06, 780);
    } else {
      G.waveStuckTimer += dt;
      if (G.waveStuckTimer > 20) {
        for (let i = G.enemies.length - 1; i >= 0; i--)
          damageEnemy(G.enemies[i], 999999, false, "stuck");
        G.waveStuckTimer = 0;
      }
    }
  }

  updateEnemies(dt);
  updateBullets(dt);
  updateEBullets(dt);
  updateParticles(dt);
  updateTexts(dt);
  updateBossBar();

  if (p.hp <= 0) endScreen(false);
}

function startWave(n) {
  G.wave = n;
  G.waveActive = true;
  G.spawnQueue = buildWave(n);
  G.spawnTimer = 0.35;
  G.waveStuckTimer = 0;
  if (G.player.level < n) {
    const gained = n - G.player.level;
    G.player.level = n;
    G.pendingLevels += gained;
  }
  updateHUD(true);
  G.pendingWaveMsg = n;

  if (G.pendingChest) {
    openChest();
    return;
  }
  if (G.pendingLevels > 0) {
    openUpgrade();
    return;
  }
  resolveWaveMsg();
}

function nearestEnemy(x, y, maxD) {
  let best = null,
    bd = maxD * maxD;
  for (const e of G.enemies) {
    if (e.ghost) continue;
    const d = dist2(e.x, e.y, x, y);
    if (d < bd) {
      bd = d;
      best = e;
    }
  }
  if (!best)
    for (const e of G.enemies) {
      const d = dist2(e.x, e.y, x, y);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
  return best;
}

function shoot(p, target) {
  const base = Math.atan2(target.y - p.y, target.x - p.x);
  const n = p.multishot,
    spread = 0.13 * Math.max(0, n - 1);
  let mult = 1;
  if (p.berserk > 0 && p.hp < p.maxHp * 0.4) mult += 0.2 * p.berserk;
  if (p.swordsman > 0 && !p.moving) mult += 0.1 * p.swordsman;
  /* ★ FIX: Math.max(0, ...) защита от отрицательного урона */
  if (p.windBonus > 0) mult += p.windBonus * Math.max(0, p.speed / 228 - 1);
  const dmg = p.dmg * mult;

  p.shotsFired++;
  if (p.electro && p.shotsFired % 8 === 0) {
    const t = nearestEnemy(p.x, p.y, 600);
    if (t) {
      addParticles(t.x, t.y, 10, "#fbbf24", { min: 100, max: 300 });
      damageEnemy(t, p.dmg * 2, false, "lightning");
      beep(1200, 0.1, "sawtooth", 0.04, 1800);
    }
  }

  for (let i = 0; i < n; i++) {
    const a =
      base +
      (n > 1 ? -spread + 2 * spread * (i / (n - 1)) : 0) +
      rnd(-0.03, 0.03);
    G.bullets.push({
      x: p.x + Math.cos(a) * 14,
      y: p.y + Math.sin(a) * 14,
      vx: Math.cos(a) * p.bulletSpeed,
      vy: Math.sin(a) * p.bulletSpeed,
      r: p.projSize,
      dmg,
      pierce: p.pierce,
      homing: p.homing,
      life: 2.6,
      ang: a,
      hit: [],
      explosive: p.explosive,
      freeze: p.freezeChance,
      ricochet: p.ricochet,
      ox: p.x,
      oy: p.y,
    });
  }
  addParticles(
    p.x + Math.cos(base) * 18,
    p.y + Math.sin(base) * 18,
    3,
    "#ff9ecb",
    { min: 30, max: 90 },
  );
  beep(720 + Math.random() * 90, 0.045, "square", 0.022, 480);
}

function updateEnemies(dt) {
  const p = G.player,
    arr = G.enemies;
  for (let i = arr.length - 1; i >= 0; i--) {
    const e = arr[i];
    e.t += dt;
    if (e.flash > 0) e.flash -= dt;
    if (e.hitCd > 0) e.hitCd -= dt;
    if (e.slowT > 0) e.slowT -= dt;
    if (e.shieldRegenDelay > 0) e.shieldRegenDelay -= dt;

    if (e.burnT > 0) {
      e.burnT -= dt;
      e.hp -= ((e.burnDmg || 0) * dt) / 3;
      if (e.hp <= 0) {
        killEnemy(e, "burn");
        continue;
      }
      if (e.burnT <= 0) e.burnDmg = 0;
      if (Math.random() < dt * 8)
        addParticles(e.x, e.y, 1, "#f97316", { min: 20, max: 60 });
    }
    if (e.selfRegen > 0 && e.hp > 0 && e.hp < e.maxHp)
      e.hp = Math.min(e.maxHp, e.hp + e.selfRegen * dt);
    if (
      e.shieldRegen > 0 &&
      e.maxShield > 0 &&
      e.shield < e.maxShield &&
      e.shieldRegenDelay <= 0
    )
      e.shield = Math.min(e.maxShield, e.shield + e.shieldRegen * dt);

    const dx = p.x - e.x,
      dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d,
      uy = dy / d;
    let sp = e.speed;
    if (e.slowT > 0) sp *= 0.45;

    if (e.ranged) {
      const range = e.longRange ? 420 : 260;
      if (d < range * 0.75) sp = -sp * 0.7;
      else if (d < range) sp = 0;
      e.shootCd -= dt;
      if (e.shootCd <= 0 && d < 640) {
        enemyShoot(e, ux, uy);
        e.shootCd = e.boss
          ? rnd(1.2, 2)
          : e.longRange
            ? rnd(1.4, 2.4)
            : rnd(1.7, 2.8);
      }
    }
    if (e.radial) {
      e.shootCd -= dt;
      if (e.shootCd <= 0) {
        const N = 14,
          rot = e.t * 0.5;
        for (let k = 0; k < N; k++) {
          const a = (k / N) * TAU + rot;
          G.ebullets.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(a) * 200,
            vy: Math.sin(a) * 200,
            r: 8,
            dmg: e.dmg * 0.4,
            life: 4.5,
            t: 0,
          });
        }
        e.shootCd = 2.4;
        beep(120, 0.2, "triangle", 0.06, 60);
      }
    }
    if (e.charges) {
      e.chargeCd -= dt;
      if (e.chargeT > 0) {
        e.chargeT -= dt;
        sp = e.speed * 3.2;
      } else if (e.chargeCd <= 0 && d < 380) {
        e.chargeT = 0.85;
        e.chargeCd = rnd(2.5, 4);
        beep(240, 0.12, "sawtooth", 0.03, 480);
      }
    }
    if (e.teleports) {
      e.teleCd -= dt;
      if (e.teleCd <= 0 && d > 90) {
        e.teleCd = rnd(3, 5);
        const ang = rnd(0, TAU),
          rd = rnd(80, 180);
        addParticles(e.x, e.y, 8, "#c084fc", { min: 60, max: 180 });
        e.x = clamp(p.x + Math.cos(ang) * rd, 30, W - 30);
        e.y = clamp(p.y + Math.sin(ang) * rd, 30, H - 30);
        addParticles(e.x, e.y, 8, "#c084fc", { min: 60, max: 180 });
      }
    }
    if (e.heals) {
      e.healsTick -= dt;
      if (e.healsTick <= 0) {
        e.healsTick = 1.6;
        let healed = false;
        for (const o of G.enemies) {
          if (o === e || o.hp >= o.maxHp) continue;
          if (dist2(o.x, o.y, e.x, e.y) < 200 * 200) {
            o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.06);
            addParticles(o.x, o.y, 2, "#86efac", { min: 20, max: 60 });
            healed = true;
          }
        }
        if (healed) beep(600, 0.08, "sine", 0.02, 800);
      }
    }
    if (e.summons) {
      e.summonCd -= dt;
      if (e.summonCd <= 0 && G.enemies.length < 60) {
        e.summonCd = rnd(4, 7);
        const old = G.wave;
        G.wave = Math.max(1, G.wave - 10);
        spawnEnemy(e.summons);
        G.wave = old;
        addParticles(e.x, e.y, 10, "#a78bfa", { min: 60, max: 160 });
      }
    }

    e.x += ux * sp * dt;
    e.y += uy * sp * dt;
    for (let j = i - 1; j >= 0; j--) {
      const o = arr[j];
      const ddx = o.x - e.x,
        ddy = o.y - e.y;
      const rr = e.r + o.r;
      const dd = Math.hypot(ddx, ddy) || 1;
      if (dd < rr) {
        const push = (rr - dd) * 0.5;
        const px = (ddx / dd) * push,
          py = (ddy / dd) * push;
        e.x -= px;
        e.y -= py;
        o.x += px;
        o.y += py;
      }
    }
    e.x = clamp(e.x, e.r, W - e.r);
    e.y = clamp(e.y, e.r, H - e.r);
    if (d < e.r + p.r && e.hitCd <= 0) {
      hurtPlayer(e.dmg);
      if (e.lifesteal) e.hp = Math.min(e.maxHp, e.hp + e.dmg * 0.5);
      e.hitCd = 0.7;
    }
  }
}

function enemyShoot(e, ux, uy) {
  const speed = e.longRange ? 320 : 210;
  const n = e.boss ? 5 : 1;
  const base = Math.atan2(uy, ux);
  for (let i = 0; i < n; i++) {
    const a = base + (n > 1 ? (i - (n - 1) / 2) * 0.28 : 0);
    G.ebullets.push({
      x: e.x,
      y: e.y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      r: e.boss ? 10 : 7,
      dmg: e.dmg * 0.8,
      life: 3.4,
      t: 0,
    });
  }
  beep(180, 0.09, "square", 0.03, 120);
}

function damageEnemy(e, dmg, isCrit, source = "player") {
  if (!e || e.hp <= 0) return;
  let final = dmg;
  if (e.armor) final *= 1 - e.armor;
  if (e.ghost) final *= 0.7;
  if (e.shield > 0) {
    const absorbed = Math.min(e.shield, final);
    e.shield -= absorbed;
    final -= absorbed;
    if (e.shield < 0) e.shield = 0;
    if (e.shieldRegen > 0) e.shieldRegenDelay = 3;
  }
  e.hp -= final;
  e.flash = 0.1;
  if (isCrit) addText(e.x, e.y - e.r - 6, Math.round(final), "#ffe066", 20);
  addParticles(e.x, e.y, 2, e.color, { min: 40, max: 120, heart: true });
  if (e.hp <= 0) killEnemy(e, source);
}

function killEnemy(e, source = "player") {
  const i = G.enemies.indexOf(e);
  if (i < 0) return;
  G.enemies.splice(i, 1);
  G.kills++;
  G.score += e.score;
  if (G.player && G.player.killHeal > 0)
    G.player.hp = Math.min(G.player.maxHp, G.player.hp + G.player.killHeal);
  if (G.boss === e) {
    G.boss = null;
    if (G.wave % 10 === 0 && G.wave < CONFIG.maxWave) G.pendingChest = true;
  }

  addParticles(e.x, e.y, e.boss ? 40 : 10, e.color, {
    min: 60,
    max: e.boss ? 340 : 200,
    heart: true,
  });
  addParticles(e.x, e.y, e.boss ? 24 : 6, "#ff8fc4", {
    min: 50,
    max: 260,
    heart: true,
  });

  if (e.explodes) {
    G.shake = Math.max(G.shake, 8);
    const R = 90,
      p = G.player;
    if (source !== "aura" && source !== "stuck" && source !== "burn" && p) {
      if (dist2(p.x, p.y, e.x, e.y) < R * R) hurtPlayer(e.dmg * 1.4 + 8);
    }
    addParticles(e.x, e.y, 22, "#fb923c", { min: 100, max: 320 });
    beep(120, 0.25, "sawtooth", 0.06, 60);
  }

  if (e.splitInto && G.enemies.length < 60) {
    const count = e.splitIntoCount || 2;
    const scale = e.splitIntoScale ?? 1;
    const base = ENEMY_TYPES[e.splitInto];
    if (base) {
      const hpScale =
        (1 + (G.wave - 1) * 0.22 + Math.pow(G.wave / 10, 1.5)) * scale;
      for (let k = 0; k < count; k++) {
        if (G.enemies.length >= 60) break;
        const a = (k / count) * TAU + rnd(0, 0.5);
        const x = clamp(e.x + Math.cos(a) * 40, 20, W - 20);
        const y = clamp(e.y + Math.sin(a) * 40, 20, H - 20);
        const hp = base.hp * hpScale;
        G.enemies.push({
          type: e.splitInto,
          x,
          y,
          r: base.r,
          color: base.color,
          spikes: base.spikes,
          hp,
          maxHp: hp,
          shield: 0,
          maxShield: 0,
          shieldRegen: 0,
          shieldRegenDelay: 0,
          selfRegen: 0,
          speed: base.speed,
          dmg: base.dmg,
          score: base.score,
          ranged: false,
          longRange: false,
          boss: false,
          bossName: "",
          explodes: false,
          splitInto: null,
          splitIntoCount: 2,
          splitIntoScale: 1,
          heals: false,
          healsTick: 0,
          charges: false,
          chargeCd: 0,
          chargeT: 0,
          ghost: false,
          teleports: false,
          teleCd: 0,
          armor: 0,
          lifesteal: false,
          summons: null,
          summonCd: 0,
          shootCd: 0,
          radial: false,
          hitCd: 0,
          t: rnd(0, 10),
          flash: 0,
          slowT: 0,
          burnT: 0,
          burnDmg: 0,
        });
      }
    }
  }

  if (e.boss) {
    G.shake = 22;
    beep(110, 0.5, "triangle", 0.09, 60);
    showCenterMsg("💥 " + (e.bossName || "БОСС") + " ПАЛ!", 1.8);
  } else {
    beep(380, 0.07, "triangle", 0.028, 200);
  }
}

function hurtPlayer(dmg) {
  const p = G.player;
  if (p.iframe > 0) return;
  if (p.dodge > 0 && Math.random() < p.dodge) {
    addText(p.x, p.y - 30, "промах!", "#a5f3fc", 16);
    p.iframe = 0.35;
    return;
  }
  let final = dmg * (1 - p.armor);
  if (p.glassCannon) {
    p.hp = 0;
    endScreen(false);
    return;
  }
  if (p.shield > 0) {
    const absorbed = Math.min(p.shield, final);
    p.shield -= absorbed;
    final -= absorbed;
    p.shieldRegenDelay = 2.5;
    if (final <= 0) {
      p.iframe = 0.3;
      addParticles(p.x, p.y, 5, "#60a5fa", { min: 40, max: 120 });
      updateHUD(true);
      return;
    }
  }
  if (p.hp - final <= 0 && p.secondwind > 0) {
    p.hp = p.maxHp * 0.4;
    p.secondwind--;
    p.iframe = 2;
    p.hurtFlash = 0.35;
    G.shake = Math.max(G.shake, 15);
    addText(p.x, p.y - 40, "ВТОРОЕ ДЫХАНИЕ!", "#ffd166", 22);
    addParticles(p.x, p.y, 30, "#ffd166", { min: 100, max: 300 });
    beep(440, 0.3, "sine", 0.08, 880);
    updateHUD(true);
    return;
  }
  p.hp -= final;
  p.iframe = 0.75;
  p.hurtFlash = 0.35;
  G.shake = Math.max(G.shake, 9);
  addParticles(p.x, p.y, 8, "#ff5c8a", { min: 60, max: 200, heart: true });
  beep(150, 0.16, "sawtooth", 0.05, 70);

  if (p.retaliation > 0) {
    const R = 80 + p.retaliation * 15;
    const dmgAoE = 30 + p.retaliation * 15;
    const R2 = R * R;
    for (const en of [...G.enemies]) {
      if (en.hp <= 0) continue;
      if (dist2(en.x, en.y, p.x, p.y) < R2 + en.r * en.r)
        damageEnemy(en, dmgAoE, false, "retaliation");
    }
    addParticles(p.x, p.y, 15, "#fbbf24", { min: 80, max: 250 });
    G.shake = Math.max(G.shake, 10);
  }
  updateHUD(true);
}

function updateBullets(dt) {
  const p = G.player;
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    b.life -= dt;
    if (b.homing > 0) {
      const t = nearestEnemy(b.x, b.y, 380);
      if (t) {
        const want = Math.atan2(t.y - b.y, t.x - b.x);
        let diff = ((want - b.ang + Math.PI * 3) % TAU) - Math.PI;
        b.ang += clamp(diff, -b.homing * dt, b.homing * dt);
        const sp = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(b.ang) * sp;
        b.vy = Math.sin(b.ang) * sp;
      }
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    let bounced = false;
    if (b.ricochet > 0) {
      if (b.x < b.r && b.vx < 0) {
        b.vx = -b.vx;
        b.ang = Math.atan2(b.vy, b.vx);
        b.ricochet--;
        bounced = true;
      }
      if (b.x > W - b.r && b.vx > 0) {
        b.vx = -b.vx;
        b.ang = Math.atan2(b.vy, b.vx);
        b.ricochet--;
        bounced = true;
      }
      if (b.y < b.r && b.vy < 0) {
        b.vy = -b.vy;
        b.ang = Math.atan2(b.vy, b.vx);
        b.ricochet--;
        bounced = true;
      }
      if (b.y > H - b.r && b.vy > 0) {
        b.vy = -b.vy;
        b.ang = Math.atan2(b.vy, b.vx);
        b.ricochet--;
        bounced = true;
      }
    }
    if (
      !bounced &&
      (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50)
    ) {
      G.bullets.splice(i, 1);
      continue;
    }

    let dead = false;
    for (const e of [...G.enemies]) {
      if (e.hp <= 0) continue;
      if (b.hit.includes(e)) continue;
      const rr = b.r + e.r;
      if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
        let dmg = b.dmg;
        if (p.sniper > 0) {
          const dd = Math.sqrt(dist2(b.ox ?? b.x, b.oy ?? b.y, e.x, e.y));
          if (dd > 400) dmg *= 1 + 0.15 * p.sniper;
        }
        if (p.precision > 0 && b.hit.length > 0) dmg *= 1 + 0.2 * p.precision;
        const crit = Math.random() < p.crit;
        if (crit) dmg *= p.critMult;
        damageEnemy(e, dmg, crit, "player");
        if (p.lifesteal > 0) p.hp = Math.min(p.maxHp, p.hp + dmg * p.lifesteal);
        if (b.freeze > 0 && Math.random() < b.freeze && e.hp > 0) e.slowT = 1.8;
        if (p.burn > 0 && e.hp > 0) {
          e.burnT = 3;
          e.burnDmg =
            (e.burnDmg || 0) + dmg * 0.1 * p.burn * (p.elementalBoost || 1);
        }
        if (b.explosive > 0) {
          const R = 55 + b.explosive * 12,
            R2 = R * R;
          for (const o of [...G.enemies]) {
            if (o === e || o.hp <= 0) continue;
            if (dist2(o.x, o.y, e.x, e.y) < R2 + o.r * o.r)
              damageEnemy(o, dmg * 0.5, false, "player");
          }
          addParticles(e.x, e.y, 8, "#fbbf24", { min: 80, max: 220 });
        }
        b.hit.push(e);
        addParticles(b.x, b.y, 4, "#ffb3dd", {
          min: 40,
          max: 150,
          heart: true,
        });
        if (b.pierce > 0) b.pierce--;
        else {
          dead = true;
          break;
        }
      }
    }
    if (dead) G.bullets.splice(i, 1);
  }
}

function updateEBullets(dt) {
  const p = G.player;
  for (let i = G.ebullets.length - 1; i >= 0; i--) {
    const b = G.ebullets[i];
    b.t += dt;
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) {
      G.ebullets.splice(i, 1);
      continue;
    }
    const rr = b.r + p.r;
    if (dist2(b.x, b.y, p.x, p.y) < rr * rr) {
      if (p.reflector > 0 && Math.random() < p.reflector * 0.05) {
        const backAng = Math.atan2(-b.vy, -b.vx);
        G.bullets.push({
          x: b.x,
          y: b.y,
          vx: -b.vx * 1.5,
          vy: -b.vy * 1.5,
          r: p.projSize,
          dmg: p.dmg * 2,
          pierce: p.pierce,
          homing: p.homing,
          life: 2.6,
          ang: backAng,
          hit: [],
          explosive: p.explosive,
          freeze: p.freezeChance,
          ricochet: p.ricochet,
          ox: b.x,
          oy: b.y,
        });
        addParticles(b.x, b.y, 6, "#a5f3fc", { min: 60, max: 180 });
        addText(b.x, b.y - 20, "ОТРАЖЕНО!", "#a5f3fc", 16);
        beep(1100, 0.08, "sine", 0.04, 1400);
        G.ebullets.splice(i, 1);
        continue;
      }
      hurtPlayer(b.dmg);
      addParticles(b.x, b.y, 6, "#e11d48", { min: 50, max: 160 });
      G.ebullets.splice(i, 1);
    }
  }
}

function updateParticles(dt) {
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const q = G.parts[i];
    q.life -= dt;
    if (q.life <= 0) {
      G.parts.splice(i, 1);
      continue;
    }
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.vx *= 0.93;
    q.vy *= 0.93;
    q.rot += dt * 3;
  }
}
function updateTexts(dt) {
  for (let i = G.texts.length - 1; i >= 0; i--) {
    const t = G.texts[i];
    t.life -= dt;
    t.y -= 42 * dt;
    if (t.life <= 0) G.texts.splice(i, 1);
  }
}

/* =========================================================
   HUD
   ========================================================= */
const hpFill = document.getElementById("hpFill");
const hpText = document.getElementById("hpText");
const shieldRow = document.getElementById("shieldRow");
const waveNum = document.getElementById("waveNum");
const levelNum = document.getElementById("levelNum");
const scoreVal = document.getElementById("scoreVal");
const killCount = document.getElementById("killCount");
const bossHintEl = document.getElementById("bossHint");
const bossBarEl = document.getElementById("bossBar");
const bossFillEl = document.getElementById("bossFill");
const bossNameEl = document.getElementById("bossName");

function updateHUD(force) {
  const p = G.player;
  if (!p || !hpFill) return;

  const hpStr = Math.max(0, Math.ceil(p.hp)) + " / " + Math.round(p.maxHp);
  if (force || hpStr !== _hudCache.hp) {
    hpFill.style.width = clamp(p.hp / p.maxHp, 0, 1) * 100 + "%";
    hpText.textContent = hpStr;
    _hudCache.hp = hpStr;
  }

  const shieldStr =
    p.maxShield > 0 && p.shield > 0
      ? "🔰 " + Math.ceil(p.shield) + " / " + Math.round(p.maxShield)
      : "";
  if (force || shieldStr !== _hudCache.shield) {
    if (shieldStr) {
      shieldRow.style.display = "block";
      shieldRow.textContent = shieldStr;
    } else {
      shieldRow.style.display = "none";
    }
    _hudCache.shield = shieldStr;
  }

  if (force || p.level !== _hudCache.level) {
    levelNum.textContent = String(p.level);
    _hudCache.level = p.level;
  }

  const waveStr = Math.max(1, G.wave) + "/" + CONFIG.maxWave;
  if (force || waveStr !== _hudCache.wave) {
    waveNum.textContent = waveStr;
    _hudCache.wave = waveStr;
  }

  if (bossHintEl) {
    const rem = G.wave % 10;
    const toBoss = rem === 0 ? 0 : 10 - rem;
    const isBossNow = toBoss === 0 && G.wave > 0;
    const hintStr = isBossNow ? "БОСС!" : "до босса " + toBoss;
    if (force || hintStr !== _hudCache.bossHint) {
      bossHintEl.textContent = hintStr;
      bossHintEl.classList.toggle("boss-now", isBossNow);
      _hudCache.bossHint = hintStr;
    }
  }

  const scoreStr = G.score.toLocaleString("ru-RU");
  if (force || scoreStr !== _hudCache.score) {
    scoreVal.textContent = scoreStr;
    _hudCache.score = scoreStr;
  }

  const killsStr = "💀 " + G.kills;
  if (force || killsStr !== _hudCache.kills) {
    killCount.textContent = killsStr;
    _hudCache.kills = killsStr;
  }
}

function updateBossBar() {
  if (G.boss && G.boss.hp > 0) {
    bossBarEl.classList.add("show");
    bossNameEl.textContent = G.boss.bossName || "BOSS";
    bossFillEl.style.width = clamp(G.boss.hp / G.boss.maxHp, 0, 1) * 100 + "%";
  } else {
    bossBarEl.classList.remove("show");
  }
}

/* =========================================================
   РЕНДЕР
   ========================================================= */
const bgHearts = [];
for (let i = 0; i < 18; i++) {
  bgHearts.push({
    x: Math.random(),
    y: Math.random(),
    s: rnd(4, 13),
    a: rnd(0.04, 0.13),
    sp: rnd(0.006, 0.028),
    ph: rnd(0, TAU),
  });
}

function heartPath(c, x, y, s) {
  c.beginPath();
  c.moveTo(x, y + s * 0.72);
  c.bezierCurveTo(
    x + s * 1.45,
    y - s * 0.22,
    x + s * 0.52,
    y - s * 1.12,
    x,
    y - s * 0.34,
  );
  c.bezierCurveTo(
    x - s * 0.52,
    y - s * 1.12,
    x - s * 1.45,
    y - s * 0.22,
    x,
    y + s * 0.72,
  );
  c.closePath();
}

function drawBackground(dt) {
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(255,180,230,.042)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  const gs = 64;
  for (let x = 0; x < W; x += gs) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
  }
  for (let y = 0; y < H; y += gs) {
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
  }
  ctx.stroke();

  for (const h of bgHearts) {
    h.y -= h.sp * dt;
    if (h.y < -0.06) {
      h.y = 1.06;
      h.x = Math.random();
    }
    const px = h.x * W + Math.sin(G.t * 0.7 + h.ph) * 18;
    const py = h.y * H;
    ctx.globalAlpha = h.a;
    ctx.fillStyle = "#ff9ecb";
    heartPath(ctx, px, py, h.s);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawAura() {
  const p = G.player;
  if (!p || p.auraR <= 0) return;
  const pulse = 1 + Math.sin(p.auraPulse) * 0.035;
  const R = p.auraR * pulse;
  const g = ctx.createRadialGradient(p.x, p.y, R * 0.25, p.x, p.y, R);
  g.addColorStop(0, "rgba(255,140,200,.10)");
  g.addColorStop(0.7, "rgba(200,120,255,.10)");
  g.addColorStop(1, "rgba(200,120,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, R, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,170,220,.28)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(p.x, p.y, R, 0, TAU);
  ctx.stroke();
}

function drawEnemies() {
  for (const e of G.enemies) {
    ctx.save();
    ctx.translate(e.x, e.y);

    const flash = e.flash > 0;
    const alpha = e.ghost ? 0.55 : 1;
    ctx.globalAlpha = alpha;

    if (e.shield > 0) {
      ctx.strokeStyle = "rgba(96,165,250,.85)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, e.r * 1.45, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = "rgba(191,219,254,.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, e.r * 1.55, 0, TAU);
      ctx.stroke();
    }

    if (e.burnT > 0) {
      ctx.fillStyle = "rgba(249,115,22,.25)";
      ctx.beginPath();
      ctx.arc(0, 0, e.r * 1.2, 0, TAU);
      ctx.fill();
    }

    // spikes (dynamic — вращаются)
    ctx.fillStyle = flash ? "#ffffff" : e.color;
    ctx.beginPath();
    const n = e.spikes;
    for (let i = 0; i < n; i++) {
      const a1 = (i / n) * TAU + e.t * 0.55;
      const a2 = ((i + 0.5) / n) * TAU + e.t * 0.55;
      ctx.lineTo(Math.cos(a1) * e.r * 0.98, Math.sin(a1) * e.r * 0.98);
      ctx.lineTo(Math.cos(a2) * e.r * 1.36, Math.sin(a2) * e.r * 1.36);
    }
    ctx.closePath();
    ctx.globalAlpha = alpha * 0.85;
    ctx.fill();
    ctx.globalAlpha = alpha;

    // body (спрайт из кэша)
    const bodySpr = getEnemyBodySprite(e.r, e.color, flash);
    ctx.drawImage(bodySpr, -bodySpr.width / 2, -bodySpr.height / 2);

    // eyes
    const eyeY = -e.r * 0.08,
      eyeX = e.r * 0.34;
    ctx.fillStyle = "rgba(15,4,25,.92)";
    ctx.beginPath();
    ctx.arc(-eyeX, eyeY, e.r * 0.15, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, e.r * 0.15, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.8)";
    ctx.beginPath();
    ctx.arc(-eyeX + e.r * 0.05, eyeY - e.r * 0.06, e.r * 0.05, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeX + e.r * 0.05, eyeY - e.r * 0.06, e.r * 0.05, 0, TAU);
    ctx.fill();

    if (e.boss) {
      ctx.fillStyle = "#ffd166";
      ctx.strokeStyle = "#b8860b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const cy = -e.r * 1.05,
        cw = e.r * 0.9;
      ctx.moveTo(-cw, cy);
      ctx.lineTo(-cw * 0.6, cy - e.r * 0.5);
      ctx.lineTo(-cw * 0.2, cy - e.r * 0.12);
      ctx.lineTo(0, cy - e.r * 0.62);
      ctx.lineTo(cw * 0.2, cy - e.r * 0.12);
      ctx.lineTo(cw * 0.6, cy - e.r * 0.5);
      ctx.lineTo(cw, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    if (!e.boss && e.hp < e.maxHp) {
      const bw = e.r * 2.1,
        bh = 4;
      const bx = -bw / 2,
        by = -e.r * 1.55;
      ctx.fillStyle = "rgba(0,0,0,.5)";
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = e.color;
      ctx.fillRect(bx, by, bw * clamp(e.hp / e.maxHp, 0, 1), bh);
      if (e.maxShield > 0 && e.shield > 0) {
        ctx.fillStyle = "#60a5fa";
        ctx.fillRect(bx, by - 3, bw * clamp(e.shield / e.maxShield, 0, 1), 2);
      }
    }

    if (e.slowT > 0) {
      ctx.strokeStyle = "rgba(147,197,253,.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, e.r * 1.3, 0, TAU);
      ctx.stroke();
    }

    ctx.restore();
  }
}

function drawBullets() {
  for (const b of G.bullets) {
    const color = b.explosive > 0 ? "#ff9ecb" : "#ff6fb5";
    const fill = b.explosive > 0 ? "#fbbf24" : "#ff9ecb";
    const spr = getBulletSprite(color, fill);
    const s = b.r / 9;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.ang + Math.PI / 2);
    ctx.drawImage(spr, -32 * s, -32 * s, 64 * s, 64 * s);
    ctx.restore();
  }
}

function drawEBullets() {
  for (const b of G.ebullets) {
    ctx.save();
    ctx.translate(b.x, b.y);
    const r = b.r + Math.sin(b.t * 14) * 1.2;
    ctx.shadowColor = "#e11d48";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#e11d48";
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const a1 = (i / 7) * TAU + b.t * 2;
      const a2 = ((i + 0.5) / 7) * TAU + b.t * 2;
      ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
      ctx.lineTo(Math.cos(a2) * r * 1.4, Math.sin(a2) * r * 1.4);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.shadowBlur = 0;
}

function drawPlayer() {
  const p = G.player;
  if (!p) return;
  if (p.iframe > 0 && Math.floor(p.iframe * 22) % 2 === 0) return;

  const s = p.r;
  const bob = Math.sin(p.t * 9) * (p.moving ? 2 : 0.8);

  ctx.save();
  ctx.translate(p.x, p.y + bob);
  ctx.scale(p.blink, 1);

  if (p.maxShield > 0 && p.shield > 0) {
    const shieldPct = p.shield / p.maxShield;
    ctx.save();
    ctx.scale(1 / p.blink, 1);
    ctx.strokeStyle = `rgba(96,165,250,${0.3 + shieldPct * 0.5})`;
    ctx.lineWidth = 2 + shieldPct * 2;
    ctx.beginPath();
    ctx.arc(0, 0, s * 1.55, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.scale(1 / p.blink, 1);
  ctx.fillStyle = "rgba(0,0,0,.28)";
  ctx.beginPath();
  ctx.ellipse(0, s * 1.25 - bob, s * 0.95, s * 0.32, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  const tw = Math.sin(p.t * 5) * 7;
  ctx.strokeStyle = "#f7a8d0";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-s * 0.7, s * 0.45);
  ctx.quadraticCurveTo(-s * 2.1, s * 0.3 + tw, -s * 1.75, -s * 0.75 + tw);
  ctx.stroke();

  ctx.fillStyle = "#fff3f9";
  ctx.strokeStyle = "#f7a8d0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-s * 0.72, -s * 0.62);
  ctx.lineTo(-s * 0.92, -s * 1.52);
  ctx.lineTo(-s * 0.12, -s * 0.92);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(s * 0.72, -s * 0.62);
  ctx.lineTo(s * 0.92, -s * 1.52);
  ctx.lineTo(s * 0.12, -s * 0.92);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ffb8d9";
  ctx.beginPath();
  ctx.moveTo(-s * 0.66, -s * 0.72);
  ctx.lineTo(-s * 0.78, -s * 1.22);
  ctx.lineTo(-s * 0.3, -s * 0.86);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(s * 0.66, -s * 0.72);
  ctx.lineTo(s * 0.78, -s * 1.22);
  ctx.lineTo(s * 0.3, -s * 0.86);
  ctx.closePath();
  ctx.fill();

  const g = ctx.createRadialGradient(
    -s * 0.3,
    -s * 0.35,
    s * 0.15,
    0,
    0,
    s * 1.1,
  );
  g.addColorStop(0, "#ffffff");
  g.addColorStop(1, "#ffe4f0");
  ctx.fillStyle = g;
  ctx.strokeStyle = "#f7a8d0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, s, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255,150,190,.42)";
  ctx.beginPath();
  ctx.ellipse(-s * 0.58, s * 0.22, s * 0.24, s * 0.16, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s * 0.58, s * 0.22, s * 0.24, s * 0.16, 0, 0, TAU);
  ctx.fill();

  const blink = Math.sin(p.t * 1.7) > 0.985 ? 0.12 : 1;
  ctx.fillStyle = "#3a1d33";
  ctx.beginPath();
  ctx.ellipse(-s * 0.33, -s * 0.1, s * 0.13, s * 0.17 * blink, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s * 0.33, -s * 0.1, s * 0.13, s * 0.17 * blink, 0, 0, TAU);
  ctx.fill();
  if (blink > 0.5) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-s * 0.29, -s * 0.16, s * 0.05, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.37, -s * 0.16, s * 0.05, 0, TAU);
    ctx.fill();
  }

  ctx.fillStyle = "#ff7ab0";
  ctx.beginPath();
  ctx.moveTo(0, s * 0.14);
  ctx.lineTo(-s * 0.11, s * 0.03);
  ctx.lineTo(s * 0.11, s * 0.03);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#c96b96";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(-s * 0.1, s * 0.2, s * 0.13, 0, Math.PI);
  ctx.arc(s * 0.1, s * 0.2, s * 0.13, 0, Math.PI);
  ctx.stroke();

  ctx.strokeStyle = "rgba(190,120,160,.65)";
  ctx.lineWidth = 1.2;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, s * 0.1 + i * s * 0.13);
    ctx.lineTo(-s * 1.25, s * 0.04 + i * s * 0.24);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.1 + i * s * 0.13);
    ctx.lineTo(s * 1.25, s * 0.04 + i * s * 0.24);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,120,180,.55)";
  heartPath(ctx, 0, s * 0.62, s * 0.22);
  ctx.fill();

  ctx.restore();

  if (p.hurtFlash > 0) {
    ctx.fillStyle = `rgba(255,60,120,${p.hurtFlash * 0.6})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, s * 1.6, 0, TAU);
    ctx.fill();
  }
}

function drawParticles() {
  for (const q of G.parts) {
    const a = clamp(q.life / q.max, 0, 1);
    ctx.globalAlpha = a;
    if (q.heart) {
      ctx.save();
      ctx.translate(q.x, q.y);
      ctx.rotate(q.rot);
      ctx.fillStyle = q.color;
      heartPath(ctx, 0, 0, q.r);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = q.color;
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.r * a, 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawTexts() {
  ctx.textAlign = "center";
  for (const t of G.texts) {
    const a = clamp(t.life / t.max, 0, 1);
    ctx.globalAlpha = a;
    ctx.font = `900 ${t.size}px Nunito, sans-serif`;
    ctx.fillStyle = t.color;
    ctx.strokeStyle = "rgba(0,0,0,.6)";
    ctx.lineWidth = 3;
    ctx.strokeText(t.str, t.x, t.y);
    ctx.fillText(t.str, t.x, t.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}

function render(dt) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (G.shake > 0.4) {
    ctx.translate(rnd(-G.shake, G.shake) * 0.35, rnd(-G.shake, G.shake) * 0.35);
  }
  drawBackground(dt);
  drawAura();
  drawEnemies();
  drawBullets();
  drawEBullets();
  if (G.player && G.state !== "menu") drawPlayer();
  drawParticles();
  drawTexts();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (G.bossFlash > 0) {
    ctx.fillStyle = `rgba(255, 60, 100, ${Math.min(0.45, G.bossFlash * 0.9)})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}

/* =========================================================
   MAIN LOOP
   ========================================================= */
let lastT = performance.now();
function loop(now) {
  let dt = (now - lastT) / 1000;
  lastT = now;
  dt = Math.min(dt, 0.05);

  if (G.state === "playing") {
    update(dt);
  } else if (G.state === "menu" || G.state === "over" || G.state === "win") {
    G.t += dt;
    if (G.msgTimer > 0) {
      G.msgTimer -= dt;
      if (G.msgTimer <= 0)
        document.getElementById("centerMsg").classList.remove("show");
    }
  }
  // upgrade/chest/inventory/paused — msgTimer и время заморожены

  render(dt);
  if (G.state === "playing") updateHUD(false);

  requestAnimationFrame(loop);
}

resize();
showMenu();
requestAnimationFrame(loop);
