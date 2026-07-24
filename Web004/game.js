/* 晚风小路 · 散步 + 盆栽 + 汽水铺 · DOM/canvas layer */
(() => {
  "use strict";

  const Core = globalThis.WanfengCore;
  if (!Core) {
    console.error("WanfengCore missing — load js/core.js first");
    return;
  }

  // roundRect 兼容
  if (typeof CanvasRenderingContext2D !== "undefined" && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      const radius = typeof r === "number" ? r : 8;
      this.beginPath();
      this.moveTo(x + radius, y);
      this.arcTo(x + w, y, x + w, y + h, radius);
      this.arcTo(x + w, y + h, x, y + h, radius);
      this.arcTo(x, y + h, x, y, radius);
      this.arcTo(x, y, x + w, y, radius);
      this.closePath();
      return this;
    };
  }

  const SAVE_KEY = Core.SAVE_KEY;

  // ---------- 图鉴数据（shipped core + WanfengExtra + WanfengGameData） ----------
  const extra = globalThis.WanfengExtra || {};
  const GData = globalThis.WanfengGameData || {};
  let catalog = Core.mergeCatalog({
    items: extra.items || {},
    plants: extra.plants || {},
    cups: extra.cups || [],
    bases: extra.bases || [],
    flavors: extra.flavors || [],
    toppings: extra.toppings || [],
    customers: extra.customers || [],
  });
  const ITEMS = catalog.items;
  const PLANTS = catalog.plants;
  let CUPS = catalog.cups.slice();
  let BASES = catalog.bases.slice();
  let FLAVORS = catalog.flavors.slice();
  // keep shop UI readable: prefer base options + a sample of extras
  if (FLAVORS.length > 16) {
    const baseIds = new Set(Core.DEFAULT_FLAVORS.map((f) => f.id));
    const base = FLAVORS.filter((f) => baseIds.has(f.id));
    const rest = FLAVORS.filter((f) => !baseIds.has(f.id)).slice(-10);
    FLAVORS = base.concat(rest);
  }
  let TOPPINGS = catalog.toppings.slice();
  if (TOPPINGS.length > 12) {
    const baseIds = new Set(Core.DEFAULT_TOPPINGS.map((t) => t.id));
    const base = TOPPINGS.filter((t) => baseIds.has(t.id));
    const rest = TOPPINGS.filter((t) => !baseIds.has(t.id)).slice(-8);
    TOPPINGS = base.concat(rest);
  }
  let CUSTOMERS = catalog.customers.slice().filter(function (c) {
    // drop mass-template names like "骑车的大学生·123"
    return c && c.name && !/·\d+$/.test(c.name) && !/#\d+/.test(c.name || "");
  });
  if (CUSTOMERS.length < 8) {
    CUSTOMERS = Core.DEFAULT_CUSTOMERS.concat(CUSTOMERS);
  }
  if (CUSTOMERS.length > 32) {
    CUSTOMERS = Core.DEFAULT_CUSTOMERS.concat(CUSTOMERS.filter(function (c) {
      return !Core.DEFAULT_CUSTOMERS.some(function (d) { return d.name === c.name; });
    }).slice(-24));
  }

  // Live config from data/* via game-data.js (file:// safe)
  const walkCfg = GData.walk || { pathWidth: 3200, spawnBias: {}, ambient: [] };
  const gardenCfg = GData.garden || { messages: [], careBonus: 1, potSlots: 4 };
  const shopCfg = GData.shop || { tipMessages: [], perfectBonus: 2 };
  const uiCopy = GData.ui || { toasts: [], tips: [] };
  const secretRecipes = GData.recipes || [];
  const journalTemplates = GData.journal || [];
  const dataAchievements = GData.achievements || [];
  const eveningEvents = GData.eveningEvents || [];
  const mailLetters = GData.mail || [];
  const seasonTips = GData.seasonTips || {};
  const PATH_THEMES = (GData.pathThemes && GData.pathThemes.length
    ? GData.pathThemes
    : Core.DEFAULT_PATH_THEMES) || Core.DEFAULT_PATH_THEMES;
  const dataDialogues = (GData.dialogues || [])
    .map((d) => (typeof d === "string" ? d : d && d.text))
    .filter(Boolean);
  const extraDialogues = (extra.dialogues || [])
    .map((d) => (typeof d === "string" ? d : d && d.text))
    .filter(Boolean);

  if (!state.pathThemeId) state.pathThemeId = "maple_lane";

  function currentTheme() {
    return Core.getPathTheme(state, PATH_THEMES);
  }

  function baseItemIds() {
    return Object.keys(ITEMS).filter((id) => ITEMS[id] && !String(id).startsWith("seed_"));
  }

  function pathSpawnsForTheme(theme) {
    const bias = Object.assign({}, walkCfg.spawnBias || {}, (theme && theme.bias) || {});
    // Soft familiar-path boost: favorite route slightly favors its own bias keys
    if (theme && state.favoritePathThemeId && theme.id === state.favoritePathThemeId) {
      Object.keys(theme.bias || {}).forEach((k) => {
        bias[k] = (bias[k] || 1) * 1.25;
      });
    }
    return Core.buildSpawnList(baseItemIds(), bias, 80);
  }

  const DIALOGUES = dataDialogues.concat(extraDialogues);
  const PATH_WIDTH = walkCfg.pathWidth || 3200;

  // ---------- 状态 ----------
  function defaultState() {
    return Core.defaultState(4);
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return Core.deserialize(raw);
    } catch {
      return null;
    }
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, Core.serialize(state));
    } catch { /* ignore */ }
  }

  let state = load() || defaultState();
  if (!state.customer) state.customer = randomCustomer();

  function bagCount() {
    return Core.bagCount(state);
  }

  function hasItem(id, n = 1) {
    return Core.hasItem(state, id, n);
  }

  function addItem(id, n = 1) {
    Core.addItem(state, id, n);
    save();
    refreshResources();
  }

  function takeItem(id, n = 1) {
    const ok = Core.takeItem(state, id, n);
    if (ok) {
      save();
      refreshResources();
    }
    return ok;
  }

  const AudioFx = globalThis.WanfengAudio || { play: () => false };

  function sfx(kind) {
    const st = Core.getSettings(state);
    return AudioFx.play(kind, st.sound !== false);
  }

  function applySettingsToDom() {
    const meta = document.getElementById("build-meta");
    if (meta) {
      meta.textContent = "晚风小路 · 存档 v" + (Core.VERSION || "?") + " · 主题 " + (state.pathThemeId || "maple_lane");
    }
    const st = Core.getSettings(state);
    document.body.classList.toggle("reduce-motion", !!st.reduceMotion);
    const sound = document.getElementById("set-sound");
    const motion = document.getElementById("set-motion");
    const tips = document.getElementById("set-tips");
    const weather = document.getElementById("set-weather");
    const ambience = document.getElementById("set-ambience");
    if (sound) sound.checked = st.sound !== false;
    if (motion) motion.checked = !!st.reduceMotion;
    if (tips) tips.checked = st.showTips !== false;
    if (weather) weather.checked = st.weatherFx !== false;
    if (ambience) ambience.checked = !!st.ambience;
    const quiet = document.getElementById("set-quiet-shop");
    if (quiet) quiet.checked = !!st.quietShop;
    if (AudioFx.setAmbience) {
      AudioFx.setAmbience(!!st.ambience, st.sound !== false);
    }
  }

  function refreshDailyUI() {
    Core.ensureDailyGoals(state);
    const ev = Core.evaluateDailyGoals(state);
    const list = document.getElementById("daily-list");
    const dateEl = document.getElementById("daily-date");
    const claim = document.getElementById("btn-claim-daily");
    const msg = document.getElementById("daily-msg");
    const preview = document.getElementById("daily-preview");
    if (dateEl) dateEl.textContent = "日期 " + (ev.daily.key || "");
    if (list) {
      list.innerHTML = (ev.daily.goalIds || [])
        .map((id) => {
          const def = Core.DAILY_GOAL_DEFS.find((d) => d.id === id) || { name: id, desc: "" };
          const done = !!ev.daily.completed[id];
          return `<article class="journal-card"><div class="meta">${done ? "已完成" : "进行中"}</div><p><strong>${def.name}</strong> — ${def.desc}</p></article>`;
        })
        .join("");
    }
    if (claim) {
      claim.disabled = !ev.allDone || !!ev.daily.claimed;
      claim.textContent = ev.daily.claimed ? "今日奖励已领取" : "领取今日温柔奖励";
    }
    if (msg && !ev.daily.claimed) msg.textContent = ev.allDone ? "全部完成啦，可以领取奖励。" : "慢慢来，没有惩罚。";
    if (preview) {
      const doneN = (ev.daily.goalIds || []).filter((id) => ev.daily.completed[id]).length;
      const total = (ev.daily.goalIds || []).length || 3;
      preview.hidden = false;
      preview.textContent = `今日小目标 ${doneN}/${total}`;
    }
  }

  // expose for debugging / tests in browser
  globalThis.WanfengGame = {
    getState: () => state,
    core: Core,
    addItem,
    hasItem,
    takeItem,
    sfx,
    advanceSeason: () => {
      Core.advanceSeason(state);
      checkAchievements();
      save();
      refreshResources();
      return state.season;
    },
  };

  function toast(msg) {
    const stack = document.getElementById("toast-stack");
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    stack.appendChild(el);
    setTimeout(() => {
      el.classList.add("out");
      setTimeout(() => el.remove(), 300);
    }, 2400);
  }

  function refreshResources() {
    document.getElementById("res-coins").textContent = state.coins;
    document.getElementById("res-hearts").textContent = state.hearts;
    document.getElementById("res-bag").textContent = bagCount();
    const canEl = document.getElementById("res-can");
    if (canEl) {
      const can = Core.getWateringCan(state);
      canEl.textContent = can.charge + "/" + can.max;
    }
    const seasonEl = document.getElementById("res-season");
    if (seasonEl) {
      seasonEl.textContent = Core.SEASON_LABELS[state.season] || state.season || "黄昏";
    }
    applySeasonArt();
  }

  function applySeasonArt() {
    const art = Core.SEASON_ART[state.season] || Core.SEASON_ART.dusk;
    const banners = (GData.seasons && GData.seasons.stageBanners) || {};
    const hero = document.querySelector(".hero-art");
    if (hero) hero.src = banners.ui || banners.album || art;
    const walkBanner = document.querySelector("#screen-walk .scene-banner");
    if (walkBanner) walkBanner.src = banners.walk || art;
    const gardenBanner = document.querySelector("#screen-garden .scene-banner");
    if (gardenBanner && banners.garden) gardenBanner.src = banners.garden;
    const shopBanner = document.querySelector("#screen-shop .scene-banner");
    if (shopBanner && banners.shop) shopBanner.src = banners.shop;
    const title = document.getElementById("home-title");
    if (title) {
      const label = Core.SEASON_LABELS[state.season] || "黄昏";
      title.textContent = label + "的风也很温柔";
    }
  }

  function checkAchievements(silent) {
    const newly = Core.evaluateAchievements(state);
    if (newly.length) {
      save();
      if (!silent) {
        newly.forEach((a) => { toast("✨ 成就：" + a.name); sfx("achieve"); });
      }
    }
    return newly;
  }

  // ---------- 导航 ----------
  function go(screen) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    const el = document.getElementById(`screen-${screen}`);
    if (el) el.classList.add("active");

    if (screen === "walk") {
      renderThemePicker();
      startWalk();
    }
    if (screen === "garden") renderGarden();
    if (screen === "shop") {
      renderShop();
      const tips = seasonTips[state.season] || seasonTips.dusk || [];
      if (tips.length && Core.getSettings(state).showTips !== false) {
        const tip = tips[Math.floor(Math.random() * tips.length)];
        setTimeout(() => toast("🍋 " + tip), 200);
      }
    }
    if (screen === "album") renderAlbum(currentAlbumTab);
    if (screen === "journal") renderJournal();
    if (screen === "achievements") renderAchievements();
    if (screen === "settings") {
      applySettingsToDom();
      const msg = document.getElementById("settings-msg");
      if (msg) msg.textContent = "";
    }
    if (screen === "daily") refreshDailyUI();
    if (screen === "bag") renderBag();
    if (screen === "mail") renderMail();
    if (screen === "stats") renderStats();
    if (screen !== "walk") stopWalk();
    sfx("ui");
  }

  function renderThemePicker() {
    const box = document.getElementById("theme-picker");
    const desc = document.getElementById("theme-desc");
    if (!box) return;
    const cur = currentTheme();
    const fav = state.favoritePathThemeId;
    box.innerHTML = "";
    PATH_THEMES.forEach((th) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "theme-chip" + (th.id === (cur && cur.id) ? " selected" : "");
      btn.setAttribute("aria-pressed", th.id === (cur && cur.id) ? "true" : "false");
      const star = th.id === fav ? " ★" : "";
      btn.innerHTML = `<span>${th.emoji || "🍃"}</span><span>${th.name}${star}</span>`;
      btn.title = "单击切换小路；双击标记为最爱";
      btn.addEventListener("click", () => {
        Core.setPathTheme(state, th.id, PATH_THEMES);
        if (!state._themesTouched) state._themesTouched = {};
        state._themesTouched[th.id] = true;
        save();
        renderThemePicker();
        world = makeWorld(3000 + state.pathsWalked * 17 + Date.now() % 500);
        if (walkRunning) resizeWalk();
        toast((th.emoji || "") + " 小路换成了「" + th.name + "」");
        sfx("theme");
      });
      btn.addEventListener("dblclick", (e) => {
        e.preventDefault();
        if (typeof Core.setFavoritePathTheme === "function") {
          Core.setFavoritePathTheme(state, th.id);
          save();
          renderThemePicker();
          toast("★ 常走小路：「" + th.name + "」");
          sfx("ui");
        }
      });
      box.appendChild(btn);
    });
    if (desc) {
      const favName = fav && PATH_THEMES.find((t) => t.id === fav);
      desc.textContent =
        (cur ? cur.desc || "" : "") +
        (favName ? " · 常走：★ " + favName.name : "");
    }
  }

  
  
  function renderStats() {
    const box = document.getElementById("stats-body");
    if (!box) return;
    const st = state.stats || {};
    const disc = Object.keys(state.discovered || {}).length;
    const drinks = Object.keys(state.drinksMade || {}).length;
    const mailN = Object.keys(state._readMail || {}).length;
    const aff = Object.keys(state.customerAffinity || {}).length;
    const themesN = Object.keys(state._themesTouched || {}).length;
    box.innerHTML = `
      <div class="stat-bars">
        <div class="stat"><span>金币</span><div class="bar"><i style="width:${Math.min(100,state.coins||0)}%"></i></div><span>${state.coins||0}</span></div>
        <div class="stat"><span>好心情</span><div class="bar mood"><i style="width:${Math.min(100,(state.hearts||0)*10)}%"></i></div><span>${state.hearts||0}</span></div>
      </div>
      <article class="journal-card" style="margin-top:12px"><div class="meta">足迹</div>
      <p>走过小路 ${state.pathsWalked||0} 段 · 拾取 ${st.itemsPicked||0} · 收获 ${st.plantsHarvested||0} · 招待 ${st.drinksServed||0}</p>
      <p>发现收集物 ${disc} · 汽水配方 ${drinks} · 来信 ${mailN} · 熟悉客人 ${aff} · 主题足迹 ${themesN}</p>
      <p>常走小路 ${state.favoritePathThemeId||"未标记"} · 秘密配方解锁 ${(() => { const n=(typeof secretRecipes!=="undefined"?secretRecipes:[]).filter(r=>r&&state.drinksMade&&state.drinksMade[[r.cup,r.base,r.flavor,r.topping||"none"].join("-")]).length; return n; })()}/${(typeof secretRecipes!=="undefined"?secretRecipes:[]).length||0}</p>
      <p>季节 ${Core.SEASON_LABELS[state.season]||state.season||"黄昏"} · 主题 ${state.pathThemeId||"maple_lane"} · 花盆 ${(state.potSlots||state.pots.length)} </p>
      <p>小路贴纸 ${Object.keys(state.pathStickers||{}).length} · 长椅歇脚 ${st.benchSits||0} · 花盆便签 ${st.potNotes||0} · 窗台速写 ${st.potSnaps||0}</p>
      ${(() => {
        const snaps = (state.potSnaps || []).slice(-4).reverse();
        if (!snaps.length) return "";
        return "<p>最近速写：" + snaps.map((c) => (c.emoji || "🪴") + (c.name || "")).join(" · ") + "</p>";
      })()}
      ${(() => {
        const pairs = Object.entries(state.customerAffinity || {}).sort((a,b)=>b[1]-a[1]).slice(0,5);
        if (!pairs.length) return "";
        return "<p>常来的客人：" + pairs.map(([n,v]) => n + "×" + v).join(" · ") + "</p>";
      })()}
      </article>`;
  }

  function renderMail() {
    const list = document.getElementById("mail-list");
    const msg = document.getElementById("mail-msg");
    if (!list) return;
    state._readMail = state._readMail || {};
    const read = Object.keys(state._readMail);
    if (!read.length) {
      list.innerHTML = '<article class="journal-card"><p class="muted">还没有拆开过信。点下面按钮试试。</p></article>';
    } else {
      list.innerHTML = read.slice(-8).reverse().map((id) => {
        const m = mailLetters.find((x) => x.id === id) || { title: id, body: "" };
        return `<article class="journal-card"><div class="meta">已读</div><p><strong>${m.title || id}</strong><br/>${m.body || ""}</p></article>`;
      }).join("");
    }
    if (msg) msg.textContent = mailLetters.length ? `信箱里还有未读的心意。` : "信箱是空的。";
  }

  function openOneMail() {
    if (!mailLetters.length) {
      toast("信箱暂时空着");
      return;
    }
    state._readMail = state._readMail || {};
    let pool = mailLetters.filter((m) => m && m.id && !state._readMail[m.id]);
    if (!pool.length) pool = mailLetters.slice();
    const m = pool[Math.floor(Math.random() * pool.length)];
    state._readMail[m.id] = true;
    const effect = m.effect || {};
    if (effect.coins) state.coins = (state.coins || 0) + effect.coins;
    if (effect.hearts) state.hearts = (state.hearts || 0) + effect.hearts;
    if (effect.items) Object.keys(effect.items).forEach((id) => addItem(id, effect.items[id]));
    Core.appendJournal(state, "【来信】" + (m.title || "") + "：" + (m.body || ""));
    save();
    refreshResources();
    renderMail();
    toast("✉️ " + (m.title || "一封信"));
    sfx("serve");
    const msg = document.getElementById("mail-msg");
    if (msg) msg.textContent = m.body || "";
  }

  function renderBag() {
    const grid = document.getElementById("bag-grid");
    if (!grid) return;
    const kindOrder = { "风味": 1, "基底": 2, "装饰": 3, "种子": 4, "收藏": 5 };
    const entries = Object.keys(state.bag || {})
      .filter((id) => (state.bag[id] || 0) > 0)
      .sort((a, b) => {
        if (state.pinnedBagItem === a) return -1;
        if (state.pinnedBagItem === b) return 1;
        const ka = kindOrder[(ITEMS[a] && ITEMS[a].kind) || ""] || 9;
        const kb = kindOrder[(ITEMS[b] && ITEMS[b].kind) || ""] || 9;
        if (ka !== kb) return ka - kb;
        return a.localeCompare(b);
      });
    if (!entries.length) {
      grid.innerHTML = '<div class="album-card"><div class="emoji">🧺</div><div class="name">还是空的</div><div class="meta">去小路逛逛吧</div></div>';
      return;
    }
    const rareIds = new Set([
      "star_sand", "paper_crane", "candy_wrap", "seashell", "wheat_ear",
      "camellia", "lilac", "chamomile", "bluebell", "rosemary", "osmanthus", "honeysuckle", "sage", "yuzu", "matcha", "moss", "ink_stone", "loquat_leaf", "perilla", "salt_crystal", "thyme", "driftwood", "fennel", "basil", "lemongrass",
    ]);
    grid.innerHTML = entries
      .map((id) => {
        const it = ITEMS[id] || { emoji: "?", name: id, kind: "" };
        const n = state.bag[id];
        const rare = rareIds.has(id) ? " · 小珍藏" : "";
        const pin = state.pinnedBagItem === id ? " · 📌置顶" : "";
        return `<div class="album-card" data-item="${id}"><div class="emoji">${it.emoji || "?"}</div><div class="name">${it.name || id}</div><div class="meta">${it.kind || ""} · ×${n}${rare}${pin}</div></div>`;
      })
      .join("");
  }

  
  (function wireBagPin() {
    const grid = document.getElementById("bag-grid");
    if (!grid || grid._pinWired) return;
    grid._pinWired = true;
    grid.addEventListener("click", (e) => {
      const card = e.target.closest("[data-item]");
      if (!card) return;
      const id = card.getAttribute("data-item");
      if (!id || !Core.pinBagItem) return;
      Core.pinBagItem(state, id);
      save();
      renderBag();
      toast("📌 已置顶 " + ((ITEMS[id] && ITEMS[id].name) || id));
      sfx("pin");
    });
  })();

function renderJournal() {
    const box = document.getElementById("journal-list");
    if (!box) return;
    const entries = (state.journal || []).slice().reverse();
    const templates = journalTemplates
      .slice(-6)
      .map((t) => {
        const title = t.title || "模板";
        const body = t.body || "";
        return `<article class="journal-card"><div class="meta">模板 · ${title}</div><p class="muted">${body}</p></article>`;
      })
      .join("");
    if (!entries.length && !templates) {
      box.innerHTML = '<div class="journal-card"><p class="muted">还没有写下什么。去散散步、浇浇水、做一杯汽水吧。</p></div>';
      return;
    }
    const lived = entries
      .map((e) => {
        const season = Core.SEASON_LABELS[e.season] || e.season || "";
        return `<article class="journal-card"><div class="meta">第 ${e.day || "?"} 天 · ${season}</div><p>${e.text}</p></article>`;
      })
      .join("");
    box.innerHTML = lived + templates;
  }

  function renderAchievements() {
    const grid = document.getElementById("achievements-grid");
    if (!grid) return;
    checkAchievements(true);
    const runtime = Core.DEFAULT_ACHIEVEMENTS.map((a) => {
      const done = !!(state.achievements && state.achievements[a.id]);
      return `<div class="album-card ${done ? "done" : "locked"}">
        <div class="emoji">${done ? "✨" : "☁️"}</div>
        <div class="name">${a.name}</div>
        <div class="meta">${done ? "已达成 · " + a.desc : a.desc}</div>
      </div>`;
    });
    // data-driven soft milestones (display; unlock tracked via stats targets)
    const dataCards = dataAchievements.slice(-12).map((a) => {
      const target = a.target || 0;
      const prog = Math.max(
        state.pathsWalked || 0,
        (state.stats && state.stats.itemsPicked) || 0,
        (state.stats && state.stats.drinksServed) || 0
      );
      const done = prog >= target && target > 0;
      return `<div class="album-card ${done ? "done" : "locked"}">
        <div class="emoji">${done ? "🏅" : "🌱"}</div>
        <div class="name">${a.name || a.id}</div>
        <div class="meta">${a.desc || "温柔里程碑"} · 目标 ${target}</div>
      </div>`;
    });
    grid.innerHTML = runtime.concat(dataCards).join("");
  }

  document.querySelectorAll("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => go(btn.dataset.go));
  });

  // ---------- 散步（Canvas） ----------
  const canvas = document.getElementById("walk-canvas");
  const ctx = canvas.getContext("2d");
  let walkRaf = 0;
  let walkRunning = false;
  let keys = { left: false, right: false };
  let world = null;

  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeWorld(seed) {
    const rand = mulberry32(seed);
    const width = PATH_WIDTH;
    const items = [];
    const trees = [];
    const hills = [];
    const theme = currentTheme();
    const spawns = pathSpawnsForTheme(theme);
    const ambPool = (theme && theme.ambient && theme.ambient.length
      ? theme.ambient
      : walkCfg.ambient) || [];
    const ambientNote =
      ambPool.length
        ? ambPool[Math.floor(rand() * ambPool.length)]
        : null;

    const ITEM_CAP = (typeof navigator !== "undefined" && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) ? 18 : 28;
    for (let i = 0; i < ITEM_CAP; i++) {
      const id = spawns[Math.floor(rand() * spawns.length)] || "maple";
      if (!ITEMS[id]) continue;
      items.push({
        id,
        x: 180 + rand() * (width - 360),
        y: 0,
        taken: false,
        bob: rand() * Math.PI * 2,
      });
    }

    for (let i = 0; i < 18; i++) {
      trees.push({
        x: rand() * width,
        h: 40 + rand() * 50,
        type: rand() > 0.5 ? 0 : 1,
      });
    }

    for (let i = 0; i < 6; i++) {
      hills.push({
        x: i * 600 + rand() * 100,
        w: 400 + rand() * 280,
        h: 60 + rand() * 50,
        color: rand() > 0.5 ? "#a8c47c" : "#96b86e",
      });
    }

    return {
      seed,
      width,
      camX: 0,
      playerX: 120,
      playerFacing: 1,
      groundY: 0,
      items,
      trees,
      hills,
      time: 0,
      collected: 0,
      ambientNote,
      themeId: theme && theme.id,
      sky: (theme && theme.sky) || null,
      groundColor: (theme && theme.ground) || "#8faf6a",
      pathColor: (theme && theme.path) || "#c4ae88",
    };
  }

  function startWalk() {
    if (!world) world = makeWorld(1000 + state.pathsWalked * 97);
    walkRunning = true;
    resizeWalk();
    cancelAnimationFrame(walkRaf);
    loopWalk();
  }

  function stopWalk() {
    walkRunning = false;
    cancelAnimationFrame(walkRaf);
  }

  function resizeWalk() {
    const stage = document.getElementById("walk-stage");
    const w = stage.clientWidth || 900;
    const h = Math.min(420, Math.max(280, Math.round(w * 0.42)));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (world) world.groundY = h * 0.72;
  }

  window.addEventListener("resize", () => {
    if (walkRunning) resizeWalk();
  });

  function loopWalk() {
    if (!walkRunning) return;
    updateWalk();
    drawWalk();
    walkRaf = requestAnimationFrame(loopWalk);
  }

  function updateWalk() {
    if (!world) return;
    world.time += 1;
    const speed = 3.2;
    if (keys.left) {
      world.playerX -= speed;
      world.playerFacing = -1;
    }
    if (keys.right) {
      world.playerX += speed;
      world.playerFacing = 1;
    }
    world.playerX = Math.max(60, Math.min(world.width - 60, world.playerX));

    const viewW = canvas.clientWidth || 900;
    world.camX = world.playerX - viewW * 0.35;
    world.camX = Math.max(0, Math.min(world.width - viewW, world.camX));

    // 拾取
    for (const it of world.items) {
      if (it.taken) continue;
      if (Math.abs(it.x - world.playerX) < 36) {
        it.taken = true;
        world.collected++;
        addItem(it.id, 1);
        const def = ITEMS[it.id];
        showPickup(`${def.emoji} 捡到了 ${def.name}`);
        toast(`${def.emoji} 背包 +1 ${def.name}`);
        sfx("pickup");
        // 种子提示
        if (def.seed && PLANTS[def.seed]) {
          // 收集物本身可种
        }
      }
    }
  }

  function showPickup(text) {
    const el = document.getElementById("pickup-toast");
    el.hidden = false;
    el.textContent = text;
    clearTimeout(showPickup._t);
    showPickup._t = setTimeout(() => {
      el.hidden = true;
    }, 1400);
  }

  
  function drawWeather(ctx, w, h, themeId, time) {
    if (themeId === "riverside") {
      ctx.strokeStyle = "rgba(200,220,240,0.35)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 12; i++) {
        const x = ((i * 73 + time * 0.4) % (w + 20)) - 10;
        const y = (i * 37 + time * 0.8) % h;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 2, y + 10);
        ctx.stroke();
      }
    } else if (themeId === "starlight") {
      ctx.fillStyle = "rgba(255,250,220,0.7)";
      for (let i = 0; i < 18; i++) {
        const x = (i * 97) % w;
        const y = (i * 53) % (h * 0.45);
        const tw = 0.5 + 0.5 * Math.sin(time * 0.05 + i);
        ctx.globalAlpha = 0.3 + tw * 0.5;
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (themeId === "bamboo") {
      ctx.fillStyle = "rgba(40,60,40,0.06)";
      for (let i = 0; i < 8; i++) {
        const x = (i * w) / 8 + Math.sin(time * 0.02 + i) * 4;
        ctx.fillRect(x, 0, 10, h * 0.7);
      }
    } else if (themeId === "rain_eaves") {
      ctx.strokeStyle = "rgba(160,180,200,0.4)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 16; i++) {
        const x = ((i * 61 + time * 0.7) % (w + 10)) - 5;
        const y = (i * 29 + time * 1.1) % h;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 1, y + 12);
        ctx.stroke();
      }
    } else if (themeId === "lantern_street") {
      for (let i = 0; i < 7; i++) {
        const x = 40 + i * (w / 7);
        const y = 30 + (i % 2) * 12;
        ctx.fillStyle = "rgba(255, 160, 80, 0.35)";
        ctx.beginPath();
        ctx.ellipse(x, y, 6, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(120,60,40,0.3)";
        ctx.beginPath();
        ctx.moveTo(x, y + 9);
        ctx.lineTo(x, y + 18);
        ctx.stroke();
      }
    } else if (themeId === "harbor") {
      ctx.strokeStyle = "rgba(180,200,220,0.25)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const y = h * 0.72 + Math.sin(time * 0.04 + i) * 3;
        ctx.beginPath();
        ctx.moveTo(0, y + i * 3);
        ctx.quadraticCurveTo(w * 0.5, y + i * 3 + 4, w, y + i * 3);
        ctx.stroke();
      }
    } else if (themeId === "meadow") {
      ctx.fillStyle = "rgba(255, 240, 180, 0.35)";
      for (let i = 0; i < 10; i++) {
        const x = (i * 89 + time * 0.15) % w;
        const y = h * 0.55 + Math.sin(time * 0.03 + i) * 6;
        ctx.beginPath();
        ctx.ellipse(x, y, 3, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "flower_alley") {
      // soft petal confetti drift
      for (let i = 0; i < 14; i++) {
        const x = ((i * 67 + time * 0.35) % (w + 30)) - 15;
        const y = ((i * 41 + time * 0.22) % (h * 0.7));
        const rot = Math.sin(time * 0.03 + i) * 0.6;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.fillStyle = i % 3 === 0
          ? "rgba(240, 140, 170, 0.45)"
          : i % 3 === 1
            ? "rgba(255, 200, 210, 0.4)"
            : "rgba(200, 140, 200, 0.35)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (themeId === "book_yard") {
      // soft floating paper flecks
      ctx.fillStyle = "rgba(232, 220, 200, 0.35)";
      for (let i = 0; i < 10; i++) {
        const x = ((i * 83 + time * 0.18) % (w + 20)) - 10;
        const y = 20 + ((i * 47 + time * 0.12) % (h * 0.5));
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(time * 0.02 + i) * 0.4);
        ctx.fillRect(-5, -3, 10, 6);
        ctx.restore();
      }
    } else if (themeId === "plum_grove") {
      for (let i = 0; i < 12; i++) {
        const x = ((i * 71 + time * 0.28) % (w + 24)) - 12;
        const y = ((i * 39 + time * 0.2) % (h * 0.65));
        ctx.fillStyle = i % 2 === 0 ? "rgba(240,170,190,0.4)" : "rgba(255,220,230,0.35)";
        ctx.beginPath();
        ctx.ellipse(x, y, 3.5, 2.2, Math.sin(time * 0.03 + i), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "mist_bridge") {
      // soft fog bands
      for (let i = 0; i < 5; i++) {
        const y = h * 0.35 + i * 18 + Math.sin(time * 0.02 + i) * 4;
        ctx.fillStyle = "rgba(220,228,235," + (0.08 + i * 0.03) + ")";
        ctx.beginPath();
        ctx.ellipse(w * 0.5, y, w * 0.55, 16, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "firefly_field") {
      ctx.fillStyle = "rgba(220,255,160,0.75)";
      for (let i = 0; i < 16; i++) {
        const x = (i * 59 + Math.sin(time * 0.04 + i) * 20 + time * 0.15) % w;
        const y = h * 0.4 + ((i * 37 + time * 0.25) % (h * 0.45));
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(time * 0.08 + i));
        ctx.globalAlpha = tw;
        ctx.beginPath();
        ctx.arc(x, y, 1.5 + tw, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (themeId === "night_market") {
      // warm stall glows
      for (let i = 0; i < 6; i++) {
        const x = 30 + i * (w / 6);
        const y = h * 0.42 + (i % 2) * 10;
        const g = ctx.createRadialGradient(x, y, 2, x, y, 28);
        g.addColorStop(0, "rgba(255,180,80,0.35)");
        g.addColorStop(1, "rgba(255,120,40,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 28, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "stone_garden") {
      // soft rake lines in sand
      ctx.strokeStyle = "rgba(180,170,150,0.25)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const y = h * 0.55 + i * 8 + Math.sin(time * 0.01 + i) * 1.5;
        ctx.beginPath();
        ctx.moveTo(20, y);
        for (let x = 20; x < w - 20; x += 20) {
          ctx.lineTo(x + 10, y + Math.sin(x * 0.05 + time * 0.02) * 2);
        }
        ctx.stroke();
      }
    } else if (themeId === "snow_lantern") {
      // soft snow flakes + warm lantern dots
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      for (let i = 0; i < 20; i++) {
        const x = ((i * 53 + time * 0.3) % (w + 10)) - 5;
        const y = ((i * 41 + time * 0.45) % h);
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 5; i++) {
        const x = 50 + i * (w / 5);
        const y = 40 + (i % 2) * 14;
        ctx.fillStyle = "rgba(255,180,100,0.3)";
        ctx.beginPath();
        ctx.ellipse(x, y, 7, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "dawn_bridge") {
      // soft horizontal mist bands + warm horizon glow
      const glow = ctx.createLinearGradient(0, h * 0.35, 0, h * 0.7);
      glow.addColorStop(0, "rgba(255,180,120,0.12)");
      glow.addColorStop(1, "rgba(255,200,150,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, h * 0.3, w, h * 0.4);
      ctx.fillStyle = "rgba(230,235,240,0.12)";
      for (let i = 0; i < 4; i++) {
        const y = h * 0.5 + i * 14 + Math.sin(time * 0.02 + i) * 3;
        ctx.beginPath();
        ctx.ellipse(w * 0.5, y, w * 0.48, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "cloud_pass") {
      // drifting soft cloud blobs
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      for (let i = 0; i < 6; i++) {
        const x = ((i * 110 + time * 0.25) % (w + 80)) - 40;
        const y = 40 + (i % 3) * 28 + Math.sin(time * 0.015 + i) * 6;
        ctx.beginPath();
        ctx.ellipse(x, y, 36 + (i % 3) * 8, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 20, y + 4, 28, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "tide_pool") {
      // soft ripple rings near ground
      ctx.strokeStyle = "rgba(180,210,220,0.25)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const cx = 80 + i * (w / 5);
        const cy = h * 0.72 + Math.sin(time * 0.03 + i) * 4;
        const r = 8 + (time * 0.4 + i * 12) % 28;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (themeId === "cicada_grove") {
      // soft leaf flecks drifting
      ctx.fillStyle = "rgba(120,160,80,0.35)";
      for (let i = 0; i < 12; i++) {
        const x = ((i * 71 + time * 0.35) % (w + 20)) - 10;
        const y = 30 + ((i * 47 + time * 0.2) % (h * 0.55));
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(time * 0.03 + i) * 0.8);
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (themeId === "moon_well") {
      // soft moon glow + well-ring glints
      const mx = w * 0.78;
      const my = h * 0.22;
      const mg = ctx.createRadialGradient(mx, my, 4, mx, my, 50);
      mg.addColorStop(0, "rgba(240,245,255,0.55)");
      mg.addColorStop(1, "rgba(200,210,230,0)");
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(mx, my, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(180,200,220,0.2)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(w * 0.35, h * 0.7, 40, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(200,220,240,0.15)";
      ctx.beginPath();
      ctx.ellipse(w * 0.35, h * 0.7, 28, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (themeId === "reed_bank") {
      // soft vertical reed silhouettes
      ctx.strokeStyle = "rgba(90,110,70,0.25)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 14; i++) {
        const x = 20 + i * (w / 14) + Math.sin(time * 0.02 + i) * 3;
        ctx.beginPath();
        ctx.moveTo(x, h * 0.45);
        ctx.quadraticCurveTo(x + 4, h * 0.6, x - 2, h * 0.78);
        ctx.stroke();
      }
    } else if (themeId === "star_dock") {
      // water glints + stars
      ctx.fillStyle = "rgba(255,250,220,0.7)";
      for (let i = 0; i < 16; i++) {
        const x = (i * 57) % w;
        const y = (i * 37) % (h * 0.4);
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(time * 0.05 + i));
        ctx.globalAlpha = tw;
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(180,200,220,0.2)";
      for (let i = 0; i < 4; i++) {
        const y = h * 0.75 + Math.sin(time * 0.04 + i) * 2;
        ctx.beginPath();
        ctx.moveTo(0, y + i * 4);
        ctx.quadraticCurveTo(w * 0.5, y + i * 4 + 3, w, y + i * 4);
        ctx.stroke();
      }
    } else if (themeId === "moss_steps") {
      // soft stepped terraces + moss glints
      ctx.fillStyle = "rgba(70,100,70,0.12)";
      for (let i = 0; i < 5; i++) {
        const y = h * 0.48 + i * (h * 0.07);
        const inset = i * 18;
        ctx.beginPath();
        ctx.moveTo(inset, y);
        ctx.lineTo(w - inset, y);
        ctx.lineTo(w - inset - 10, y + h * 0.055);
        ctx.lineTo(inset + 10, y + h * 0.055);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "rgba(120,180,100,0.35)";
      for (let i = 0; i < 18; i++) {
        const x = (i * 53 + Math.sin(time * 0.02 + i) * 4) % w;
        const y = h * 0.52 + ((i * 29) % (h * 0.35));
        ctx.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(time * 0.03 + i));
        ctx.beginPath();
        ctx.ellipse(x, y, 3.5, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (themeId === "ink_courtyard") {
      // soft ink wash blotches + floating paper flecks
      for (let i = 0; i < 6; i++) {
        const x = (i * 97 + time * 0.15) % (w + 40) - 20;
        const y = h * 0.2 + (i % 3) * (h * 0.18);
        const rg = ctx.createRadialGradient(x, y, 2, x, y, 36);
        rg.addColorStop(0, "rgba(40,45,55,0.18)");
        rg.addColorStop(1, "rgba(40,45,55,0)");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(x, y, 36, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(240,235,220,0.45)";
      for (let i = 0; i < 10; i++) {
        const x = (i * 71 + Math.sin(time * 0.03 + i) * 8) % w;
        const y = (i * 43 + time * 0.2) % (h * 0.7);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(time * 0.02 + i) * 0.5);
        ctx.fillRect(-4, -2.5, 8, 5);
        ctx.restore();
      }
    } else if (themeId === "lotus_pond") {
      // soft lily pads + water rings
      ctx.fillStyle = "rgba(60,120,90,0.28)";
      for (let i = 0; i < 8; i++) {
        const x = 40 + i * (w / 8) + Math.sin(time * 0.02 + i) * 6;
        const y = h * 0.62 + (i % 2) * 18;
        ctx.beginPath();
        ctx.ellipse(x, y, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(180,220,230,0.25)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const x = w * (0.25 + i * 0.18);
        const y = h * 0.7;
        const r = 8 + (time * 0.4 + i * 12) % 28;
        ctx.globalAlpha = 0.35 * (1 - r / 40);
        ctx.beginPath();
        ctx.ellipse(x, y, r * 1.6, r * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (themeId === "wind_chime") {
      // hanging chime arcs + soft petal dots
      ctx.strokeStyle = "rgba(200,210,220,0.35)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 7; i++) {
        const x = 50 + i * (w / 7);
        const sway = Math.sin(time * 0.05 + i) * 6;
        ctx.beginPath();
        ctx.moveTo(x, h * 0.12);
        ctx.lineTo(x + sway, h * 0.28);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + sway, h * 0.32, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,200,160,0.45)";
      for (let i = 0; i < 12; i++) {
        const x = (i * 67 + time * 0.3) % w;
        const y = h * 0.4 + ((i * 41 + time * 0.2) % (h * 0.4));
        ctx.globalAlpha = 0.3 + 0.4 * Math.abs(Math.sin(time * 0.04 + i));
        ctx.beginPath();
        ctx.ellipse(x, y, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (themeId === "tea_terrace") {
      // stone terrace bands + soft steam wisps
      ctx.fillStyle = "rgba(90,100,80,0.14)";
      for (let i = 0; i < 4; i++) {
        const y = h * 0.55 + i * 16;
        ctx.fillRect(w * 0.15, y, w * 0.7, 10);
      }
      ctx.strokeStyle = "rgba(220,230,210,0.28)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) {
        const x = w * 0.3 + i * (w * 0.1);
        const baseY = h * 0.48;
        ctx.beginPath();
        ctx.moveTo(x, baseY);
        ctx.quadraticCurveTo(
          x + Math.sin(time * 0.04 + i) * 8,
          baseY - 20 - (time * 0.3 + i * 5) % 18,
          x + 4,
          baseY - 35 - (time * 0.2 + i) % 10
        );
        ctx.stroke();
      }
    } else if (themeId === "rain_garden") {
      // soft diagonal rain + puddle glints
      ctx.strokeStyle = "rgba(180,200,220,0.28)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 40; i++) {
        const x = (i * 37 + time * 2.2) % (w + 20) - 10;
        const y = (i * 53 + time * 3.5) % (h + 20) - 10;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 4, y + 14);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(160,190,200,0.2)";
      for (let i = 0; i < 6; i++) {
        const x = 30 + i * (w / 6);
        const y = h * 0.72 + Math.sin(time * 0.05 + i) * 2;
        ctx.beginPath();
        ctx.ellipse(x, y, 18, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "orchard_dusk") {
      // warm falling leaves + soft fruit glows
      ctx.fillStyle = "rgba(220,120,70,0.4)";
      for (let i = 0; i < 14; i++) {
        const x = (i * 61 + time * 0.6) % w;
        const y = (i * 47 + time * 0.8) % (h * 0.75);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(time * 0.03 + i) * 0.8);
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = "rgba(200,60,50,0.25)";
      for (let i = 0; i < 5; i++) {
        const x = w * (0.2 + i * 0.15);
        const y = h * 0.35 + Math.sin(time * 0.02 + i) * 3;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "rose_lane") {
      // soft rose petals drifting in narrow lane
      ctx.fillStyle = "rgba(200,80,110,0.4)";
      for (let i = 0; i < 16; i++) {
        const x = w * 0.25 + ((i * 29 + time * 0.4) % (w * 0.5));
        const y = (i * 43 + time * 0.7) % (h * 0.8);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(time * 0.04 + i));
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // lane walls hint
      ctx.fillStyle = "rgba(80,40,50,0.08)";
      ctx.fillRect(0, 0, w * 0.12, h);
      ctx.fillRect(w * 0.88, 0, w * 0.12, h);
    } else if (themeId === "cliff_path") {
      // horizon wind streaks + rock dots
      ctx.strokeStyle = "rgba(200,210,220,0.22)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const y = h * 0.2 + i * 12 + Math.sin(time * 0.03 + i) * 3;
        ctx.beginPath();
        ctx.moveTo(w * 0.15, y);
        ctx.lineTo(w * 0.85, y + Math.sin(time * 0.05 + i) * 4);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(90,90,85,0.35)";
      for (let i = 0; i < 10; i++) {
        const x = 20 + i * (w / 10);
        const y = h * 0.68 + (i % 3) * 8;
        ctx.beginPath();
        ctx.ellipse(x, y, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "willow_bank") {
      // hanging willow arcs + floating catkins
      ctx.strokeStyle = "rgba(80,120,70,0.28)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 10; i++) {
        const x = 30 + i * (w / 10);
        const sway = Math.sin(time * 0.04 + i) * 10;
        ctx.beginPath();
        ctx.moveTo(x, h * 0.1);
        ctx.quadraticCurveTo(x + sway, h * 0.35, x + sway * 0.5, h * 0.55);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(245,245,240,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = (i * 53 + time * 0.5) % w;
        const y = (i * 37 + time * 0.3) % (h * 0.7);
        ctx.globalAlpha = 0.35 + 0.35 * Math.abs(Math.sin(time * 0.03 + i));
        ctx.beginPath();
        ctx.ellipse(x, y, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (themeId === "night_pond") {
      // dark water sheen + soft firefly dots
      ctx.fillStyle = "rgba(30,50,70,0.25)";
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.72, w * 0.4, h * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(120,160,180,0.2)";
      for (let i = 0; i < 3; i++) {
        const y = h * 0.68 + i * 6 + Math.sin(time * 0.04 + i) * 1.5;
        ctx.beginPath();
        ctx.ellipse(w * 0.5, y, w * 0.35 - i * 10, 8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,240,160,0.7)";
      for (let i = 0; i < 12; i++) {
        const x = (i * 71 + Math.sin(time * 0.05 + i) * 20) % w;
        const y = h * 0.25 + ((i * 39) % (h * 0.4));
        ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(time * 0.06 + i));
        ctx.beginPath();
        ctx.arc(x, y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (themeId === "chrys_garden") {
      // soft chrysanthemum orbs + warm dust
      ctx.fillStyle = "rgba(230,190,80,0.35)";
      for (let i = 0; i < 12; i++) {
        const x = 40 + (i * 70 + Math.sin(time * 0.02 + i) * 8) % (w - 80);
        const y = h * 0.45 + (i % 4) * 28;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(240,200,120,0.4)";
      for (let i = 0; i < 16; i++) {
        const x = (i * 47 + time * 0.4) % w;
        const y = (i * 31 + time * 0.2) % (h * 0.6);
        ctx.globalAlpha = 0.25 + 0.4 * Math.abs(Math.sin(time * 0.04 + i));
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (themeId === "osmanthus_court") {
      // warm courtyard glow + falling golden dots
      const g = ctx.createRadialGradient(w * 0.5, h * 0.3, 10, w * 0.5, h * 0.3, 90);
      g.addColorStop(0, "rgba(255,200,100,0.2)");
      g.addColorStop(1, "rgba(255,200,100,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.3, 90, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(230,180,60,0.55)";
      for (let i = 0; i < 18; i++) {
        const x = (i * 53 + time * 0.35) % w;
        const y = (i * 41 + time * 0.55) % (h * 0.75);
        ctx.globalAlpha = 0.3 + 0.4 * Math.abs(Math.sin(time * 0.04 + i));
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (themeId === "seaside_dusk") {
      // soft wave lines + salt sparkles
      ctx.strokeStyle = "rgba(180,210,220,0.28)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) {
        const y = h * 0.65 + i * 8 + Math.sin(time * 0.05 + i) * 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.quadraticCurveTo(w * 0.5, y + 6, w, y);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,255,240,0.55)";
      for (let i = 0; i < 20; i++) {
        const x = (i * 47 + time * 0.8) % w;
        const y = h * 0.55 + ((i * 23) % (h * 0.3));
        ctx.globalAlpha = 0.25 + 0.4 * Math.abs(Math.sin(time * 0.07 + i));
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (themeId === "lantern_bridge") {
      // hanging lantern glows along a bridge arc
      for (let i = 0; i < 8; i++) {
        const t = i / 7;
        const x = w * (0.12 + t * 0.76);
        const y = h * 0.28 + Math.sin(t * Math.PI) * (h * 0.12);
        const rg = ctx.createRadialGradient(x, y, 2, x, y, 18);
        rg.addColorStop(0, "rgba(255,180,80,0.55)");
        rg.addColorStop(1, "rgba(255,120,40,0)");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,200,100,0.7)";
        ctx.beginPath();
        ctx.arc(x, y + Math.sin(time * 0.05 + i) * 1.5, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(120,100,80,0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.1, h * 0.55);
      ctx.quadraticCurveTo(w * 0.5, h * 0.42, w * 0.9, h * 0.55);
      ctx.stroke();
    } else if (themeId === "pine_ridge") {
      // soft pine silhouettes + needle drift
      ctx.strokeStyle = "rgba(40,70,50,0.3)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        const x = 30 + i * (w / 9);
        ctx.beginPath();
        ctx.moveTo(x, h * 0.75);
        ctx.lineTo(x - 8, h * 0.45);
        ctx.lineTo(x + 8, h * 0.45);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(90,120,80,0.4)";
      for (let i = 0; i < 16; i++) {
        const x = (i * 59 + time * 0.4) % w;
        const y = (i * 37 + time * 0.6) % (h * 0.7);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(time * 0.03 + i));
        ctx.fillRect(-4, -1, 8, 2);
        ctx.restore();
      }
    } else if (themeId === "plum_path") {
      // soft plum blossom petals
      ctx.fillStyle = "rgba(220,160,200,0.45)";
      for (let i = 0; i < 20; i++) {
        const x = (i * 51 + time * 0.5) % w;
        const y = (i * 33 + time * 0.35) % (h * 0.8);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(time * 0.04 + i));
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (themeId === "mulberry_lane") {
      // dappled shade + purple fruit dots
      ctx.fillStyle = "rgba(40,70,40,0.12)";
      for (let i = 0; i < 6; i++) {
        const x = 40 + i * (w / 6);
        ctx.beginPath();
        ctx.ellipse(x, h * 0.35, 40, 20, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(100,40,120,0.45)";
      for (let i = 0; i < 14; i++) {
        const x = (i * 57 + Math.sin(time * 0.02 + i) * 6) % w;
        const y = h * 0.4 + ((i * 29) % (h * 0.35));
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "berry_patch") {
      // soft row ridges + red berry dots
      ctx.fillStyle = "rgba(80,100,60,0.15)";
      for (let i = 0; i < 5; i++) {
        const y = h * 0.5 + i * 14;
        ctx.fillRect(20, y, w - 40, 8);
      }
      ctx.fillStyle = "rgba(200,50,60,0.5)";
      for (let i = 0; i < 18; i++) {
        const x = 30 + (i * 47 + Math.sin(time * 0.03 + i) * 4) % (w - 60);
        const y = h * 0.48 + ((i * 17) % 60);
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "fog_meadow") {
      // soft fog banks + grass tips
      for (let i = 0; i < 4; i++) {
        const y = h * (0.45 + i * 0.1);
        const rg = ctx.createLinearGradient(0, y, 0, y + 40);
        rg.addColorStop(0, "rgba(220,230,230,0.2)");
        rg.addColorStop(1, "rgba(220,230,230,0)");
        ctx.fillStyle = rg;
        ctx.fillRect(0, y, w, 40);
      }
      ctx.strokeStyle = "rgba(100,130,80,0.2)";
      for (let i = 0; i < 20; i++) {
        const x = (i * 43 + Math.sin(time * 0.02 + i) * 3) % w;
        ctx.beginPath();
        ctx.moveTo(x, h * 0.7);
        ctx.lineTo(x + 1, h * 0.55);
        ctx.stroke();
      }
    } else if (themeId === "vine_terrace") {
      // terrace steps + hanging grape clusters
      ctx.fillStyle = "rgba(90,100,70,0.14)";
      for (let i = 0; i < 5; i++) {
        const y = h * 0.45 + i * 18;
        const inset = i * 12;
        ctx.fillRect(inset, y, w - inset * 2, 12);
      }
      ctx.fillStyle = "rgba(90,40,120,0.45)";
      for (let i = 0; i < 12; i++) {
        const x = 40 + i * (w / 12);
        const y = h * 0.4 + (i % 3) * 20;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 3, y + 4, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "autumn_slope") {
      // warm falling maple leaves
      ctx.fillStyle = "rgba(210,100,40,0.45)";
      for (let i = 0; i < 18; i++) {
        const x = (i * 53 + time * 0.7) % w;
        const y = (i * 41 + time * 0.9) % (h * 0.8);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(time * 0.04 + i) * 1.2);
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (themeId === "fig_terrace") {
      // stone platform + large soft leaves
      ctx.fillStyle = "rgba(100,100,90,0.18)";
      ctx.fillRect(w * 0.15, h * 0.55, w * 0.7, 28);
      ctx.fillStyle = "rgba(60,90,50,0.3)";
      for (let i = 0; i < 8; i++) {
        const x = w * 0.25 + i * (w * 0.07);
        const y = h * 0.42 + Math.sin(time * 0.02 + i) * 3;
        ctx.beginPath();
        ctx.ellipse(x, y, 14, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "pomegranate_court") {
      // courtyard walls + red seed sparkles
      ctx.fillStyle = "rgba(80,40,50,0.1)";
      ctx.fillRect(0, 0, w * 0.12, h);
      ctx.fillRect(w * 0.88, 0, w * 0.12, h);
      ctx.fillStyle = "rgba(180,40,50,0.5)";
      for (let i = 0; i < 16; i++) {
        const x = w * 0.2 + ((i * 47 + time * 0.3) % (w * 0.6));
        const y = h * 0.35 + ((i * 29) % (h * 0.4));
        ctx.globalAlpha = 0.3 + 0.4 * Math.abs(Math.sin(time * 0.05 + i));
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (themeId === "rain_pavilion") {
      // pavilion roof silhouette + soft drip lines
      ctx.fillStyle = "rgba(40,50,60,0.2)";
      ctx.beginPath();
      ctx.moveTo(w * 0.2, h * 0.35);
      ctx.lineTo(w * 0.5, h * 0.22);
      ctx.lineTo(w * 0.8, h * 0.35);
      ctx.lineTo(w * 0.75, h * 0.38);
      ctx.lineTo(w * 0.25, h * 0.38);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(160,190,210,0.35)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 12; i++) {
        const x = w * 0.28 + i * (w * 0.04);
        const len = 8 + (time * 0.8 + i * 5) % 14;
        ctx.beginPath();
        ctx.moveTo(x, h * 0.38);
        ctx.lineTo(x - 1, h * 0.38 + len);
        ctx.stroke();
      }
    } else if (themeId === "dew_path") {
      // grass tips with dew glints
      ctx.strokeStyle = "rgba(90,130,80,0.25)";
      for (let i = 0; i < 24; i++) {
        const x = (i * 37 + Math.sin(time * 0.02 + i) * 2) % w;
        ctx.beginPath();
        ctx.moveTo(x, h * 0.72);
        ctx.lineTo(x + 1, h * 0.55);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(200,230,240,0.55)";
      for (let i = 0; i < 18; i++) {
        const x = (i * 53 + time * 0.15) % w;
        const y = h * 0.52 + ((i * 19) % (h * 0.2));
        ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(time * 0.04 + i));
        ctx.beginPath();
        ctx.arc(x, y, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (themeId === "litchi_grove") {
      // canopy shade + red fruit dots
      ctx.fillStyle = "rgba(30,60,40,0.15)";
      for (let i = 0; i < 5; i++) {
        const x = 50 + i * (w / 5);
        ctx.beginPath();
        ctx.ellipse(x, h * 0.32, 50, 25, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(200,50,60,0.45)";
      for (let i = 0; i < 14; i++) {
        const x = 40 + (i * 55 + Math.sin(time * 0.02 + i) * 4) % (w - 80);
        const y = h * 0.38 + ((i * 23) % 40);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "loquat_lane") {
      // warm yellow fruit glows + soft alley walls
      ctx.fillStyle = "rgba(80,70,40,0.1)";
      ctx.fillRect(0, 0, w * 0.1, h);
      ctx.fillRect(w * 0.9, 0, w * 0.1, h);
      ctx.fillStyle = "rgba(220,160,40,0.45)";
      for (let i = 0; i < 12; i++) {
        const x = w * 0.2 + (i * 50 + Math.sin(time * 0.03 + i) * 5) % (w * 0.6);
        const y = h * 0.4 + ((i * 27) % 50);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "olive_grove") {
      // silvery leaves + soft green fruits
      ctx.fillStyle = "rgba(140,160,120,0.25)";
      for (let i = 0; i < 10; i++) {
        const x = 30 + i * (w / 10);
        const y = h * 0.35 + Math.sin(time * 0.02 + i) * 4;
        ctx.beginPath();
        ctx.ellipse(x, y, 12, 6, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(80,110,50,0.4)";
      for (let i = 0; i < 14; i++) {
        const x = 40 + (i * 49) % (w - 80);
        const y = h * 0.48 + ((i * 21) % 40);
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "hawthorn_path") {
      // red berry strings sway
      ctx.strokeStyle = "rgba(120,40,40,0.3)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const x = 40 + i * (w / 8);
        const sway = Math.sin(time * 0.04 + i) * 5;
        ctx.beginPath();
        ctx.moveTo(x, h * 0.2);
        ctx.lineTo(x + sway, h * 0.45);
        ctx.stroke();
        ctx.fillStyle = "rgba(200,40,50,0.5)";
        for (let j = 0; j < 4; j++) {
          ctx.beginPath();
          ctx.arc(x + sway * 0.3, h * 0.28 + j * 8, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (themeId === "mango_shade") {
      // deep canopy + golden fruit
      ctx.fillStyle = "rgba(40,70,30,0.18)";
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.3, w * 0.35, h * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(230,160,30,0.5)";
      for (let i = 0; i < 10; i++) {
        const x = w * 0.3 + (i * 40 + Math.sin(time * 0.02 + i) * 4) % (w * 0.4);
        const y = h * 0.35 + ((i * 17) % 35);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "sand_dune") {
      // dune curves + sand sparkles
      ctx.strokeStyle = "rgba(200,160,100,0.35)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const y = h * 0.55 + i * 12;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.quadraticCurveTo(w * 0.5, y - 15 - i * 3, w, y + 5);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,230,160,0.4)";
      for (let i = 0; i < 20; i++) {
        const x = (i * 47 + time * 0.5) % w;
        const y = h * 0.5 + ((i * 23) % (h * 0.35));
        ctx.globalAlpha = 0.25 + 0.4 * Math.abs(Math.sin(time * 0.06 + i));
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (themeId === "lagoon_path") {
      // shallow water bands + soft palm sway
      ctx.fillStyle = "rgba(80,160,170,0.2)";
      for (let i = 0; i < 3; i++) {
        const y = h * 0.62 + i * 10 + Math.sin(time * 0.04 + i) * 2;
        ctx.beginPath();
        ctx.ellipse(w * 0.5, y, w * 0.4, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(60,100,50,0.3)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const x = w * (0.2 + i * 0.2);
        const sway = Math.sin(time * 0.03 + i) * 6;
        ctx.beginPath();
        ctx.moveTo(x, h * 0.75);
        ctx.quadraticCurveTo(x + sway, h * 0.5, x + sway * 0.5, h * 0.25);
        ctx.stroke();
      }
    } else if (themeId === "starfruit_lane") {
      // soft star-shaped glints
      ctx.fillStyle = "rgba(255,220,100,0.5)";
      for (let i = 0; i < 12; i++) {
        const x = 40 + (i * 55 + Math.sin(time * 0.03 + i) * 6) % (w - 80);
        const y = h * 0.35 + ((i * 29) % (h * 0.4));
        const r = 4 + Math.sin(time * 0.05 + i);
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const a = (k * 4 * Math.PI) / 5 - Math.PI / 2;
          const px = x + Math.cos(a) * r;
          const py = y + Math.sin(a) * r;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
    } else if (themeId === "kumquat_hedge") {
      // hedge wall + orange fruit dots
      ctx.fillStyle = "rgba(50,80,40,0.2)";
      ctx.fillRect(0, h * 0.35, w, h * 0.2);
      ctx.fillStyle = "rgba(230,140,30,0.55)";
      for (let i = 0; i < 20; i++) {
        const x = 20 + (i * 42 + Math.sin(time * 0.02 + i) * 3) % (w - 40);
        const y = h * 0.4 + ((i * 13) % 30);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "passion_arch") {
      // vine arch + purple passion fruit orbs
      ctx.strokeStyle = "rgba(70,90,50,0.35)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const cx = 40 + i * (w / 6);
        ctx.beginPath();
        ctx.moveTo(cx - 30, h * 0.55);
        ctx.quadraticCurveTo(cx, h * 0.22 + Math.sin(time * 0.03 + i) * 4, cx + 30, h * 0.55);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(140,70,160,0.55)";
      for (let i = 0; i < 18; i++) {
        const x = 30 + (i * 48 + Math.sin(time * 0.025 + i) * 4) % (w - 50);
        const y = h * 0.28 + ((i * 17) % 40) + Math.sin(time * 0.04 + i * 0.7) * 2;
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "kiwi_trellis") {
      // wooden trellis bars + brown-green kiwi ovals
      ctx.strokeStyle = "rgba(90,70,40,0.4)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const x = 20 + i * (w / 8);
        ctx.beginPath();
        ctx.moveTo(x, h * 0.25);
        ctx.lineTo(x + 8, h * 0.55);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(60,90,50,0.3)";
      for (let i = 0; i < 5; i++) {
        const y = h * 0.3 + i * 12;
        ctx.beginPath();
        ctx.moveTo(10, y);
        ctx.lineTo(w - 10, y + Math.sin(time * 0.02 + i) * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(120,140,50,0.55)";
      for (let i = 0; i < 16; i++) {
        const x = 25 + (i * 52 + Math.sin(time * 0.02 + i) * 3) % (w - 45);
        const y = h * 0.32 + ((i * 19) % 45);
        ctx.beginPath();
        ctx.ellipse(x, y, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "dragon_cactus") {
      // cactus silhouettes + pink dragonfruit dots
      ctx.fillStyle = "rgba(50,90,60,0.25)";
      for (let i = 0; i < 7; i++) {
        const x = 30 + i * (w / 7);
        const bh = 40 + (i % 3) * 12;
        ctx.fillRect(x - 4, h * 0.55 - bh, 8, bh);
        ctx.fillRect(x - 14, h * 0.45 - (i % 2) * 8, 10, 6);
        ctx.fillRect(x + 4, h * 0.48 - (i % 3) * 6, 10, 6);
      }
      ctx.fillStyle = "rgba(220,100,140,0.55)";
      for (let i = 0; i < 16; i++) {
        const x = 25 + (i * 50 + Math.sin(time * 0.02 + i) * 3) % (w - 45);
        const y = h * 0.3 + ((i * 17) % 50) + Math.sin(time * 0.03 + i) * 2;
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "guava_grove") {
      // soft canopy + pale green guava ovals
      ctx.fillStyle = "rgba(40,80,50,0.18)";
      ctx.beginPath();
      ctx.ellipse(w * 0.3, h * 0.28, 90, 35, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.65, h * 0.26, 100, 40, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(150,180,90,0.5)";
      for (let i = 0; i < 18; i++) {
        const x = 20 + (i * 48 + Math.sin(time * 0.02 + i) * 4) % (w - 40);
        const y = h * 0.35 + ((i * 15) % 40);
        ctx.beginPath();
        ctx.ellipse(x, y, 4, 3.2, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "cherry_lane") {
      // paired red cherries hanging
      ctx.strokeStyle = "rgba(60,90,50,0.35)";
      ctx.lineWidth = 1.5;
      ctx.fillStyle = "rgba(200,40,60,0.6)";
      for (let i = 0; i < 14; i++) {
        const x = 30 + (i * 58 + Math.sin(time * 0.02 + i) * 3) % (w - 50);
        const y = h * 0.28 + ((i * 13) % 35);
        ctx.beginPath();
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x - 4, y);
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x + 4, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x - 4, y + 2, 3, 0, Math.PI * 2);
        ctx.arc(x + 4, y + 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "apricot_grove") {
      // soft petals + apricot orbs
      ctx.fillStyle = "rgba(240,210,180,0.35)";
      for (let i = 0; i < 22; i++) {
        const x = (i * 41 + time * 0.15 + Math.sin(i) * 10) % w;
        const y = (h * 0.15 + (i * 23 + time * 0.08) % (h * 0.45));
        ctx.beginPath();
        ctx.ellipse(x, y, 3, 2, i * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(230,150,70,0.55)";
      for (let i = 0; i < 14; i++) {
        const x = 25 + (i * 55 + Math.sin(time * 0.02 + i) * 3) % (w - 45);
        const y = h * 0.38 + ((i * 17) % 40);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "pear_orchard") {
      // ordered tree trunks + pale pear ovals
      ctx.fillStyle = "rgba(70,50,30,0.25)";
      for (let i = 0; i < 8; i++) {
        const x = 40 + i * (w / 8);
        ctx.fillRect(x - 3, h * 0.35, 6, h * 0.2);
      }
      ctx.fillStyle = "rgba(40,90,50,0.2)";
      for (let i = 0; i < 8; i++) {
        const x = 40 + i * (w / 8);
        ctx.beginPath();
        ctx.ellipse(x, h * 0.32, 28, 18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(180,200,90,0.5)";
      for (let i = 0; i < 16; i++) {
        const x = 25 + (i * 50 + Math.sin(time * 0.02 + i) * 3) % (w - 45);
        const y = h * 0.3 + ((i * 17) % 45);
        ctx.beginPath();
        ctx.ellipse(x, y, 4, 5, 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "jujube_path") {
      // dry branch lines + brown-red jujube dots
      ctx.strokeStyle = "rgba(90,60,40,0.35)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 10; i++) {
        const x = 20 + i * (w / 10);
        ctx.beginPath();
        ctx.moveTo(x, h * 0.55);
        ctx.quadraticCurveTo(x + 10, h * 0.35 + Math.sin(time * 0.02 + i) * 4, x + 20, h * 0.25);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(160,60,40,0.55)";
      for (let i = 0; i < 18; i++) {
        const x = 25 + (i * 48 + Math.sin(time * 0.02 + i) * 3) % (w - 45);
        const y = h * 0.28 + ((i * 15) % 50);
        ctx.beginPath();
        ctx.arc(x, y, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "grapefruit_terrace") {
      // terrace rail + large soft orange orbs
      ctx.strokeStyle = "rgba(120,100,80,0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.48);
      ctx.lineTo(w, h * 0.48);
      ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const x = 15 + i * (w / 12);
        ctx.beginPath();
        ctx.moveTo(x, h * 0.48);
        ctx.lineTo(x, h * 0.55);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(230,120,70,0.5)";
      for (let i = 0; i < 12; i++) {
        const x = 30 + (i * 65 + Math.sin(time * 0.02 + i) * 3) % (w - 50);
        const y = h * 0.3 + ((i * 19) % 40);
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "tangerine_steps") {
      // stone steps silhouette + small orange clusters
      ctx.fillStyle = "rgba(100,90,80,0.2)";
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(0, h * 0.4 + i * 12, w * (0.55 + i * 0.08), 8);
      }
      ctx.fillStyle = "rgba(240,150,40,0.55)";
      for (let i = 0; i < 20; i++) {
        const x = 20 + (i * 44 + Math.sin(time * 0.025 + i) * 2) % (w - 40);
        const y = h * 0.28 + ((i * 11) % 50);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "wax_apple_lane") {
      // soft pink bell-shaped fruit
      ctx.fillStyle = "rgba(50,80,60,0.18)";
      ctx.beginPath();
      ctx.ellipse(w * 0.35, h * 0.28, 80, 30, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.7, h * 0.3, 70, 28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(220,120,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 30 + (i * 55 + Math.sin(time * 0.02 + i) * 3) % (w - 50);
        const y = h * 0.32 + ((i * 17) % 40);
        ctx.beginPath();
        ctx.moveTo(x, y - 5);
        ctx.quadraticCurveTo(x - 5, y + 2, x, y + 6);
        ctx.quadraticCurveTo(x + 5, y + 2, x, y - 5);
        ctx.fill();
      }
    } else if (themeId === "cane_field") {
      // tall cane stalks + leaf blades
      ctx.strokeStyle = "rgba(70,110,50,0.4)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 18; i++) {
        const x = 15 + i * (w / 18) + Math.sin(time * 0.03 + i) * 2;
        ctx.beginPath();
        ctx.moveTo(x, h * 0.55);
        ctx.lineTo(x + 4, h * 0.22);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(200,220,120,0.35)";
      for (let i = 0; i < 12; i++) {
        const x = 20 + (i * 60) % (w - 40);
        const y = h * 0.25 + Math.sin(time * 0.04 + i) * 3;
        ctx.beginPath();
        ctx.ellipse(x, y, 12, 3, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "lemon_grove") {
      // bright yellow fruit orbs + soft leaf canopy
      ctx.fillStyle = "rgba(50,100,40,0.18)";
      ctx.beginPath();
      ctx.ellipse(w * 0.3, h * 0.28, 85, 32, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.7, h * 0.26, 90, 34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(240,210,50,0.55)";
      for (let i = 0; i < 16; i++) {
        const x = 25 + (i * 52 + Math.sin(time * 0.02 + i) * 3) % (w - 45);
        const y = h * 0.32 + ((i * 17) % 42);
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "lime_path") {
      // small green citrus + minty dots
      ctx.fillStyle = "rgba(80,160,70,0.5)";
      for (let i = 0; i < 18; i++) {
        const x = 20 + (i * 48 + Math.sin(time * 0.025 + i) * 3) % (w - 40);
        const y = h * 0.3 + ((i * 15) % 48);
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(120,200,100,0.35)";
      for (let i = 0; i < 10; i++) {
        const x = 30 + (i * 70 + time * 0.1) % (w - 40);
        const y = h * 0.2 + (i % 3) * 8;
        ctx.beginPath();
        ctx.ellipse(x, y, 6, 2.5, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "vanilla_lane") {
      // soft cream petals + thin vanilla pods
      ctx.fillStyle = "rgba(240,230,200,0.4)";
      for (let i = 0; i < 20; i++) {
        const x = (i * 43 + time * 0.12) % w;
        const y = h * 0.18 + ((i * 19 + time * 0.05) % (h * 0.4));
        ctx.beginPath();
        ctx.ellipse(x, y, 3.5, 2, i * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(90,70,40,0.45)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 12; i++) {
        const x = 25 + (i * 60 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.35 + ((i * 13) % 40);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 8, y - 10, x + 4, y - 22);
        ctx.stroke();
      }
    } else if (themeId === "cocoa_courtyard") {
      // warm courtyard glow + brown cocoa pods
      ctx.fillStyle = "rgba(180,120,60,0.12)";
      ctx.fillRect(0, h * 0.25, w, h * 0.35);
      ctx.fillStyle = "rgba(90,50,30,0.55)";
      for (let i = 0; i < 14; i++) {
        const x = 30 + (i * 55 + Math.sin(time * 0.02 + i) * 3) % (w - 50);
        const y = h * 0.32 + ((i * 17) % 45);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      // soft lamp glow
      const gx = w * 0.75;
      const gy = h * 0.28;
      const g = ctx.createRadialGradient(gx, gy, 2, gx, gy, 40);
      g.addColorStop(0, "rgba(255,200,120,0.35)");
      g.addColorStop(1, "rgba(255,200,120,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(gx, gy, 40, 0, Math.PI * 2);
      ctx.fill();
    } else if (themeId === "almond_grove") {
      // pale tree silhouettes + light almond ovals
      ctx.fillStyle = "rgba(70,60,40,0.22)";
      for (let i = 0; i < 7; i++) {
        const x = 40 + i * (w / 7);
        ctx.fillRect(x - 3, h * 0.35, 6, h * 0.18);
        ctx.beginPath();
        ctx.ellipse(x, h * 0.32, 26, 16, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(220,200,160,0.5)";
      for (let i = 0; i < 16; i++) {
        const x = 25 + (i * 50 + Math.sin(time * 0.02 + i) * 3) % (w - 45);
        const y = h * 0.3 + ((i * 17) % 45);
        ctx.beginPath();
        ctx.ellipse(x, y, 3.5, 2.5, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "hazel_path") {
      // bushy undergrowth + round hazelnuts
      ctx.fillStyle = "rgba(50,70,40,0.2)";
      ctx.fillRect(0, h * 0.4, w, h * 0.15);
      ctx.fillStyle = "rgba(130,80,40,0.55)";
      for (let i = 0; i < 18; i++) {
        const x = 20 + (i * 46 + Math.sin(time * 0.02 + i) * 3) % (w - 40);
        const y = h * 0.35 + ((i * 14) % 45);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "maple_sugar_path") {
      // falling maple leaves + amber syrup glints
      ctx.fillStyle = "rgba(220,100,40,0.4)";
      for (let i = 0; i < 22; i++) {
        const x = (i * 41 + time * 0.2) % w;
        const y = (h * 0.12 + (i * 27 + time * 0.1) % (h * 0.5));
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3, i * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(230,160,50,0.45)";
      for (let i = 0; i < 10; i++) {
        const x = 30 + (i * 70 + Math.sin(time * 0.02 + i) * 4) % (w - 50);
        const y = h * 0.4 + ((i * 11) % 30);
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "sesame_field") {
      // ordered stalks + tiny white/black dots
      ctx.strokeStyle = "rgba(80,90,50,0.35)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 24; i++) {
        const x = 10 + i * (w / 24);
        ctx.beginPath();
        ctx.moveTo(x, h * 0.55);
        ctx.lineTo(x + Math.sin(time * 0.03 + i) * 2, h * 0.28);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(240,240,220,0.55)";
      for (let i = 0; i < 30; i++) {
        const x = 15 + (i * 28 + Math.sin(time * 0.02 + i) * 2) % (w - 30);
        const y = h * 0.28 + ((i * 9) % 40);
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "saffron_terrace") {
      // warm terrace rail + orange-red saffron threads
      ctx.strokeStyle = "rgba(120,90,60,0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5);
      ctx.lineTo(w, h * 0.5);
      ctx.stroke();
      ctx.strokeStyle = "rgba(220,100,40,0.55)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 20; i++) {
        const x = 20 + (i * 42 + Math.sin(time * 0.02 + i) * 3) % (w - 40);
        const y = h * 0.3 + ((i * 13) % 40);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 6 + Math.sin(time * 0.04 + i), y + 10);
        ctx.stroke();
      }
    } else if (themeId === "walnut_path") {
      // thick trunks + round brown walnuts
      ctx.fillStyle = "rgba(60,45,30,0.28)";
      for (let i = 0; i < 6; i++) {
        const x = 50 + i * (w / 6);
        ctx.fillRect(x - 5, h * 0.32, 10, h * 0.22);
      }
      ctx.fillStyle = "rgba(110,70,40,0.55)";
      for (let i = 0; i < 16; i++) {
        const x = 25 + (i * 52 + Math.sin(time * 0.02 + i) * 3) % (w - 45);
        const y = h * 0.32 + ((i * 17) % 45);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "pistachio_lane") {
      // soft green canopy + split pistachio ovals
      ctx.fillStyle = "rgba(60,100,50,0.18)";
      ctx.beginPath();
      ctx.ellipse(w * 0.35, h * 0.28, 80, 30, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.7, h * 0.3, 75, 28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(140,180,70,0.5)";
      for (let i = 0; i < 16; i++) {
        const x = 25 + (i * 52 + Math.sin(time * 0.02 + i) * 3) % (w - 45);
        const y = h * 0.34 + ((i * 15) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 4, 2.8, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(230,220,180,0.45)";
        ctx.beginPath();
        ctx.ellipse(x + 1, y - 1, 1.5, 1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(140,180,70,0.5)";
      }
    } else if (themeId === "chestnut_grove") {
      // dense canopy + spiky brown chestnuts
      ctx.fillStyle = "rgba(40,70,30,0.22)";
      ctx.fillRect(0, h * 0.22, w, h * 0.2);
      ctx.fillStyle = "rgba(120,70,30,0.55)";
      for (let i = 0; i < 14; i++) {
        const x = 30 + (i * 58 + Math.sin(time * 0.02 + i) * 3) % (w - 50);
        const y = h * 0.35 + ((i * 17) % 40);
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        // spikes
        ctx.strokeStyle = "rgba(80,50,20,0.4)";
        ctx.lineWidth = 1;
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7);
          ctx.stroke();
        }
      }
    } else if (themeId === "cinnamon_path") {
      // bark sticks + warm amber dust
      ctx.strokeStyle = "rgba(120,70,40,0.5)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 12; i++) {
        const x = 20 + (i * 65 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.35 + ((i * 11) % 40);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 10, y - 8, x + 4, y - 20);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(200,120,50,0.3)";
      for (let i = 0; i < 18; i++) {
        const x = (i * 47 + time * 0.1) % w;
        const y = h * 0.25 + ((i * 19) % 50);
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "clove_courtyard") {
      // courtyard glow + tiny clove nails
      ctx.fillStyle = "rgba(160,80,100,0.1)";
      ctx.fillRect(0, h * 0.28, w, h * 0.3);
      ctx.fillStyle = "rgba(100,50,40,0.55)";
      for (let i = 0; i < 20; i++) {
        const x = 20 + (i * 44 + Math.sin(time * 0.025 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 45);
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - 0.5, y - 6, 1, 5);
      }
    } else if (themeId === "cranberry_bog") {
      // soft bog sheen + red cranberry dots
      ctx.fillStyle = "rgba(60,80,90,0.15)";
      ctx.fillRect(0, h * 0.42, w, h * 0.15);
      ctx.fillStyle = "rgba(180,40,60,0.55)";
      for (let i = 0; i < 22; i++) {
        const x = 15 + (i * 40 + Math.sin(time * 0.02 + i) * 3) % (w - 30);
        const y = h * 0.38 + ((i * 11) % 40) + Math.sin(time * 0.03 + i) * 2;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "elder_lane") {
      // purple berry clusters
      ctx.fillStyle = "rgba(80,40,100,0.5)";
      for (let i = 0; i < 16; i++) {
        const cx = 30 + (i * 55 + Math.sin(time * 0.02 + i) * 2) % (w - 50);
        const cy = h * 0.3 + ((i * 17) % 45);
        for (let k = 0; k < 5; k++) {
          ctx.beginPath();
          ctx.arc(cx + (k % 3) * 3 - 3, cy + Math.floor(k / 3) * 3, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (themeId === "anise_path") {
      // star anise shapes
      ctx.fillStyle = "rgba(140,90,40,0.5)";
      for (let i = 0; i < 12; i++) {
        const x = 30 + (i * 65 + Math.sin(time * 0.02 + i) * 2) % (w - 50);
        const y = h * 0.32 + ((i * 15) % 45);
        const r = 5;
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4 - Math.PI / 2;
          const rr = k % 2 === 0 ? r : r * 0.4;
          const px = x + Math.cos(a) * rr;
          const py = y + Math.sin(a) * rr;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
    } else if (themeId === "nutmeg_lane") {
      // round nutmeg orbs + warm dust
      ctx.fillStyle = "rgba(130,80,45,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 25 + (i * 58 + Math.sin(time * 0.02 + i) * 3) % (w - 45);
        const y = h * 0.34 + ((i * 16) % 42);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(200,150,80,0.25)";
      for (let i = 0; i < 16; i++) {
        const x = (i * 51 + time * 0.12) % w;
        const y = h * 0.22 + ((i * 13) % 40);
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "honeydew_field") {
      ctx.fillStyle = "rgba(160,200,90,0.45)";
      for (let i = 0; i < 12; i++) {
        const x = 30 + (i * 70 + Math.sin(time * 0.02 + i) * 3) % (w - 50);
        const y = h * 0.4 + ((i * 13) % 30);
        ctx.beginPath();
        ctx.ellipse(x, y, 10, 7, 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "watermelon_patch") {
      ctx.fillStyle = "rgba(40,120,50,0.35)";
      for (let i = 0; i < 10; i++) {
        const x = 40 + (i * 80) % (w - 60);
        const y = h * 0.42 + (i % 2) * 12;
        ctx.beginPath();
        ctx.ellipse(x, y, 14, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(30,90,40,0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - 10, y);
        ctx.lineTo(x + 10, y);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(200,40,60,0.35)";
      for (let i = 0; i < 8; i++) {
        const x = 50 + (i * 90 + Math.sin(time * 0.02 + i) * 2) % (w - 60);
        ctx.beginPath();
        ctx.arc(x, h * 0.35, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "cantaloupe_lane") {
      ctx.fillStyle = "rgba(220,160,70,0.45)";
      for (let i = 0; i < 12; i++) {
        const x = 28 + (i * 68 + Math.sin(time * 0.02 + i) * 3) % (w - 50);
        const y = h * 0.38 + ((i * 14) % 35);
        ctx.beginPath();
        ctx.ellipse(x, y, 9, 7, 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "papaya_grove") {
      ctx.fillStyle = "rgba(70,50,30,0.25)";
      for (let i = 0; i < 7; i++) {
        const x = 40 + i * (w / 7);
        ctx.fillRect(x - 4, h * 0.3, 8, h * 0.25);
      }
      ctx.fillStyle = "rgba(230,120,50,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 30 + (i * 55 + Math.sin(time * 0.02 + i) * 2) % (w - 50);
        const y = h * 0.28 + ((i * 16) % 40);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "rambutan_lane") {
      // hairy red rambutans
      ctx.fillStyle = "rgba(200,40,60,0.55)";
      for (let i = 0; i < 16; i++) {
        const x = 25 + (i * 52 + Math.sin(time * 0.02 + i) * 3) % (w - 45);
        const y = h * 0.32 + ((i * 15) % 45);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(180,30,50,0.45)";
        ctx.lineWidth = 1;
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + time * 0.01;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7);
          ctx.stroke();
        }
      }
    } else if (themeId === "jackfruit_grove") {
      // large yellow-green jackfruits on trunks
      ctx.fillStyle = "rgba(60,50,30,0.28)";
      for (let i = 0; i < 5; i++) {
        const x = 60 + i * (w / 5);
        ctx.fillRect(x - 6, h * 0.28, 12, h * 0.28);
      }
      ctx.fillStyle = "rgba(200,180,60,0.5)";
      for (let i = 0; i < 10; i++) {
        const x = 40 + (i * 80 + Math.sin(time * 0.015 + i) * 2) % (w - 60);
        const y = h * 0.35 + ((i * 17) % 35);
        ctx.beginPath();
        ctx.ellipse(x, y, 12, 16, 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "goji_path") {
      ctx.fillStyle = "rgba(190,40,50,0.55)";
      for (let i = 0; i < 20; i++) {
        const x = 20 + (i * 44 + Math.sin(time * 0.02 + i) * 3) % (w - 40);
        const y = h * 0.34 + ((i * 13) % 45);
        ctx.beginPath();
        ctx.ellipse(x, y, 3, 4.5, 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "bay_courtyard") {
      ctx.fillStyle = "rgba(50,90,40,0.2)";
      ctx.beginPath();
      ctx.ellipse(w * 0.4, h * 0.28, 90, 35, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.7, h * 0.3, 70, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(70,110,50,0.45)";
      for (let i = 0; i < 14; i++) {
        const x = 30 + (i * 55 + Math.sin(time * 0.02 + i) * 2) % (w - 50);
        const y = h * 0.32 + ((i * 16) % 40);
        ctx.beginPath();
        ctx.ellipse(x, y, 6, 3, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "oregano_path") {
      ctx.strokeStyle = "rgba(70,120,50,0.4)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 18; i++) {
        const x = 15 + i * (w / 18) + Math.sin(time * 0.03 + i) * 2;
        ctx.beginPath();
        ctx.moveTo(x, h * 0.55);
        ctx.lineTo(x + 3, h * 0.28);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(90,140,60,0.4)";
      for (let i = 0; i < 16; i++) {
        const x = 20 + (i * 50) % (w - 40);
        const y = h * 0.28 + Math.sin(time * 0.04 + i) * 3;
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 2.5, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "chive_patch") {
      ctx.strokeStyle = "rgba(60,130,50,0.45)";
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 28; i++) {
        const x = 12 + i * (w / 28) + Math.sin(time * 0.04 + i) * 1.5;
        ctx.beginPath();
        ctx.moveTo(x, h * 0.55);
        ctx.lineTo(x + 1, h * 0.25 + (i % 5) * 4);
        ctx.stroke();
      }
    } else if (themeId === "parsley_path") {
      ctx.fillStyle = "rgba(60,140,50,0.4)";
      for (let i = 0; i < 22; i++) {
        const x = 18 + (i * 40 + Math.sin(time * 0.03 + i) * 2) % (w - 35);
        const y = h * 0.3 + ((i * 11) % 50);
        ctx.beginPath();
        ctx.ellipse(x, y, 4, 2.5, i * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "tarragon_lane") {
      ctx.strokeStyle = "rgba(80,120,60,0.4)";
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 16; i++) {
        const x = 20 + i * (w / 16);
        ctx.beginPath();
        ctx.moveTo(x, h * 0.55);
        ctx.quadraticCurveTo(x + 8, h * 0.4, x + 2, h * 0.25);
        ctx.stroke();
      }
    } else if (themeId === "avocado_grove") {
      ctx.fillStyle = "rgba(50,90,40,0.2)";
      for (let i = 0; i < 6; i++) {
        const x = 50 + i * (w / 6);
        ctx.beginPath();
        ctx.ellipse(x, h * 0.3, 35, 22, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(80,120,50,0.5)";
      for (let i = 0; i < 12; i++) {
        const x = 30 + (i * 65 + Math.sin(time * 0.02 + i) * 2) % (w - 50);
        const y = h * 0.38 + ((i * 14) % 35);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 7, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "date_path") {
      ctx.fillStyle = "rgba(140,70,30,0.5)";
      for (let i = 0; i < 18; i++) {
        const x = 22 + (i * 48 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 15) % 45);
        ctx.beginPath();
        ctx.ellipse(x, y, 3, 5, 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "hyssop_path") {
      ctx.fillStyle = "rgba(140,90,180,0.4)";
      for (let i = 0; i < 16; i++) {
        const x = 25 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 45);
        const y = h * 0.3 + ((i * 14) % 45);
        ctx.beginPath();
        ctx.ellipse(x, y, 3, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "chervil_lane") {
      ctx.fillStyle = "rgba(90,150,70,0.4)";
      for (let i = 0; i < 20; i++) {
        const x = 18 + (i * 42 + Math.sin(time * 0.03 + i) * 2) % (w - 35);
        const y = h * 0.32 + ((i * 12) % 48);
        ctx.beginPath();
        ctx.ellipse(x, y, 3.5, 2, i * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "sorrel_path") {
      ctx.fillStyle = "rgba(120,170,50,0.45)";
      for (let i = 0; i < 14; i++) {
        const x = 28 + (i * 58 + Math.sin(time * 0.02 + i) * 2) % (w - 50);
        const y = h * 0.34 + ((i * 15) % 40);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "verbena_path") {
      ctx.fillStyle = "rgba(150,100,190,0.4)";
      for (let i = 0; i < 16; i++) {
        const x = 25 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 45);
        const y = h * 0.3 + ((i * 14) % 45);
        ctx.beginPath();
        ctx.ellipse(x, y, 3, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "savory_lane") {
      ctx.strokeStyle = "rgba(70,130,50,0.4)";
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 20; i++) {
        const x = 15 + i * (w / 20) + Math.sin(time * 0.03 + i) * 2;
        ctx.beginPath();
        ctx.moveTo(x, h * 0.55);
        ctx.lineTo(x + 2, h * 0.26);
        ctx.stroke();
      }
    } else if (themeId === "celery_path") {
      ctx.fillStyle = "rgba(180,200,100,0.45)";
      for (let i = 0; i < 24; i++) {
        const x = 18 + (i * 36 + Math.sin(time * 0.02 + i) * 2) % (w - 35);
        const y = h * 0.34 + ((i * 11) % 40);
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "anise_seed_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 18; i++) {
        const x = 22 + (i * 48 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 15) % 45);
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "lovage_courtyard") {
      ctx.strokeStyle = "rgba(70,110,50,0.4)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        const x = 30 + i * (w / 10);
        ctx.beginPath();
        ctx.moveTo(x, h * 0.55);
        ctx.lineTo(x + 2, h * 0.22);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(80,130,55,0.4)";
      for (let i = 0; i < 12; i++) {
        const x = 25 + (i * 60) % (w - 40);
        const y = h * 0.25 + Math.sin(time * 0.03 + i) * 3;
        ctx.beginPath();
        ctx.ellipse(x, y, 8, 4, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "turmeric_path") {
      ctx.fillStyle = "rgba(220,180,40,0.5)";
      for (let i = 0; i < 16; i++) {
        const x = 25 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 45);
        const y = h * 0.35 + ((i * 14) % 40);
        ctx.beginPath();
        ctx.ellipse(x, y, 4, 6, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "galangal_lane") {
      ctx.fillStyle = "rgba(200,160,80,0.45)";
      for (let i = 0; i < 14; i++) {
        const x = 30 + (i * 58 + Math.sin(time * 0.02 + i) * 2) % (w - 50);
        const y = h * 0.36 + ((i * 15) % 38);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 4, 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "pandan_grove") {
      ctx.strokeStyle = "rgba(40,120,60,0.45)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 18; i++) {
        const x = 15 + i * (w / 18) + Math.sin(time * 0.03 + i) * 2;
        ctx.beginPath();
        ctx.moveTo(x, h * 0.55);
        ctx.quadraticCurveTo(x + 10, h * 0.35, x + 2, h * 0.2);
        ctx.stroke();
      }
    } else if (themeId === "kaffir_path") {
      ctx.fillStyle = "rgba(60,140,50,0.45)";
      for (let i = 0; i < 16; i++) {
        const x = 25 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 45);
        const y = h * 0.3 + ((i * 14) % 45);
        // double leaf shape
        ctx.beginPath();
        ctx.ellipse(x - 3, y, 4, 2.5, -0.3, 0, Math.PI * 2);
        ctx.ellipse(x + 3, y, 4, 2.5, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "juniper_ridge") {
      ctx.fillStyle = "rgba(40,80,120,0.45)";
      for (let i = 0; i < 18; i++) {
        const x = 20 + (i * 48 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.3 + ((i * 13) % 50);
        ctx.beginPath();
        ctx.arc(x, y, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "allspice_lane") {
      ctx.fillStyle = "rgba(130,70,30,0.5)";
      for (let i = 0; i < 16; i++) {
        const x = 25 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 45);
        const y = h * 0.34 + ((i * 14) % 42);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "mace_path") {
      ctx.fillStyle = "rgba(220,120,50,0.45)";
      for (let i = 0; i < 14; i++) {
        const x = 28 + (i * 58 + Math.sin(time * 0.02 + i) * 2) % (w - 50);
        const y = h * 0.32 + ((i * 15) % 45);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 2, i * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "sumac_path") {
      ctx.fillStyle = "rgba(180,40,40,0.5)";
      for (let i = 0; i < 12; i++) {
        const cx = 30 + (i * 70 + Math.sin(time * 0.02 + i) * 2) % (w - 50);
        const cy = h * 0.3 + ((i * 16) % 45);
        for (let k = 0; k < 6; k++) {
          ctx.beginPath();
          ctx.arc(cx + (k % 3) * 3 - 3, cy + Math.floor(k / 3) * 4, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

    } else if (themeId === "caraway_path") {
      ctx.fillStyle = "rgba(180,150,60,0.5)";
      for (let i = 0; i < 18; i++) {
        const x = 20 + (i * 48 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.34 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 2, 3.5, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "cumin_lane") {
      ctx.fillStyle = "rgba(150,90,30,0.5)";
      for (let i = 0; i < 20; i++) {
        const x = 18 + (i * 44 + Math.sin(time * 0.02 + i) * 2) % (w - 35);
        const y = h * 0.32 + ((i * 12) % 48);
        ctx.beginPath();
        ctx.ellipse(x, y, 1.8, 3, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "fenugreek_path") {
      ctx.fillStyle = "rgba(210,170,40,0.5)";
      for (let i = 0; i < 16; i++) {
        const x = 25 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 45);
        const y = h * 0.33 + ((i * 14) % 45);
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "nigella_lane") {
      ctx.fillStyle = "rgba(30,30,30,0.55)";
      for (let i = 0; i < 22; i++) {
        const x = 16 + (i * 40 + Math.sin(time * 0.02 + i) * 2) % (w - 30);
        const y = h * 0.32 + ((i * 11) % 50);
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "mustard_path") {
      ctx.fillStyle = "rgba(210,180,40,0.5)";
      for (let i = 0; i < 18; i++) {
        const x = 20 + (i * 48 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.34 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "ajwain_lane") {
      ctx.fillStyle = "rgba(120,140,50,0.45)";
      for (let i = 0; i < 16; i++) {
        const x = 25 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 45);
        const y = h * 0.32 + ((i * 14) % 45);
        ctx.beginPath();
        ctx.ellipse(x, y, 1.8, 3, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "wasabi_path") {
      ctx.fillStyle = "rgba(80,160,100,0.2)";
      ctx.fillRect(0, h * 0.45, w, h * 0.12);
      ctx.fillStyle = "rgba(90,180,90,0.5)";
      for (let i = 0; i < 12; i++) {
        const x = 30 + (i * 70 + Math.sin(time * 0.02 + i) * 2) % (w - 50);
        const y = h * 0.38 + ((i * 15) % 30);
        ctx.beginPath();
        ctx.ellipse(x, y, 6, 4, 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "myrtle_courtyard") {
      ctx.fillStyle = "rgba(50,100,50,0.2)";
      ctx.beginPath();
      ctx.ellipse(w * 0.4, h * 0.28, 85, 32, 0, 0, Math.PI * 2);
      ctx.ellipse(w * 0.7, h * 0.3, 70, 28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(70,130,60,0.45)";
      for (let i = 0; i < 14; i++) {
        const x = 28 + (i * 55 + Math.sin(time * 0.02 + i) * 2) % (w - 50);
        const y = h * 0.32 + ((i * 16) % 40);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 2.8, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "chicory_path") {
      ctx.fillStyle = "rgba(100,140,200,0.45)";
      for (let i = 0; i < 14; i++) {
        const x = 28 + (i * 58 + Math.sin(time * 0.02 + i) * 2) % (w - 50);
        const y = h * 0.32 + ((i * 15) % 45);
        ctx.beginPath();
        ctx.ellipse(x, y, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "dandelion_field") {
      ctx.fillStyle = "rgba(240,220,100,0.4)";
      for (let i = 0; i < 20; i++) {
        const x = 18 + (i * 44 + Math.sin(time * 0.025 + i) * 3) % (w - 35);
        const y = h * 0.35 + ((i * 12) % 40);
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(250,250,240,0.35)";
      for (let i = 0; i < 12; i++) {
        const x = (i * 70 + time * 0.15) % w;
        const y = h * 0.2 + ((i * 17 + time * 0.05) % (h * 0.3));
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "nettle_path") {
      ctx.strokeStyle = "rgba(50,100,40,0.4)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 16; i++) {
        const x = 20 + i * (w / 16);
        ctx.beginPath();
        ctx.moveTo(x, h * 0.55);
        ctx.lineTo(x + 3, h * 0.28);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(60,120,50,0.4)";
      for (let i = 0; i < 12; i++) {
        const x = 30 + (i * 60) % (w - 40);
        const y = h * 0.3 + Math.sin(time * 0.03 + i) * 3;
        ctx.beginPath();
        ctx.ellipse(x, y, 6, 3, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "yarrow_meadow") {
      ctx.fillStyle = "rgba(240,240,230,0.45)";
      for (let i = 0; i < 22; i++) {
        const x = 15 + (i * 40 + Math.sin(time * 0.02 + i) * 2) % (w - 30);
        const y = h * 0.34 + ((i * 11) % 45);
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          ctx.arc(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 1.5, 0, Math.PI * 2);
        }
        ctx.fill();
      }

    } else if (themeId === "meadowsweet_path") {
      ctx.fillStyle = "rgba(245,245,235,0.5)";
      for (let i = 0; i < 18; i++) {
        const x = 20 + (i * 48 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.33 + ((i * 13) % 45);
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "woodruff_lane") {
      ctx.fillStyle = "rgba(80,140,70,0.4)";
      for (let i = 0; i < 16; i++) {
        const x = 25 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 45);
        const y = h * 0.35 + ((i * 14) % 40);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "borage_path") {
      ctx.fillStyle = "rgba(80,120,210,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 28 + (i * 58 + Math.sin(time * 0.02 + i) * 2) % (w - 50);
        const y = h * 0.3 + ((i * 15) % 48);
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
          const px = x + Math.cos(a) * 4;
          const py = y + Math.sin(a) * 4;
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
    } else if (themeId === "valerian_grove") {
      ctx.fillStyle = "rgba(220,210,220,0.4)";
      for (let i = 0; i < 12; i++) {
        const x = 30 + (i * 65 + Math.sin(time * 0.02 + i) * 2) % (w - 50);
        const y = h * 0.32 + ((i * 16) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 6, 4, 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "hops_trellis") {
      ctx.strokeStyle = "rgba(90,140,90,0.55)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 10; i++) {
        const x = 40 + (i * 80 + Math.sin(time * 0.015 + i) * 2) % (w - 60);
        ctx.beginPath();
        ctx.moveTo(x, h * 0.22);
        ctx.lineTo(x, h * 0.48);
        ctx.stroke();
        ctx.fillStyle = "rgba(120,170,100,0.55)";
        for (let k = 0; k < 4; k++) {
          ctx.beginPath();
          ctx.ellipse(x + 4 + (k % 2) * 3, h * 0.28 + k * 12, 5, 3.5, 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (themeId === "heather_hill") {
      ctx.fillStyle = "rgba(150,90,160,0.5)";
      for (let i = 0; i < 20; i++) {
        const x = 18 + (i * 42 + Math.sin(time * 0.02 + i) * 2) % (w - 36);
        const y = h * 0.34 + ((i * 11) % 38);
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 3, y - 2, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "angelica_path") {
      ctx.fillStyle = "rgba(230,230,210,0.45)";
      for (let i = 0; i < 12; i++) {
        const x = 32 + (i * 62 + Math.sin(time * 0.02 + i) * 2) % (w - 50);
        const y = h * 0.3 + ((i * 15) % 44);
        ctx.beginPath();
        ctx.moveTo(x, y + 8);
        ctx.lineTo(x - 5, y);
        ctx.lineTo(x + 5, y);
        ctx.closePath();
        ctx.fill();
      }
    } else if (themeId === "arnica_meadow") {
      ctx.fillStyle = "rgba(230,190,70,0.55)";
      for (let i = 0; i < 16; i++) {
        const x = 24 + (i * 50 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.33 + ((i * 13) % 40);
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          const px = x + Math.cos(a) * 4;
          const py = y + Math.sin(a) * 4;
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
    } else if (themeId === "echinacea_meadow") {
      ctx.fillStyle = "rgba(180,100,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 26 + (i * 54 + Math.sin(time * 0.02 + i) * 2) % (w - 45);
        const y = h * 0.32 + ((i * 14) % 42);
        ctx.beginPath();
        ctx.moveTo(x, y - 6);
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 - Math.PI / 2;
          ctx.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 3);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(90,50,40,0.55)";
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(180,100,180,0.5)";
      }
    } else if (themeId === "comfrey_path") {
      ctx.fillStyle = "rgba(70,140,100,0.45)";
      for (let i = 0; i < 12; i++) {
        const x = 30 + (i * 60 + Math.sin(time * 0.02 + i) * 2) % (w - 50);
        const y = h * 0.34 + ((i * 15) % 40);
        ctx.beginPath();
        ctx.ellipse(x, y, 8, 5, 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "feverfew_lane") {
      ctx.fillStyle = "rgba(245,245,235,0.55)";
      for (let i = 0; i < 18; i++) {
        const x = 20 + (i * 46 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.33 + ((i * 12) % 42);
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          const px = x + Math.cos(a) * 3.5;
          const py = y + Math.sin(a) * 3.5;
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(220,180,60,0.6)";
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(245,245,235,0.55)";
      }
    } else if (themeId === "lemon_verbena_path") {
      ctx.fillStyle = "rgba(140,190,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 28 + (i * 56 + Math.sin(time * 0.02 + i) * 2) % (w - 48);
        const y = h * 0.31 + ((i * 14) % 44);
        ctx.beginPath();
        ctx.ellipse(x, y, 6, 3, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 5, y + 2, 5, 2.5, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "mullein_path") {
      ctx.fillStyle = "rgba(220,190,70,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "plantain_lane") {
      ctx.fillStyle = "rgba(90,150,90,0.45)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "selfheal_grove") {
      ctx.fillStyle = "rgba(150,90,170,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "skullcap_path") {
      ctx.fillStyle = "rgba(90,130,180,0.45)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "bee_balm_path") {
      ctx.fillStyle = "rgba(200,70,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "marshmallow_lane") {
      ctx.fillStyle = "rgba(230,150,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "linden_grove") {
      ctx.fillStyle = "rgba(240,230,200,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "goldenrod_meadow") {
      ctx.fillStyle = "rgba(230,200,60,0.55)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "red_clover_path") {
      ctx.fillStyle = "rgba(200,80,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "white_clover_lane") {
      ctx.fillStyle = "rgba(240,240,240,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "catnip_path") {
      ctx.fillStyle = "rgba(100,170,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "horehound_path") {
      ctx.fillStyle = "rgba(160,160,150,0.45)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "motherwort_path") {
      ctx.fillStyle = "rgba(210,130,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "tansy_meadow") {
      ctx.fillStyle = "rgba(220,190,50,0.55)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "agrimony_path") {
      ctx.fillStyle = "rgba(200,170,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "betony_grove") {
      ctx.fillStyle = "rgba(150,90,170,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "solomon_seal_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "rue_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "wormwood_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "costmary_lane") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "elecampane_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "valerian_root_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "meadow_clary_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "soapwort_lane") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "milfoil_meadow") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "lady_mantle_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "speedwell_lane") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "stitchwort_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "campion_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "avens_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "tormentil_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "silverweed_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "figwort_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "loosestrife_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "willowherb_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "bedstraw_lane") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "cleavers_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "ground_ivy_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "self_heal_spike_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "bugle_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "primrose_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "cowslip_lane") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "oxeye_meadow") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "knapweed_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "scabious_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "teasel_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "burdock_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "nettle_seed_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "hawthorn_berry_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "rosehip_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "sloe_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "rowan_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "crabapple_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "serviceberry_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "elderflower_fresh_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "meadowsweet_fresh_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "wood_sorrel_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "wild_garlic_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "ramsons_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "jack_by_hedge_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "hedge_mustard_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "wintercress_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "watercress_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "brooklime_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "cloudberry_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "lingonberry_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "bilberry_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "gooseberry_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "currant_red_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "currant_black_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "whitecurrant_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "sea_buckthorn_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "medlar_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "quince_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "damson_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "greengage_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "mirabelle_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "saskatoon_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "chokeberry_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "aronia_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "yarrow_white_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "achillea_pink_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "cornflower_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "poppy_seed_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "flax_flower_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "flax_seed_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "hemp_seed_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "chia_seed_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "pumpkin_seed_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "sunflower_seed_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "sesame_black_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "sesame_white_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "fennel_pollen_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "fennel_frond_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "dill_pollen_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "celery_leaf_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "rooibos_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "honeybush_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "yerba_mate_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "guayusa_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "lapacho_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "sassafras_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "birch_bark_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "pine_resin_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "gardenia_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "magnolia_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "frangipani_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "plumeria_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "tuberose_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "stephanotis_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "garden_phlox_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "osmanthus_fresh_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "galangal_fresh_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "ginger_flower_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "turmeric_fresh_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "cardamom_green_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "cardamom_black_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "long_pepper_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "grains_paradise_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "cubeb_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "makrut_leaf_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "curry_leaf_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "holy_basil_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "thai_basil_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "lemon_basil_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "cinnamon_leaf_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "clove_bud_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "allspice_leaf_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "reindeer_moss_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "iceland_moss_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "oak_moss_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "usnea_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "chaga_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "reishi_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "lion_mane_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "maitake_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "rambutan_fresh_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "lychee_fresh_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "mangosteen_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "durian_flower_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "jackfruit_seed_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "tamarind_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "calamansi_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "fig_fresh_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "pomegranate_seed_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "cactus_pear_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "prickly_pear_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "sapodilla_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "soursop_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "cherimoya_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "feijoa_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "loquat_fresh_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "jujube_fresh_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "mulberry_white_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "mulberry_black_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "elderberry_fresh_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "rowan_jelly_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "quince_paste_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "bergamot_fresh_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "yuzu_fresh_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "sudachi_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "kabosu_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "ponkan_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "dekopon_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "hassaku_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "amanatsu_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "shiso_green_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "shiso_red_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "mitsuba_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "myoga_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "wasabi_leaf_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "sansho_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "kinome_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "yuzu_kosho_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "edelweiss_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "gentian_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "arnica_montana_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "alpine_strawberry_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "bilberry_leaf_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "juniper_berry_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "fir_needle_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "spruce_tip_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "olive_leaf_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "myrtle_berry_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "mastic_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "caper_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "zaatar_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "sumac_berry_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "saffron_crocus_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "orange_blossom_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "lavender_honey_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "thyme_honey_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "acacia_honey_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "buckwheat_honey_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "chestnut_honey_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "manuka_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "propolis_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "bee_pollen_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "royal_jelly_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "comb_honey_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "mead_herb_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "linden_honey_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "heather_honey_wild_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "wildflower_honey_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "clover_honey_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "eucalyptus_honey_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "cacao_nibs_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "cacao_husk_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "carob_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "mesquite_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "lucuma_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "maca_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "camu_camu_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "acai_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "maqui_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "goji_fresh_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "schisandra_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "amla_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "baobab_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "morinda_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "noni_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "cupuacu_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "matcha_ceremonial_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "hojicha_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "genmaicha_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "sencha_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "gyokuro_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "bancha_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "kukicha_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "mugicha_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "sobacha_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "job_tears_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "barley_grass_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "wheatgrass_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "spirulina_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "chlorella_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "kelp_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "nori_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "rose_hip_tea_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "hibiscus_fresh_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "chrysanthemum_fresh_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "peony_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "camellia_fresh_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "lotus_seed_fresh_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "lotus_leaf_fresh_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "osmanthus_sugar_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "plum_blossom_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "wintersweet_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "orchid_petal_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "bamboo_leaf_fresh_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "bamboo_shoot_fresh_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "ginkgo_leaf_fresh_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "ginkgo_nut_fresh_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "osmanthus_wine_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "safflower_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "calendula_fresh_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "pot_marigold_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "coreopsis_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "cosmos_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "zinnia_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "dahlia_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "gladiolus_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "iris_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "crocus_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "snowdrop_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "crocus_yellow_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "hyacinth_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "daffodil_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "tulip_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "ranunculus_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "sweet_pea_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "nasturtium_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "morning_glory_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "moonflower_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "clematis_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "wisteria_fresh_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "jasmine_sambac_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "gardenia_tea_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "magnolia_bark_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "eucommia_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "astragalus_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "codonopsis_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "rehmannia_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "polygonatum_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "ophiopogon_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "boysenberry_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "loganberry_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "tayberry_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "marionberry_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "wineberry_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "salmonberry_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "thimbleberry_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "cloudberry_leaf_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "angelica_arch_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "lovage_fresh_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "sweet_cicely_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "wood_avense_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "ramsons_flower_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "sea_kale_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "scurvygrass_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "marsh_samphire_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "agave_nectar_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "prickly_pear_pad_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "jojoba_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "mesquite_pod_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "creosote_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "desert_sage_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "ephedra_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "yucca_flower_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "yerba_santa_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "boldo_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "cedron_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "muna_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "coca_leaf_tea_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "guarana_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "cupuacu_butter_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "stevia_leaf_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "rooibos_green_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "honeybush_fresh_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "buchu_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "sutherlandia_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "baobab_leaf_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "marula_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "kinkeliba_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "hibiscus_sab_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "pandan_fresh_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "lemongrass_fresh_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "galangal_leaf_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "torch_ginger_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "butterfly_pea_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "chrysanthemum_ind_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "tamarind_leaf_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "coconut_flower_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "bergamot_leaf_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "citron_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "bergamot_peel_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "neroli_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "petitgrain_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "immortelle_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "helichrysum_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "cistus_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "spruce_beer_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "labrador_tea_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "fireweed_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "fireweed_honey_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "arctic_willow_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "crowberry_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "bearberry_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "labrador_violet_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "kinako_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "kuromitsu_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "matcha_salt_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "yuzu_peel_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "sansho_leaf_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "shiso_flower_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "ume_blossom_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "sakura_leaf_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "vanilla_bean_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "tonka_bean_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "lavender_sugar_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "rose_water_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "orange_flower_water_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "almond_blossom_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "hazelnut_flower_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "chestnut_flower_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "omija_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "yuja_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "ssanghwa_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "maesil_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "jujube_tea_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "ginger_tea_kr_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "persimmon_leaf_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "pine_flower_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "tulsi_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "neem_flower_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "curry_blossom_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "ajwain_leaf_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "fenugreek_leaf_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "moringa_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "gotu_kola_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "brahmi_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "hibiscus_rosa_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "allspice_berry_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "annatto_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "epazote_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "papalo_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "hoja_santa_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "mexican_oregano_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "chile_flower_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "noni_leaf_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "kava_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "ti_leaf_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "frangipani_tea_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "soursop_leaf_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "guava_leaf_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "passion_leaf_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "vanilla_orchid_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "longjing_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "biluochun_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "tieguanyin_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "dahongpao_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "puer_raw_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "puer_ripe_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "white_peony_tea_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "shoumei_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "burdock_root_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "dandelion_root_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "chicory_root_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "valerian_flower_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "hops_flower_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "meadowsweet_flower_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "yarrow_flower_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "nettle_seed_tea_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "silver_birch_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "copper_beech_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "hornbeam_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "field_maple_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "wild_service_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "guelder_rose_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "wayfaring_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "dogwood_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "spindle_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "buckthorn_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "privet_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "boxwood_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "holly_leaf_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "ivy_berry_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "mistletoe_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "yew_berry_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "bluebell_fresh_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "primula_veris_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "oxlip_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "cowslip_fresh_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "wood_anemone_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "wood_sorrel_pink_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "greater_stitchwort_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "red_campion_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (themeId === "white_campion_path") {
      ctx.fillStyle = "rgba(180,100,140,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "ragged_robin_path") {
      ctx.fillStyle = "rgba(100,160,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "cuckooflower_path") {
      ctx.fillStyle = "rgba(200,180,80,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "lady_smock_path") {
      ctx.fillStyle = "rgba(100,130,180,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "garlic_mustard_fl_path") {
      ctx.fillStyle = "rgba(160,100,160,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "hedge_garlic_seed_path") {
      ctx.fillStyle = "rgba(210,140,90,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "jack_hedge_leaf_path") {
      ctx.fillStyle = "rgba(90,150,130,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeId === "wild_mustard_path") {
      ctx.fillStyle = "rgba(190,120,100,0.5)";
      for (let i = 0; i < 14; i++) {
        const x = 24 + (i * 52 + Math.sin(time * 0.02 + i) * 2) % (w - 40);
        const y = h * 0.32 + ((i * 13) % 42);
        ctx.beginPath();
        ctx.ellipse(x, y, 5, 3.5, 0.1 * (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

    }
  }

  function drawWalk() {
    if (!world) return;
    const w = canvas.clientWidth || 900;
    const h = canvas.clientHeight || 420;
    const cam = world.camX;
    const gy = world.groundY;

    // 天空渐变：随小路主题变化
    const skyColors = (world.sky && world.sky.length >= 2
      ? world.sky
      : ["#3d4a6b", "#8b6a8a", "#e8a878", "#f0c898", "#c8b888"]);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    skyColors.forEach((c, i) => {
      sky.addColorStop(i / Math.max(1, skyColors.length - 1), c);
    });
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    const stFx = Core.getSettings(state);
    if (stFx.weatherFx !== false && !stFx.reduceMotion) {
      drawWeather(ctx, w, h, world.themeId, world.time);
    }

    // 太阳
    const sunX = w * 0.78;
    const sunY = h * 0.28;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 70);
    sunGrad.addColorStop(0, "rgba(255, 240, 180, 0.95)");
    sunGrad.addColorStop(0.4, "rgba(255, 180, 100, 0.55)");
    sunGrad.addColorStop(1, "rgba(255, 140, 80, 0)");
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 70, 0, Math.PI * 2);
    ctx.fill();

    // 远山
    for (const hill of world.hills) {
      const hx = hill.x - cam * 0.45;
      ctx.fillStyle = hill.color;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.ellipse(hx, gy + 20, hill.w / 2, hill.h, 0, Math.PI, 0);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // 地面
    ctx.fillStyle = world.groundColor || "#8faf6a";
    ctx.fillRect(0, gy, w, h - gy);
    ctx.fillStyle = "#a8c47c";
    ctx.fillRect(0, gy, w, 12);

    // 小路
    ctx.fillStyle = world.pathColor || "#c4ae88";
    ctx.beginPath();
    ctx.moveTo(0, gy + 8);
    for (let x = 0; x <= w; x += 20) {
      const wx = x + cam;
      const wave = Math.sin(wx * 0.01) * 6;
      ctx.lineTo(x, gy + 28 + wave);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // 小路纹理
    ctx.strokeStyle = "rgba(160, 130, 90, 0.25)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 14]);
    ctx.beginPath();
    ctx.moveTo(0, gy + 48);
    for (let x = 0; x <= w; x += 16) {
      const wx = x + cam;
      ctx.lineTo(x, gy + 48 + Math.sin(wx * 0.012) * 5);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 树
    for (const t of world.trees) {
      const tx = t.x - cam;
      if (tx < -80 || tx > w + 80) continue;
      ctx.fillStyle = "#6b5344";
      ctx.fillRect(tx - 5, gy - t.h * 0.35, 10, t.h * 0.4);
      ctx.fillStyle = t.type ? "#5f8f5a" : "#6fa86a";
      ctx.beginPath();
      ctx.ellipse(tx, gy - t.h * 0.5, 22 + t.h * 0.15, 28 + t.h * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 可拾取物
    ctx.font = "28px serif";
    ctx.textAlign = "center";
    for (const it of world.items) {
      if (it.taken) continue;
      const ix = it.x - cam;
      if (ix < -40 || ix > w + 40) continue;
      const bob = (Core.getSettings(state).reduceMotion ? 0 : Math.sin(world.time * 0.05 + it.bob) * 4);
      const def = ITEMS[it.id];
      // 光晕
      ctx.fillStyle = "rgba(255, 250, 220, 0.35)";
      ctx.beginPath();
      ctx.ellipse(ix, gy - 8 + bob, 18, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(def.emoji, ix, gy - 12 + bob);
    }

    // 玩家（小清新小人）
    const px = world.playerX - cam;
    const py = gy - 4;
    const face = world.playerFacing;
    const walkPhase = (keys.left || keys.right) ? Math.sin(world.time * 0.25) * 4 : 0;

    // 影子
    ctx.fillStyle = "rgba(60, 50, 40, 0.15)";
    ctx.beginPath();
    ctx.ellipse(px, gy + 4, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 腿
    ctx.strokeStyle = "#5a6a7a";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(px - 4, py - 22);
    ctx.lineTo(px - 6 + walkPhase, py);
    ctx.moveTo(px + 4, py - 22);
    ctx.lineTo(px + 6 - walkPhase, py);
    ctx.stroke();

    // 身体
    ctx.fillStyle = "#7eb8c8";
    ctx.beginPath();
    ctx.roundRect(px - 12, py - 48, 24, 28, 8);
    ctx.fill();

    // 头
    ctx.fillStyle = "#f5d8c0";
    ctx.beginPath();
    ctx.arc(px, py - 58, 12, 0, Math.PI * 2);
    ctx.fill();

    // 头发
    ctx.fillStyle = "#5a4a42";
    ctx.beginPath();
    ctx.ellipse(px, py - 66, 13, 8, 0, Math.PI, 0);
    ctx.fill();

    // 脸朝向
    ctx.fillStyle = "#3a3028";
    ctx.beginPath();
    ctx.arc(px + face * 4, py - 58, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // 篮子
    ctx.font = "16px serif";
    ctx.fillText("🧺", px - face * 18, py - 30);

    // 前景草
    ctx.fillStyle = "#7a9e58";
    for (let i = 0; i < 30; i++) {
      const gx = ((i * 97 + 20) - (cam * 1.1) % 97);
      const gh = 8 + (i % 5) * 3;
      ctx.fillRect(gx, h - gh - 4, 3, gh);
    }

    // HUD
    ctx.fillStyle = "rgba(255,253,249,0.88)";
    ctx.beginPath();
    ctx.roundRect(12, 12, 280, world.ambientNote ? 52 : 36, 18);
    ctx.fill();
    ctx.fillStyle = "#4a463f";
    ctx.font = "13px 'Noto Sans SC', sans-serif";
    ctx.textAlign = "left";
    const themeLabel = (currentTheme() && currentTheme().name) || "";
    ctx.fillText(`本路拾取 ${world.collected} 件` + (themeLabel ? " · " + themeLabel : ""), 28, 35);
    if (world.ambientNote) {
      const note = typeof world.ambientNote === "string" ? world.ambientNote : world.ambientNote.note || "";
      ctx.font = "11px 'Noto Sans SC', sans-serif";
      ctx.fillStyle = "#6a645a";
      ctx.fillText(String(note).slice(0, 28), 28, 52);
    }
  }

  // 输入
  document.getElementById("btn-left").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    keys.left = true;
  });
  document.getElementById("btn-right").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    keys.right = true;
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => {
    document.getElementById("btn-left").addEventListener(ev, () => (keys.left = false));
    document.getElementById("btn-right").addEventListener(ev, () => (keys.right = false));
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
  });

  function applyEveningEvent() {
    if (!eveningEvents.length) return null;
    state._seenEvents = state._seenEvents || {};
    const pool = eveningEvents.filter((e) => e && e.id && !state._seenEvents[e.id]);
    const list = pool.length ? pool : eveningEvents;
    const ev = list[Math.floor(Math.random() * list.length)];
    if (!ev) return null;
    state._seenEvents[ev.id] = true;
    const effect = ev.effect || {};
    if (effect.coins) state.coins = (state.coins || 0) + effect.coins;
    if (effect.hearts) state.hearts = (state.hearts || 0) + effect.hearts;
    if (effect.items) {
      Object.keys(effect.items).forEach((id) => addItem(id, effect.items[id]));
    }
    Core.appendJournal(state, "【" + (ev.title || "小事") + "】" + (ev.body || ""));
    return ev;
  }

  document.getElementById("btn-new-path").addEventListener("click", () => {
    state.pathsWalked++;
    state.coins += (Core.ECONOMY && Core.ECONOMY.pathBonus) || 3;
    Core.appendJournal(state, "又走完一段小路，口袋轻响。");
    const canR = Core.chargeWateringCan(state, 1);
    const first = Core.claimFirstWalkBonus ? Core.claimFirstWalkBonus(state) : { ok: false };
    const miles = Core.checkPathMilestones ? Core.checkPathMilestones(state) : { newly: [] };
    const ev = applyEveningEvent();
    checkAchievements();
    Core.evaluateDailyGoals(state);
    save();
    refreshResources();
    refreshDailyUI();
    world = makeWorld(2000 + state.pathsWalked * 131 + Date.now() % 1000);
    if (miles.newly && miles.newly.length) {
      const m = miles.newly[0];
      toast("🏷️ 小路贴纸「" + m.name + "」· +" + m.coins + " 🪙");
      sfx("achieve");
    } else if (first && first.ok) {
      toast("🌅 今日第一脚 · +2 🪙 +1 💛 · 水壶 +1");
      sfx("unlock");
    } else if (ev) {
      toast("📖 " + ev.title + " — " + (ev.body || "").slice(0, 28) + "…");
    } else {
      toast("✨ 晚风换了一条小路，送你 2 枚金币" + (canR.full ? " · 水壶满了" : ""));
    }
    if (walkRunning) resizeWalk();
  });

  const btnSitBench = document.getElementById("btn-sit-bench");
  if (btnSitBench) {
    btnSitBench.addEventListener("click", () => {
      const r = Core.sitBench(state);
      checkAchievements();
      save();
      refreshResources();
      if (r.hearts) {
        toast("🪑 歇够三回了，好心情 +1");
      } else {
        toast("🪑 风停了一会儿，脚也轻了");
      }
      sfx("ui");
    });
  }

  const btnFavTheme = document.getElementById("btn-fav-theme");
  if (btnFavTheme) {
    btnFavTheme.addEventListener("click", () => {
      const id = state.pathThemeId || (currentTheme() && currentTheme().id);
      const r = Core.favoritePathTheme(state, id);
      if (!r.ok) {
        toast("先选一条小路吧");
        return;
      }
      save();
      renderThemePicker();
      const th = PATH_THEMES.find((t) => t.id === r.themeId);
      toast("★ 常走小路：「" + ((th && th.name) || r.themeId) + "」");
      sfx("pin");
    });
  }

  const btnSeason = document.getElementById("btn-next-season");
  if (btnSeason) {
    btnSeason.addEventListener("click", () => {
      const s = Core.advanceSeason(state);
      checkAchievements();
      save();
      refreshResources();
      toast("🍃 季节轻轻换成了 " + (Core.SEASON_LABELS[s] || s));
    });
  }

  // ---------- 盆栽 ----------
  function growthStage(pot) {
    if (!pot.plantId) return 0;
    const def = PLANTS[pot.plantId];
    const g = pot.growth;
    if (g >= def.days) return 2;
    if (g >= def.days * 0.45) return 1;
    return 0;
  }

  function isReady(pot) {
    if (!pot.plantId) return false;
    return pot.growth >= PLANTS[pot.plantId].days;
  }

  function renderGarden() {
    const sill = document.getElementById("windowsill");
    sill.innerHTML = "";
    const seasonClass = "season-" + (state.season || "dusk");
    state.pots.forEach((pot, i) => {
      const slot = document.createElement("div");
      slot.className = "pot-slot" + (pot.plantId ? "" : " pot-empty") + (state.selectedPot === i ? " selected" : "") + " " + seasonClass;
      if (pot.plantId && pot.mood > 50) slot.classList.add("happy");

      let visual = "＋";
      let label = "空花盆";
      let moodFace = "";
      if (pot.plantId) {
        const def = PLANTS[pot.plantId];
        visual = def.emoji[growthStage(pot)];
        label = (pot.nickname ? pot.nickname + " · " : "") + def.name + (isReady(pot) ? " · 可收获" : "");
        // soft mood face: pure still-life feedback, no HP
        if (pot.mood >= 75) moodFace = "😊";
        else if (pot.mood >= 45) moodFace = "🙂";
        else if (pot.mood >= 25) moodFace = "😐";
        else moodFace = "😴";
      }
      slot.innerHTML = `
        <div class="plant-visual">${visual}${moodFace ? `<span class="mood-face" aria-hidden="true">${moodFace}</span>` : ""}</div>
        <div class="pot-body"></div>
        <div class="pot-label">${label}</div>
      `;
      slot.addEventListener("click", () => {
        state.selectedPot = i;
        save();
        renderGarden();
      });
      sill.appendChild(slot);
    });

    // seeds
    const seedList = document.getElementById("seed-list");
    seedList.innerHTML = "";
    const plantable = Object.values(ITEMS).filter((it) => it.seed && hasItem(it.id));
    if (!plantable.length) {
      seedList.innerHTML = `<p class="muted">去小路捡些果子和草药吧，它们可以种下。</p>`;
    } else {
      plantable.forEach((it) => {
        const btn = document.createElement("button");
        btn.className = "seed-chip";
        btn.innerHTML = `${it.emoji} ${it.name} <small>×${state.bag[it.id]}</small>`;
        btn.addEventListener("click", () => plantSeed(it.id));
        seedList.appendChild(btn);
      });
    }

    // pot unlock control
    let unlockRow = document.getElementById("pot-unlock-row");
    if (!unlockRow) {
      unlockRow = document.createElement("div");
      unlockRow.id = "pot-unlock-row";
      unlockRow.className = "action-row";
      const side = document.querySelector(".garden-side");
      if (side) side.appendChild(unlockRow);
    }
    const slots = state.potSlots || state.pots.length;
    if (slots < 6) {
      unlockRow.hidden = false;
      unlockRow.innerHTML = `<button type="button" class="soft-btn accent" id="btn-unlock-pot">🪴 扩展窗台（25 金币）· 当前 ${slots}/6</button>`;
      const b = document.getElementById("btn-unlock-pot");
      if (b) {
        b.addEventListener("click", () => {
          const r = Core.unlockPotSlot(state, 25);
          if (!r.ok) {
            toast(r.reason === "coins" ? "金币还不够扩展窗台" : "窗台已经够用啦");
            return;
          }
          save();
          refreshResources();
          renderGarden();
          toast("🪴 新花盆就位了");
          sfx("unlock");
        });
      }
    } else {
      unlockRow.hidden = true;
    }

    renderPlantDetail();
  }

  function renderPlantDetail() {
    const pot = state.pots[state.selectedPot];
    const detail = document.getElementById("plant-detail");
    const actions = document.getElementById("plant-actions");
    const harvestBtn = document.getElementById("btn-harvest");

    if (!pot.plantId) {
      detail.innerHTML = `
        <h3>空花盆 #${state.selectedPot + 1}</h3>
        <p class="muted">从下方种子里选一样种下。散步捡到的野果、薄荷、茉莉都可以种。</p>
      `;
      actions.hidden = true;
      return;
    }

    const def = PLANTS[pot.plantId];
    const stage = growthStage(pot);
    const stageName = ["幼芽", "抽枝", "成熟"][stage];
    const nick = pot.nickname ? `「${pot.nickname}」` : '';
    const noteLine = pot.note
      ? `<p class="muted" style="margin-top:8px">📝 便签：「${pot.note}」</p>`
      : "";
    const memLine =
      (pot.harvestCount || 0) > 0
        ? `<p class="muted">熟土记忆：已收获 ${pot.harvestCount} 次${pot.harvestCount >= 3 ? " · 加成中" : ""}</p>`
        : "";
    detail.innerHTML = `
      <h3>${def.emoji[stage]} ${def.name} ${nick}</h3>
      <p class="muted">阶段：${stageName} · 生长 ${Math.min(pot.growth, def.days).toFixed(1)} / ${def.days}</p>
      ${memLine}
      <div class="stat-bars">
        <div class="stat"><span>水分</span><div class="bar"><i style="width:${pot.water}%"></i></div><span>${Math.round(pot.water)}</span></div>
        <div class="stat"><span>日照</span><div class="bar sun"><i style="width:${pot.sun}%"></i></div><span>${Math.round(pot.sun)}</span></div>
        <div class="stat"><span>心情</span><div class="bar mood"><i style="width:${pot.mood}%"></i></div><span>${Math.round(pot.mood)}</span></div>
      </div>
      ${noteLine}
      <p class="muted" style="margin-top:10px">浇水、日照、说说话，都会让它慢慢长大。没有枯死，只有慢慢等。季节不同，照料会有一点点不一样。</p>
      ${pot.water < 25 ? '<p class="muted">💧 土壤有点干，也许想喝一口水。</p>' : ''}
      ${pot.sun < 25 ? '<p class="muted">☁️ 有点想晒太阳。</p>' : ''}
      ${pot.mood < 30 ? '<p class="muted">想听你说说话。</p>' : ''}
    `;
    actions.hidden = false;
    harvestBtn.hidden = !isReady(pot);
    const can = Core.getWateringCan(state);
    const canStatus = document.getElementById("watering-can-status");
    if (canStatus) {
      canStatus.textContent = "水壶：" + can.charge + " / " + can.max + (can.charge >= can.max ? " · 满了" : " · 散步可蓄水");
    }
  }

  function plantSeed(itemId) {
    const pot = state.pots[state.selectedPot];
    if (pot.plantId) {
      toast("这盆已经有植物啦，换个空花盆吧");
      return;
    }
    const it = ITEMS[itemId];
    if (!it.seed || !takeItem(itemId, 1)) return;
    pot.plantId = it.seed;
    pot.water = 40;
    pot.sun = 40;
    pot.mood = 50;
    pot.growth = 0;
    pot.tendedAt = Date.now();
    save();
    toast(`${it.emoji} 种下了 ${PLANTS[it.seed].name}`);
    renderGarden();
  }

  function tend(act) {
    const pot = state.pots[state.selectedPot];
    if (!pot.plantId) return;

    const careBonus = gardenCfg.careBonus || 1;
    const talkPool =
      gardenCfg.talkLines && gardenCfg.talkLines.length
        ? gardenCfg.talkLines
        : gardenCfg.messages;
    const restPool =
      gardenCfg.restLines && gardenCfg.restLines.length
        ? gardenCfg.restLines
        : gardenCfg.messages;
    const msgPool =
      act === "talk"
        ? talkPool
        : act === "rest"
          ? restPool
          : gardenCfg.messages && gardenCfg.messages.length
            ? gardenCfg.messages
            : null;
    const gardenMsg =
      msgPool && msgPool.length
        ? msgPool[Math.floor(Math.random() * msgPool.length)]
        : null;

    if (act === "water" || act === "sun" || act === "talk" || act === "rest") {
      state._tendsToday = (state._tendsToday || 0) + 1;
    }
    const season = state.season || "dusk";
    let seasonNote = null;
    if (act === "water") {
      pot.water = Math.min(100, pot.water + 28 * careBonus);
      if (season === "autumn") {
        pot.water = Math.min(100, pot.water + 6);
        pot.mood = Math.min(100, pot.mood + 4);
        seasonNote = "秋水温柔";
      }
      toast((gardenMsg ? "💧 " + gardenMsg : "💧 浇了一小壶水") + (seasonNote ? " · " + seasonNote : ""));
      sfx("water");
    } else if (act === "sun") {
      pot.sun = Math.min(100, pot.sun + 28 * careBonus);
      if (season === "summer") {
        pot.sun = Math.min(100, pot.sun + 8);
        pot.growth += 0.08;
        seasonNote = "夏日暖光";
      }
      toast((gardenMsg ? "☀️ " + gardenMsg : "☀️ 把花盆挪到了阳光里") + (seasonNote ? " · " + seasonNote : ""));
    } else if (act === "talk") {
      pot.mood = Math.min(100, pot.mood + 22 * careBonus);
      if (season === "spring") {
        pot.mood = Math.min(100, pot.mood + 8);
        pot.growth += 0.05;
        seasonNote = "春语轻声";
      }
      if (pot.nickname) {
        Core.appendJournal(state, "对「" + pot.nickname + "」说了会儿话。");
      }
      toast((gardenMsg ? "💬 " + gardenMsg : "💬 「今天也慢慢长大吧」") + (seasonNote ? " · " + seasonNote : ""));
    } else if (act === "rest") {
      pot.mood = Math.min(100, pot.mood + 18 * careBonus);
      pot.water = Math.min(100, pot.water + 8);
      pot.sun = Math.max(0, pot.sun - 3);
      pot.growth += 0.08;
      if (season === "winter") {
        pot.mood = Math.min(100, pot.mood + 10);
        pot.water = Math.min(100, pot.water + 4);
        seasonNote = "冬夜安歇";
      }
      pot.tendedAt = Date.now();
      if (!state.stats) state.stats = {};
      state.stats.rests = (state.stats.rests || 0) + 1;
      toast((gardenMsg ? "😴 " + gardenMsg : "😴 陪它歇了一会儿") + (seasonNote ? " · " + seasonNote : ""));
      sfx("ui");
      save();
      renderGarden();
      return;
    } else if (act === "harvest") {
      if (!isReady(pot)) return;
      const def = PLANTS[pot.plantId];
      pot.harvestCount = (pot.harvestCount || 0) + 1;
      const memoryBonus = pot.harvestCount >= 3;
      let n = 1 + (pot.mood > 70 ? 1 : 0) + (memoryBonus ? 1 : 0);
      addItem(def.harvest, n);
      state.hearts += 1;
      state.coins += 3 + (memoryBonus ? 1 : 0);
      if (!state.stats) state.stats = {};
      state.stats.plantsHarvested = (state.stats.plantsHarvested || 0) + 1;
      if (memoryBonus) state.stats.memoryHarvests = (state.stats.memoryHarvests || 0) + 1;
      Core.appendJournal(state, "收获了 " + (ITEMS[def.harvest].name || def.name) + (memoryBonus ? "（熟土记忆）" : "") + "。");
      toast(
        `🌼 收获 ${ITEMS[def.harvest].emoji} ${ITEMS[def.harvest].name} ×${n}` +
          (memoryBonus ? " · 熟土记忆" : "") +
          (pot.harvestCount ? " · 第" + pot.harvestCount + "次" : "")
      );
      sfx("harvest");
      if (pot.mood > 85) {
        const extras = ["petal", "clover", "maple", "stone", "moss", "driftwood", "seashell"];
        const gift = extras[Math.floor((pot.mood + pot.water) % extras.length)];
        addItem(gift, 1);
        toast("✨ 心情好到送了 " + (ITEMS[gift] ? ITEMS[gift].emoji + ITEMS[gift].name : gift));
      }
      // 植物回到抽枝，可继续养
      pot.growth = PLANTS[pot.plantId].days * 0.4;
      pot.water = 30;
      pot.sun = 30;
      pot.mood = memoryBonus ? 48 : 40;
      checkAchievements();
      save();
      refreshResources();
      renderGarden();
      return;
    }

    // 照料推进生长
    const care = (pot.water + pot.sun + pot.mood) / 300;
    pot.growth += 0.35 + care * 0.55;
    // 自然衰减一点点，鼓励再来
    pot.water = Math.max(0, pot.water - 6);
    pot.sun = Math.max(0, pot.sun - 5);
    pot.mood = Math.max(0, pot.mood - 4);
    pot.tendedAt = Date.now();
    save();
    renderGarden();
  }

  (function wireRenamePlant() {
    const side = document.querySelector(".garden-side");
    if (!side || document.getElementById("btn-rename-plant")) return;
    const row = document.createElement("div");
    row.className = "action-row";
    row.innerHTML = '<button type="button" class="soft-btn" id="btn-rename-plant">✏️ 取个小名</button>';
    side.appendChild(row);
    document.getElementById("btn-rename-plant").addEventListener("click", () => {
      const pot = state.pots[state.selectedPot];
      if (!pot || !pot.plantId) { toast("先选一盆有植物的花盆"); return; }
      const name = prompt("给它取个不超过12字的小名：", pot.nickname || "");
      if (name == null) return;
      const r = Core.renamePlant(state, state.selectedPot, name);
      if (!r.ok) { toast("名字不太合适"); return; }
      save();
      renderGarden();
      toast("✏️ 以后就叫「" + r.nickname + "」啦");
      sfx("ui");
    });
  })();

  (function wirePotNote() {
    const btn = document.getElementById("btn-pot-note");
    if (!btn || btn._wired) return;
    btn._wired = true;
    btn.addEventListener("click", () => {
      const pot = state.pots[state.selectedPot];
      if (!pot || !pot.plantId) {
        toast("先选一盆有植物的花盆");
        return;
      }
      const note = prompt("写一句不超过40字的便签：", pot.note || "");
      if (note == null) return;
      const r = Core.setPotNote(state, state.selectedPot, note);
      if (!r.ok) {
        toast(r.reason === "empty_note" ? "便签是空的" : "先种点什么吧");
        return;
      }
      checkAchievements();
      save();
      renderGarden();
      toast("📝 便签贴好了");
      sfx("ui");
    });
  })();

  (function wirePotSnap() {
    const btn = document.getElementById("btn-pot-snap");
    if (!btn || btn._wired) return;
    btn._wired = true;
    btn.addEventListener("click", () => {
      const r = Core.snapshotPot(state, state.selectedPot, PLANTS);
      if (!r.ok) {
        toast("先选一盆有植物的花盆");
        return;
      }
      checkAchievements();
      save();
      toast("📷 速写好了：" + r.card.emoji + " " + r.card.name + " · 心情 " + r.card.mood);
      sfx("snap");
    });
  })();

  (function wirePotSwap() {
    const btn = document.getElementById("btn-pot-swap");
    if (!btn || btn._wired) return;
    btn._wired = true;
    btn.addEventListener("click", () => {
      const a = state.selectedPot | 0;
      const raw = prompt("与第几盆对调？（输入 1–" + state.pots.length + "）", String(((a + 1) % state.pots.length) + 1));
      if (raw == null) return;
      const b = (parseInt(raw, 10) || 0) - 1;
      const r = Core.swapPots(state, a, b);
      if (!r.ok) {
        toast(r.reason === "same" ? "选了同一盆" : "盆号不太对");
        return;
      }
      checkAchievements();
      save();
      renderGarden();
      toast("🔄 花盆对调好了");
      sfx("ui");
    });
  })();

  (function wireFavPlant() {
    const btn = document.getElementById("btn-fav-plant");
    if (!btn || btn._wired) return;
    btn._wired = true;
    btn.addEventListener("click", () => {
      const pot = state.pots[state.selectedPot];
      if (!pot || !pot.plantId) {
        toast("先选一盆有植物的花盆");
        return;
      }
      const r = Core.setFavoritePlant(state, pot.plantId);
      if (!r.ok) {
        toast("没能标记");
        return;
      }
      checkAchievements();
      save();
      renderGarden();
      toast("★ 已记成最想照料的植物");
      sfx("pin");
    });
  })();

  
  
  (function wireFavCup() {
    const btn = document.getElementById("btn-fav-cup");
    if (!btn || btn._wired) return;
    btn._wired = true;
    btn.addEventListener("click", () => {
      const cup = state.craft && state.craft.cup;
      if (!cup) { toast("先选一个杯型"); return; }
      const r = Core.setFavoriteCup(state, cup);
      if (!r.ok) return;
      save();
      const lab = document.getElementById("fav-cup-label");
      if (lab) lab.textContent = "常用：" + cup;
      toast("★ 常用杯型已记下");
      sfx("pin");
    });
  })();

(function wireUpgradeCan() {
    const btn = document.getElementById("btn-upgrade-can");
    if (!btn || btn._wired) return;
    btn._wired = true;
    btn.addEventListener("click", () => {
      const r = Core.upgradeWateringCan(state, 20);
      if (!r.ok) {
        toast(r.reason === "coins" ? "金币还不够扩水壶" : "水壶已经够大啦");
        return;
      }
      save();
      refreshResources();
      renderGarden();
      toast("🪣 水壶容量 " + r.max + " 格");
      sfx("unlock");
    });
  })();

(function wireWateringCan() {
    const btn = document.getElementById("btn-watering-can");
    if (!btn || btn._wired) return;
    btn._wired = true;
    btn.addEventListener("click", () => {
      const pot = state.pots[state.selectedPot];
      if (!pot || !pot.plantId) {
        toast("先选一盆有植物的花盆");
        return;
      }
      const r = Core.useWateringCan(state, state.selectedPot, PLANTS);
      if (!r.ok) {
        toast("这盆现在浇不了");
        return;
      }
      checkAchievements();
      Core.evaluateDailyGoals(state);
      save();
      renderGarden();
      refreshResources();
      if (r.usedCan) {
        const canLines = (gardenCfg.canLines && gardenCfg.canLines.length) ? gardenCfg.canLines : null;
        const line = canLines ? canLines[Math.floor(Math.random() * canLines.length)] : null;
        toast(
          (line ? "🪣 " + line : "🪣 水壶浇灌 +" + r.bonus + " 水分") +
            " · 剩余 " +
            r.charge +
            (r.seasonNote ? " · " + r.seasonNote : "")
        );
        sfx("can");
      } else {
        toast("🪣 水壶空了，改用手浇 · 去小路蓄水吧");
        sfx("water");
      }
    });
  })();

  document.getElementById("plant-actions").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    tend(btn.dataset.act);
  });

  // ---------- 汽水铺 ----------
  function randomCustomer() {
    const c = Core.pickCustomerWithPin
      ? Core.pickCustomerWithPin(state, CUSTOMERS, Math.random)
      : Object.assign({}, CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)], { id: Date.now() });
    const next = { ...c, id: c.id || Date.now() };
    if (state.lastServedFlavor && Math.random() < 0.35) {
      next.favoriteFlavor = state.lastServedFlavor;
    }
    return next;
  }

  function renderShop() {
    const c = state.customer;
    document.getElementById("customer-avatar").textContent = c.avatar;
    const pinMark = state.pinnedCustomer === c.name ? " 📌" : "";
    document.getElementById("customer-name").textContent = c.name + pinMark + (c.pinned ? " · 又来了" : "");
    let wishText = c.wish;
    if (Core.getSettings(state).quietShop) {
      const tag = (c.tags && c.tags[0]) || "清爽";
      wishText = "想喝点" + tag + "的就好。";
    }
    document.getElementById("customer-wish").textContent = wishText;
    const aff = (state.customerAffinity && state.customerAffinity[c.name]) || 0;
    if (aff > 0) {
      document.getElementById("customer-wish").textContent =
        document.getElementById("customer-wish").textContent + "（熟悉度 " + aff + "）";
    }
    const noteLine = document.getElementById("guest-note-line");
    if (noteLine) {
      const gn = state.guestNotes && c.name ? state.guestNotes[c.name] : null;
      noteLine.textContent = gn ? "📝 便签：「" + gn + "」" : "";
    }
    const tags = document.getElementById("customer-tags");
    const tagList = Core.getSettings(state).quietShop
      ? [(c.tags && c.tags[0]) || "清爽"]
      : (c.tags || []);
    tags.innerHTML = tagList
      .map((t) => {
        const cls = ["果香", "甜蜜", "花香", "草本"].includes(t)
          ? "tag flavor"
          : ["清爽", "温柔", "田园"].includes(t)
            ? "tag vibe"
            : "tag";
        return `<span class="${cls}">${t}</span>`;
      })
      .join("");

    if (!state.craft.cup && state.favoriteCupId) state.craft.cup = state.favoriteCupId;
    renderChoices("cups", CUPS, "cup", () => true);
    const favLab = document.getElementById("fav-cup-label");
    if (favLab) favLab.textContent = state.favoriteCupId ? ("常用：" + state.favoriteCupId) : "";
    renderChoices("bases", BASES, "base", (b) => !b.need || hasItem(b.need));
    renderChoices("flavors", FLAVORS, "flavor", (f) => !f.need || hasItem(f.need));
    renderChoices("toppings", TOPPINGS, "topping", (t) => !t.need || hasItem(t.need));
    const special = Core.getDailySpecial ? Core.getDailySpecial(state) : null;
    const specialEl = document.getElementById("daily-special-hint");
    if (specialEl && special) {
      specialEl.textContent = special.hint + "（命中有小奖励）";
    }
    const tipEl = document.getElementById("tip-jar-status");
    if (tipEl) {
      const jar = (state.tipJar && state.tipJar.coins) || 0;
      tipEl.textContent = "小费罐：" + jar + " / 10";
    }
    const boardEl = document.getElementById("guest-board");
    if (boardEl && Core.getTopGuests) {
      const top = Core.getTopGuests(state, 3);
      boardEl.textContent = top.length
        ? "常客小黑板：" + top.map((g) => g.name + "×" + g.affinity).join(" · ")
        : "常客小黑板：还没有名字";
    }
    const pinRecEl = document.getElementById("pinned-recipe-status");
    if (pinRecEl) {
      const pr = Core.getPinnedRecipe ? Core.getPinnedRecipe(state, secretRecipes) : { ok: false };
      pinRecEl.textContent = pr.ok
        ? "钉住的配方：" + (pr.recipe.name || pr.recipe.id)
        : state.pinnedRecipeId
          ? "钉住的配方：" + state.pinnedRecipeId + "（尚未解锁）"
          : "钉住的配方：无";
    }
    const pinFlEl = document.getElementById("pinned-flavor-status");
    if (pinFlEl) {
      const fid = Core.getPinnedFlavor ? Core.getPinnedFlavor(state) : state.pinnedFlavorId;
      const fl = fid && FLAVORS && FLAVORS.find ? FLAVORS.find((f) => f.id === fid) : null;
      pinFlEl.textContent = fid
        ? "调味架：" + ((fl && fl.name) || fid) + " ★"
        : "调味架：无";
    }
    updateDrinkPreview();
    renderShopShelf();
  }

  function renderChoices(elId, list, key, canUse) {
    const box = document.getElementById(elId);
    box.innerHTML = "";
    const pinnedFid =
      key === "flavor"
        ? Core.getPinnedFlavor
          ? Core.getPinnedFlavor(state)
          : state.pinnedFlavorId
        : null;
    list.forEach((opt) => {
      const ok = canUse(opt);
      const btn = document.createElement("button");
      const isPinned = pinnedFid && opt.id === pinnedFid;
      btn.className =
        "choice" +
        (state.craft[key] === opt.id ? " selected" : "") +
        (isPinned ? " pinned-flavor" : "");
      btn.disabled = !ok;
      if (isPinned) btn.title = "调味架上的风味";
      const needHtml = opt.need
        ? `<span class="need">${ok ? "×" + (state.bag[opt.need] || 0) : "缺少"}</span>`
        : "";
      const pinMark = isPinned ? " ★" : "";
      btn.innerHTML = `<span>${opt.emoji}</span><span>${opt.name}${pinMark}</span>${needHtml}`;
      btn.addEventListener("click", () => {
        state.craft[key] = opt.id;
        save();
        renderShop();
      });
      box.appendChild(btn);
    });
  }

  function updateDrinkPreview() {
    const { cup, base, flavor, topping } = state.craft;
    const liquid = document.getElementById("drink-liquid");
    const bubbles = document.getElementById("drink-bubbles");
    const topEl = document.getElementById("drink-topping");
    const nameEl = document.getElementById("drink-name");
    const serveBtn = document.getElementById("btn-serve");

    const baseDef = BASES.find((b) => b.id === base);
    const flavorDef = FLAVORS.find((f) => f.id === flavor);
    const topDef = TOPPINGS.find((t) => t.id === topping);
    const cupDef = CUPS.find((c) => c.id === cup);

    if (baseDef) {
      liquid.style.height = "72%";
      let colors = baseDef.color;
      if (flavorDef && flavorDef.id === "berry") colors = ["#e8c0d8", "#c878a8"];
      if (flavorDef && flavorDef.id === "peach") colors = ["#f8d0b8", "#f0a888"];
      if (flavorDef && flavorDef.id === "mint") colors = ["#c8f0d8", "#78c8a0"];
      if (flavorDef && flavorDef.id === "honey") colors = ["#f8e8b0", "#e0c868"];
      if (flavorDef && flavorDef.id === "jasmine") colors = ["#f0f0d8", "#d8d8a8"];
      liquid.style.background = `linear-gradient(180deg, ${colors[0]}, ${colors[1]})`;
    } else {
      liquid.style.height = "0%";
    }

    bubbles.className = "bubbles" + (base === "soda" || base === "lemon" ? " on" : "");
    if (bubbles.classList.contains("on") && !bubbles.childElementCount) {
      bubbles.innerHTML = "";
      for (let i = 0; i < 8; i++) {
        const s = document.createElement("span");
        s.style.left = 12 + Math.random() * 70 + "%";
        s.style.animationDelay = Math.random() * 2 + "s";
        s.style.width = s.style.height = 4 + Math.random() * 5 + "px";
        bubbles.appendChild(s);
      }
    }

    topEl.textContent = topDef && topDef.id !== "none" ? topDef.emoji : "";

    if (cupDef && baseDef && flavorDef) {
      const parts = [flavorDef.name, baseDef.name.replace(/底|水/, "")];
      if (topDef && topDef.id !== "none") parts.push(topDef.name);
      let title = parts.join("·") + "汽水";
      const hint = Core.recipeMatchHint(state.craft, secretRecipes);
      if (hint.perfect) {
        title += " · ✨ 像一本秘密配方";
      } else if (hint.close && hint.close.length) {
        title += " · 隐约接近某道配方";
      }
      nameEl.textContent = title;
      serveBtn.disabled = false;
    } else {
      nameEl.textContent = "选齐杯型、基底和风味吧";
      serveBtn.disabled = true;
    }
  }

  function scoreDrink() {
    const c = state.customer;
    const cupDef = CUPS.find((x) => x.id === state.craft.cup);
    const baseDef = BASES.find((x) => x.id === state.craft.base);
    const flavorDef = FLAVORS.find((x) => x.id === state.craft.flavor);
    const topDef = TOPPINGS.find((x) => x.id === state.craft.topping);

    let score = 1; // 至少温柔接纳
    const notes = [];

    if (c.flavors.includes(flavorDef.id) || (flavorDef.id === "plain" && c.flavors.includes("plain"))) {
      score += 2;
      notes.push("风味很合心意");
    } else if (flavorDef.tags.some((t) => c.tags.includes(t))) {
      score += 1;
      notes.push("味道方向对了");
    }
    if (c.favoriteFlavor && flavorDef.id === c.favoriteFlavor) {
      score += 0.5;
      notes.push("记得你上次的味道");
    }

    if (baseDef.vibe && c.tags.includes(baseDef.vibe)) {
      score += 1;
      notes.push("基底很搭");
    }
    if (cupDef.vibe && c.tags.includes(cupDef.vibe)) {
      score += 1;
      notes.push("杯子选得好");
    }
    const season = state.season || "dusk";
    if (season === "spring" && (flavorDef.id === "jasmine" || flavorDef.id === "lavender_bud" || flavorDef.id === "lilac" || flavorDef.id === "chamomile" || flavorDef.id === "honeysuckle" || flavorDef.id === "bergamot" || flavorDef.id === "violet" || flavorDef.id === "calendula" || flavorDef.id === "rose_petal" || flavorDef.id === "elderflower" || flavorDef.id === "loquat" || flavorDef.id === "vanilla" || baseDef.id === "floral_tea")) {
      score += 0.5; notes.push("春日花香");
    }
    if (season === "summer" && (flavorDef.id === "mint" || flavorDef.id === "rosemary" || flavorDef.id === "bluebell" || flavorDef.id === "matcha" || flavorDef.id === "perilla" || flavorDef.id === "thyme" || flavorDef.id === "dill" || flavorDef.id === "basil" || flavorDef.id === "lemongrass" || flavorDef.id === "coriander" || flavorDef.id === "lemon_balm" || flavorDef.id === "marjoram" || flavorDef.id === "hibiscus" || flavorDef.id === "elderflower" || flavorDef.id === "sea_lavender" || flavorDef.id === "mulberry" || flavorDef.id === "strawberry" || flavorDef.id === "blueberry" || flavorDef.id === "pomegranate" || flavorDef.id === "yangmei" || flavorDef.id === "litchi" || flavorDef.id === "olive" || flavorDef.id === "mango" || flavorDef.id === "pineapple" || flavorDef.id === "coconut" || flavorDef.id === "starfruit" || flavorDef.id === "passion_fruit" || flavorDef.id === "kiwi" || flavorDef.id === "dragonfruit" || flavorDef.id === "guava" || flavorDef.id === "cherry" || flavorDef.id === "apricot" || flavorDef.id === "grapefruit" || flavorDef.id === "tangerine" || flavorDef.id === "wax_apple" || flavorDef.id === "sugarcane" || flavorDef.id === "lemon" || flavorDef.id === "lime" || flavorDef.id === "cranberry" || flavorDef.id === "elderberry" || flavorDef.id === "honeydew" || flavorDef.id === "watermelon" || flavorDef.id === "cantaloupe" || flavorDef.id === "papaya" || flavorDef.id === "rambutan" || flavorDef.id === "jackfruit" || flavorDef.id === "oregano" || flavorDef.id === "chive" || flavorDef.id === "parsley" || flavorDef.id === "avocado" || flavorDef.id === "chervil" || flavorDef.id === "sorrel" || flavorDef.id === "verbena" || flavorDef.id === "savory" || flavorDef.id === "celery_seed" || flavorDef.id === "galangal" || flavorDef.id === "kaffir_lime" || flavorDef.id === "pandan" || flavorDef.id === "juniper" || flavorDef.id === "sumac" || flavorDef.id === "nigella" || flavorDef.id === "mustard_seed" || flavorDef.id === "wasabi" || flavorDef.id === "dandelion" || flavorDef.id === "nettle" || flavorDef.id === "borage" || flavorDef.id === "hops" || flavorDef.id === "heather" || flavorDef.id === "arnica" || flavorDef.id === "echinacea" || flavorDef.id === "feverfew" || flavorDef.id === "lemon_verbena" || flavorDef.id === "mullein" || flavorDef.id === "plantain_leaf" || flavorDef.id === "bee_balm" || flavorDef.id === "marshmallow" || flavorDef.id === "goldenrod" || flavorDef.id === "red_clover" || flavorDef.id === "white_clover" || flavorDef.id === "catnip" || flavorDef.id === "tansy" || flavorDef.id === "agrimony" || flavorDef.id === "milfoil" || flavorDef.id === "lady_mantle" || flavorDef.id === "speedwell" || flavorDef.id === "stitchwort" || flavorDef.id === "campion" || flavorDef.id === "silverweed" || flavorDef.id === "loosestrife" || flavorDef.id === "willowherb" || flavorDef.id === "bedstraw" || flavorDef.id === "cleavers" || flavorDef.id === "bugle" || flavorDef.id === "primrose" || flavorDef.id === "cowslip" || flavorDef.id === "oxeye" || flavorDef.id === "knapweed" || flavorDef.id === "scabious" || flavorDef.id === "nettle_seed" || flavorDef.id === "rowan" || flavorDef.id === "crabapple" || flavorDef.id === "serviceberry" || flavorDef.id === "elderflower_fresh" || flavorDef.id === "meadowsweet_fresh" || flavorDef.id === "wood_sorrel" || flavorDef.id === "wild_garlic" || flavorDef.id === "ramsons" || flavorDef.id === "jack_by_hedge" || flavorDef.id === "hedge_mustard" || flavorDef.id === "watercress" || flavorDef.id === "brooklime" || flavorDef.id === "cloudberry" || flavorDef.id === "lingonberry" || flavorDef.id === "bilberry" || flavorDef.id === "gooseberry" || flavorDef.id === "currant_red" || flavorDef.id === "currant_black" || flavorDef.id === "whitecurrant" || flavorDef.id === "sea_buckthorn" || flavorDef.id === "damson" || flavorDef.id === "greengage" || flavorDef.id === "mirabelle" || flavorDef.id === "saskatoon" || flavorDef.id === "chokeberry" || flavorDef.id === "yarrow_white" || flavorDef.id === "achillea_pink" || flavorDef.id === "cornflower" || flavorDef.id === "poppy_seed" || flavorDef.id === "flax_flower" || flavorDef.id === "chia_seed" || flavorDef.id === "sunflower_seed" || flavorDef.id === "fennel_pollen" || flavorDef.id === "fennel_frond" || flavorDef.id === "dill_pollen" || flavorDef.id === "celery_leaf" || flavorDef.id === "rooibos" || flavorDef.id === "honeybush" || flavorDef.id === "yerba_mate" || flavorDef.id === "guayusa" || flavorDef.id === "gardenia" || flavorDef.id === "magnolia" || flavorDef.id === "frangipani" || flavorDef.id === "plumeria" || flavorDef.id === "stephanotis" || flavorDef.id === "garden_phlox" || flavorDef.id === "osmanthus_fresh" || flavorDef.id === "galangal_fresh" || flavorDef.id === "ginger_flower" || flavorDef.id === "turmeric_fresh" || flavorDef.id === "cubeb" || flavorDef.id === "makrut_leaf" || flavorDef.id === "curry_leaf" || flavorDef.id === "holy_basil" || flavorDef.id === "thai_basil" || flavorDef.id === "lemon_basil" || flavorDef.id === "rambutan_fresh" || flavorDef.id === "lychee_fresh" || flavorDef.id === "mangosteen" || flavorDef.id === "durian_flower" || flavorDef.id === "tamarind" || flavorDef.id === "calamansi" || flavorDef.id === "fig_fresh" || flavorDef.id === "pomegranate_seed" || flavorDef.id === "cactus_pear" || flavorDef.id === "prickly_pear" || flavorDef.id === "sapodilla" || flavorDef.id === "soursop" || flavorDef.id === "cherimoya" || flavorDef.id === "feijoa" || flavorDef.id === "loquat_fresh" || flavorDef.id === "jujube_fresh" || flavorDef.id === "mulberry_white" || flavorDef.id === "mulberry_black" || flavorDef.id === "elderberry_fresh" || flavorDef.id === "bergamot_fresh" || flavorDef.id === "sudachi" || flavorDef.id === "kabosu" || flavorDef.id === "amanatsu" || flavorDef.id === "shiso_green" || flavorDef.id === "shiso_red" || flavorDef.id === "mitsuba" || flavorDef.id === "myoga" || flavorDef.id === "wasabi_leaf" || flavorDef.id === "sansho" || flavorDef.id === "kinome" || flavorDef.id === "gentian" || flavorDef.id === "arnica_montana" || flavorDef.id === "alpine_strawberry" || flavorDef.id === "bilberry_leaf" || flavorDef.id === "spruce_tip" || flavorDef.id === "olive_leaf" || flavorDef.id === "caper" || flavorDef.id === "zaatar" || flavorDef.id === "sumac_berry" || flavorDef.id === "orange_blossom" || flavorDef.id === "lavender_honey" || flavorDef.id === "thyme_honey" || flavorDef.id === "acacia_honey" || flavorDef.id === "manuka" || flavorDef.id === "bee_pollen" || flavorDef.id === "comb_honey" || flavorDef.id === "linden_honey" || flavorDef.id === "heather_honey_wild" || flavorDef.id === "wildflower_honey" || flavorDef.id === "clover_honey" || flavorDef.id === "eucalyptus_honey" || flavorDef.id === "mesquite" || flavorDef.id === "lucuma" || flavorDef.id === "camu_camu" || flavorDef.id === "acai" || flavorDef.id === "maqui" || flavorDef.id === "goji_fresh" || flavorDef.id === "amla" || flavorDef.id === "baobab" || flavorDef.id === "morinda" || flavorDef.id === "noni" || flavorDef.id === "cupuacu" || flavorDef.id === "matcha_ceremonial" || flavorDef.id === "sencha" || flavorDef.id === "gyokuro" || flavorDef.id === "bancha" || flavorDef.id === "kukicha" || flavorDef.id === "mugicha" || flavorDef.id === "barley_grass" || flavorDef.id === "wheatgrass" || flavorDef.id === "spirulina" || flavorDef.id === "chlorella" || flavorDef.id === "kelp" || flavorDef.id === "nori" || flavorDef.id === "hibiscus_fresh" || flavorDef.id === "chrysanthemum_fresh" || flavorDef.id === "peony" || flavorDef.id === "lotus_leaf_fresh" || flavorDef.id === "osmanthus_sugar" || flavorDef.id === "orchid_petal" || flavorDef.id === "bamboo_leaf_fresh" || flavorDef.id === "bamboo_shoot_fresh" || flavorDef.id === "safflower" || flavorDef.id === "calendula_fresh" || flavorDef.id === "pot_marigold" || flavorDef.id === "coreopsis" || flavorDef.id === "cosmos" || flavorDef.id === "zinnia" || flavorDef.id === "dahlia" || flavorDef.id === "gladiolus" || flavorDef.id === "iris" || flavorDef.id === "tulip" || flavorDef.id === "ranunculus" || flavorDef.id === "sweet_pea" || flavorDef.id === "nasturtium" || flavorDef.id === "morning_glory" || flavorDef.id === "clematis" || flavorDef.id === "wisteria_fresh" || flavorDef.id === "jasmine_sambac" || flavorDef.id === "gardenia_tea" || flavorDef.id === "boysenberry" || flavorDef.id === "loganberry" || flavorDef.id === "tayberry" || flavorDef.id === "marionberry" || flavorDef.id === "wineberry" || flavorDef.id === "salmonberry" || flavorDef.id === "thimbleberry" || flavorDef.id === "cloudberry_leaf" || flavorDef.id === "lovage_fresh" || flavorDef.id === "sweet_cicely" || flavorDef.id === "ramsons_flower" || flavorDef.id === "sea_kale" || flavorDef.id === "scurvygrass" || flavorDef.id === "marsh_samphire" || flavorDef.id === "agave_nectar" || flavorDef.id === "prickly_pear_pad" || flavorDef.id === "jojoba" || flavorDef.id === "mesquite_pod" || flavorDef.id === "creosote" || flavorDef.id === "desert_sage" || flavorDef.id === "yucca_flower" || flavorDef.id === "yerba_santa" || flavorDef.id === "cedron" || flavorDef.id === "muña" || flavorDef.id === "coca_leaf_tea" || flavorDef.id === "guarana" || flavorDef.id === "stevia_leaf" || flavorDef.id === "rooibos_green" || flavorDef.id === "honeybush_fresh" || flavorDef.id === "buchu" || flavorDef.id === "baobab_leaf" || flavorDef.id === "marula" || flavorDef.id === "kinkeliba" || flavorDef.id === "hibiscus_sab" || flavorDef.id === "pandan_fresh" || flavorDef.id === "lemongrass_fresh" || flavorDef.id === "galangal_leaf" || flavorDef.id === "torch_ginger" || flavorDef.id === "butterfly_pea" || flavorDef.id === "chrysanthemum_ind" || flavorDef.id === "tamarind_leaf" || flavorDef.id === "coconut_flower" || flavorDef.id === "bergamot_leaf" || flavorDef.id === "neroli" || flavorDef.id === "petitgrain" || flavorDef.id === "immortelle" || flavorDef.id === "helichrysum" || flavorDef.id === "cistus" || flavorDef.id === "spruce_beer" || flavorDef.id === "fireweed" || flavorDef.id === "fireweed_honey" || flavorDef.id === "crowberry" || flavorDef.id === "bearberry" || flavorDef.id === "labrador_violet" || flavorDef.id === "matcha_salt" || flavorDef.id === "sansho_leaf" || flavorDef.id === "shiso_flower" || flavorDef.id === "sakura_leaf" || flavorDef.id === "lavender_sugar" || flavorDef.id === "rose_water" || flavorDef.id === "orange_flower_water" || flavorDef.id === "almond_blossom" || flavorDef.id === "chestnut_flower" || flavorDef.id === "maesil" || flavorDef.id === "persimmon_leaf" || flavorDef.id === "pine_flower" || flavorDef.id === "tulsi" || flavorDef.id === "neem_flower" || flavorDef.id === "curry_blossom" || flavorDef.id === "ajwain_leaf" || flavorDef.id === "fenugreek_leaf" || flavorDef.id === "moringa" || flavorDef.id === "gotu_kola" || flavorDef.id === "brahmi" || flavorDef.id === "hibiscus_rosa" || flavorDef.id === "allspice_berry" || flavorDef.id === "annatto" || flavorDef.id === "epazote" || flavorDef.id === "papalo" || flavorDef.id === "hoja_santa" || flavorDef.id === "mexican_oregano" || flavorDef.id === "chile_flower" || flavorDef.id === "noni_leaf" || flavorDef.id === "ti_leaf" || flavorDef.id === "frangipani_tea" || flavorDef.id === "soursop_leaf" || flavorDef.id === "guava_leaf" || flavorDef.id === "passion_leaf" || flavorDef.id === "vanilla_orchid" || flavorDef.id === "longjing" || flavorDef.id === "biluochun" || flavorDef.id === "puer_raw" || flavorDef.id === "white_peony_tea" || flavorDef.id === "valerian_flower" || flavorDef.id === "hops_flower" || flavorDef.id === "meadowsweet_flower" || flavorDef.id === "yarrow_flower" || flavorDef.id === "nettle_seed_tea" || flavorDef.id === "silver_birch" || flavorDef.id === "copper_beech" || flavorDef.id === "hornbeam" || flavorDef.id === "field_maple" || flavorDef.id === "wild_service" || flavorDef.id === "guelder_rose" || flavorDef.id === "wayfaring" || flavorDef.id === "dogwood" || flavorDef.id === "spindle" || flavorDef.id === "buckthorn" || flavorDef.id === "privet" || flavorDef.id === "boxwood" || flavorDef.id === "bluebell_fresh" || flavorDef.id === "primula_veris" || flavorDef.id === "oxlip" || flavorDef.id === "cowslip_fresh" || flavorDef.id === "wood_anemone" || flavorDef.id === "wood_sorrel_pink" || flavorDef.id === "greater_stitchwort" || flavorDef.id === "red_campion" || flavorDef.id === "white_campion" || flavorDef.id === "ragged_robin" || flavorDef.id === "cuckooflower" || flavorDef.id === "lady_smock" || flavorDef.id === "garlic_mustard_fl" || flavorDef.id === "hedge_garlic_seed" || flavorDef.id === "jack_hedge_leaf" || flavorDef.id === "wild_mustard" || baseDef.id === "soda" || baseDef.id === "berry_soda")) {
      score += 0.5; notes.push("夏日清爽");
    }
    if (season === "autumn" && (flavorDef.id === "honey" || flavorDef.id === "peach" || flavorDef.id === "tea_leaf" || flavorDef.id === "fennel" || flavorDef.id === "cardamom" || flavorDef.id === "ginger" || flavorDef.id === "calendula" || flavorDef.id === "chrysanthemum" || flavorDef.id === "hibiscus" || flavorDef.id === "plum" || flavorDef.id === "grape" || flavorDef.id === "mulberry" || flavorDef.id === "persimmon" || flavorDef.id === "fig" || flavorDef.id === "longan" || flavorDef.id === "hawthorn" || flavorDef.id === "pear" || flavorDef.id === "apricot" || flavorDef.id === "maple_syrup" || flavorDef.id === "sesame" || flavorDef.id === "chestnut" || flavorDef.id === "cinnamon" || flavorDef.id === "clove" || flavorDef.id === "pistachio")) {
      score += 0.5; notes.push("秋日温甜");
    }
    if (season === "winter" && (baseDef.id === "tea" || baseDef.id === "honey_water" || flavorDef.id === "tea_leaf" || flavorDef.id === "yuzu" || flavorDef.id === "ginger" || flavorDef.id === "honey" || flavorDef.id === "pine_needle" || flavorDef.id === "chrysanthemum" || flavorDef.id === "kumquat" || flavorDef.id === "jujube" || flavorDef.id === "cocoa" || flavorDef.id === "vanilla" || flavorDef.id === "almond" || flavorDef.id === "hazelnut" || flavorDef.id === "maple_syrup" || flavorDef.id === "sesame" || flavorDef.id === "walnut" || flavorDef.id === "saffron" || flavorDef.id === "pistachio" || flavorDef.id === "chestnut" || flavorDef.id === "cinnamon" || flavorDef.id === "clove" || flavorDef.id === "star_anise" || flavorDef.id === "nutmeg" || flavorDef.id === "goji" || flavorDef.id === "bay_leaf" || flavorDef.id === "tarragon" || flavorDef.id === "date_fruit" || flavorDef.id === "hyssop" || flavorDef.id === "lovage" || flavorDef.id === "anise_seed" || flavorDef.id === "turmeric" || flavorDef.id === "allspice" || flavorDef.id === "mace" || flavorDef.id === "caraway" || flavorDef.id === "cumin" || flavorDef.id === "fenugreek" || flavorDef.id === "ajwain" || flavorDef.id === "myrtle" || flavorDef.id === "chicory" || flavorDef.id === "nettle" || flavorDef.id === "yarrow" || flavorDef.id === "woodruff" || flavorDef.id === "valerian" || flavorDef.id === "meadowsweet" || flavorDef.id === "angelica" || flavorDef.id === "comfrey" || flavorDef.id === "selfheal" || flavorDef.id === "skullcap" || flavorDef.id === "linden" || flavorDef.id === "horehound" || flavorDef.id === "motherwort" || flavorDef.id === "betony" || flavorDef.id === "avens" || flavorDef.id === "tormentil" || flavorDef.id === "figwort" || flavorDef.id === "ground_ivy" || flavorDef.id === "self_heal_spike" || flavorDef.id === "teasel" || flavorDef.id === "burdock" || flavorDef.id === "hawthorn_berry" || flavorDef.id === "rosehip" || flavorDef.id === "sloe" || flavorDef.id === "wintercress" || flavorDef.id === "medlar" || flavorDef.id === "quince" || flavorDef.id === "aronia" || flavorDef.id === "flax_seed" || flavorDef.id === "hemp_seed" || flavorDef.id === "pumpkin_seed" || flavorDef.id === "sesame_black" || flavorDef.id === "sesame_white" || flavorDef.id === "lapacho" || flavorDef.id === "sassafras" || flavorDef.id === "birch_bark" || flavorDef.id === "pine_resin" || flavorDef.id === "tuberose" || flavorDef.id === "cardamom_green" || flavorDef.id === "cardamom_black" || flavorDef.id === "long_pepper" || flavorDef.id === "grains_of_paradise" || flavorDef.id === "cinnamon_leaf" || flavorDef.id === "clove_bud" || flavorDef.id === "allspice_leaf" || flavorDef.id === "reindeer_moss" || flavorDef.id === "iceland_moss" || flavorDef.id === "oak_moss" || flavorDef.id === "usnea" || flavorDef.id === "chaga" || flavorDef.id === "reishi" || flavorDef.id === "lion_mane" || flavorDef.id === "maitake" || flavorDef.id === "jackfruit_seed" || flavorDef.id === "rowan_jelly" || flavorDef.id === "quince_paste" || flavorDef.id === "yuzu_fresh" || flavorDef.id === "ponkan" || flavorDef.id === "dekopon" || flavorDef.id === "hassaku" || flavorDef.id === "yuzu_kosho" || flavorDef.id === "edelweiss" || flavorDef.id === "juniper_berry" || flavorDef.id === "fir_needle" || flavorDef.id === "myrtle_berry" || flavorDef.id === "mastic" || flavorDef.id === "saffron_crocus" || flavorDef.id === "buckwheat_honey" || flavorDef.id === "chestnut_honey" || flavorDef.id === "propolis" || flavorDef.id === "royal_jelly" || flavorDef.id === "mead_herb" || flavorDef.id === "cacao_nibs" || flavorDef.id === "cacao_husk" || flavorDef.id === "carob" || flavorDef.id === "maca" || flavorDef.id === "schisandra" || flavorDef.id === "hojicha" || flavorDef.id === "genmaicha" || flavorDef.id === "sobacha" || flavorDef.id === "job_tears" || flavorDef.id === "rose_hip_tea" || flavorDef.id === "camellia_fresh" || flavorDef.id === "lotus_seed_fresh" || flavorDef.id === "plum_blossom" || flavorDef.id === "wintersweet" || flavorDef.id === "ginkgo_leaf_fresh" || flavorDef.id === "ginkgo_nut_fresh" || flavorDef.id === "osmanthus_wine" || flavorDef.id === "crocus" || flavorDef.id === "snowdrop" || flavorDef.id === "crocus_yellow" || flavorDef.id === "hyacinth" || flavorDef.id === "daffodil" || flavorDef.id === "moonflower" || flavorDef.id === "magnolia_bark" || flavorDef.id === "eucommia" || flavorDef.id === "astragalus" || flavorDef.id === "codonopsis" || flavorDef.id === "rehmannia" || flavorDef.id === "polygonatum" || flavorDef.id === "ophiopogon" || flavorDef.id === "angelica_arch" || flavorDef.id === "wood_avense" || flavorDef.id === "ephedra" || flavorDef.id === "boldo" || flavorDef.id === "cupuacu_butter" || flavorDef.id === "sutherlandia" || flavorDef.id === "citron" || flavorDef.id === "bergamot_peel" || flavorDef.id === "labrador_tea" || flavorDef.id === "arctic_willow" || flavorDef.id === "kinako" || flavorDef.id === "kuromitsu" || flavorDef.id === "yuzu_peel" || flavorDef.id === "ume_blossom" || flavorDef.id === "vanilla_bean" || flavorDef.id === "tonka_bean" || flavorDef.id === "hazelnut_flower" || flavorDef.id === "omija" || flavorDef.id === "yuja" || flavorDef.id === "ssanghwa" || flavorDef.id === "jujube_tea" || flavorDef.id === "ginger_tea_kr" || flavorDef.id === "kava" || flavorDef.id === "tieguanyin" || flavorDef.id === "dahongpao" || flavorDef.id === "puer_ripe" || flavorDef.id === "shoumei" || flavorDef.id === "burdock_root" || flavorDef.id === "dandelion_root" || flavorDef.id === "chicory_root" || flavorDef.id === "holly_leaf" || flavorDef.id === "ivy_berry" || flavorDef.id === "mistletoe" || flavorDef.id === "yew_berry")) {
      score += 0.5; notes.push("冬日暖茶");
    }
    if (
      (cupDef && (cupDef.id === "mug" || cupDef.id === "warm" || cupDef.vibe === "温柔" || cupDef.vibe === "温暖")) ||
      (baseDef && (baseDef.id === "honey_water" || baseDef.id === "tea"))
    ) {
      if (flavorDef.id === "cocoa" || flavorDef.id === "vanilla" || flavorDef.id === "almond" || flavorDef.id === "hazelnut" || flavorDef.id === "maple_syrup" || flavorDef.id === "sesame" || flavorDef.id === "walnut" || flavorDef.id === "saffron" || flavorDef.id === "pistachio" || flavorDef.id === "chestnut" || flavorDef.id === "cinnamon" || flavorDef.id === "clove" || flavorDef.id === "star_anise" || flavorDef.id === "nutmeg" || flavorDef.id === "date_fruit" || flavorDef.id === "goji") {
        score += 0.25; notes.push("甜点一角");
      }
    }
    if (season === "dusk" && topDef && topDef.id !== "none") { score += 0.25; notes.push("黄昏点缀"); }
    if (season === "dusk" && topDef && topDef.id === "camellia_top") { score += 0.25; notes.push("暮色山茶"); }
    if (c.wantTopping && topDef && topDef.id !== "none") {
      score += 1;
      notes.push("装饰很可爱");
    }
    if (topDef && topDef.id !== "none" && !c.wantTopping) {
      score += 0.5;
    }
    const aff = (state.customerAffinity && c.name && state.customerAffinity[c.name]) || 0;
    const affThreshold = (Core.ECONOMY && Core.ECONOMY.affinityBonusThreshold) || 3;
    if (aff >= affThreshold) {
      score += 0.5;
      notes.push("老熟人默契");
    } else if (aff >= 1) {
      score += 0.25;
      notes.push("似曾相识");
    }
    const special = Core.getDailySpecial ? Core.getDailySpecial(state) : null;
    let dailySpecial = false;
    if (special && special.flavor && flavorDef.id === special.flavor) {
      score += 0.5;
      notes.push("今日小特调");
      dailySpecial = true;
    }

    return {
      score: Math.min(5, score),
      notes,
      affinity: aff,
      affinityBonus: aff >= affThreshold,
      dailySpecial: dailySpecial,
    };
  }

  document.getElementById("btn-serve").addEventListener("click", () => {
    const { cup, base, flavor, topping } = state.craft;
    const baseDef = BASES.find((b) => b.id === base);
    const flavorDef = FLAVORS.find((f) => f.id === flavor);
    const topDef = TOPPINGS.find((t) => t.id === topping);

    // 消耗材料
    if (baseDef.need && !takeItem(baseDef.need, 1)) {
      toast("材料不够了");
      renderShop();
      return;
    }
    if (flavorDef.need && !takeItem(flavorDef.need, 1)) {
      if (baseDef.need) addItem(baseDef.need, 1); // 回滚
      toast("风味材料不够");
      renderShop();
      return;
    }
    if (topDef && topDef.need && !takeItem(topDef.need, 1)) {
      if (baseDef.need) addItem(baseDef.need, 1);
      if (flavorDef.need) addItem(flavorDef.need, 1);
      toast("装饰材料不够");
      renderShop();
      return;
    }

    const scored = scoreDrink();
    const score = scored.score;
    const notes = scored.notes || [];
    const perfectBonus = shopCfg.perfectBonus || 0;
    const tip =
      shopCfg.tipMessages && shopCfg.tipMessages.length
        ? shopCfg.tipMessages[Math.floor(Math.random() * shopCfg.tipMessages.length)]
        : "";
    let coins = 4 + Math.floor(score * 2);
    if (score >= 4) coins += perfectBonus;
    if (scored.affinityBonus) coins += 1;
    if (scored.dailySpecial) {
      coins += 1;
      if (!state.stats) state.stats = {};
      state.stats.dailySpecialHits = (state.stats.dailySpecialHits || 0) + 1;
    }
    // Soft open-shop calm: first 3 serves of the day
    if (!state.stats) state.stats = {};
    const dayK = Core.dayKey ? Core.dayKey(Date.now()) : String(new Date().toDateString());
    if (state._serveDayKey !== dayK) {
      state._serveDayKey = dayK;
      state._servesToday = 0;
    }
    state._servesToday = (state._servesToday || 0) + 1;
    if (state._servesToday <= 3 && score >= 2) {
      coins += 1;
      notes.push("开店清静");
      state.stats.openCalmServes = (state.stats.openCalmServes || 0) + 1;
    }
    const hearts = score >= 3 ? 1 : 0;
    state.coins += coins;
    state.hearts += hearts;
    if (!state.stats) state.stats = {};
    state.stats.drinksServed = (state.stats.drinksServed || 0) + 1;
    // secret recipe match (data-driven)
    const matchedRecipe = secretRecipes.find(
      (r) =>
        r &&
        r.cup === state.craft.cup &&
        r.base === state.craft.base &&
        r.flavor === state.craft.flavor &&
        (r.topping || "none") === (state.craft.topping || "none")
    );
    if (matchedRecipe) {
      state.hearts += 1;
      toast("📜 触发秘密配方：" + (matchedRecipe.name || "无名汽水"));
      Core.appendJournal(state, "做出了秘密配方「" + (matchedRecipe.name || "汽水") + "」。");
    }
    Core.appendJournal(
      state,
      "为 " + (state.customer && state.customer.name ? state.customer.name : "客人") + " 调制了一杯汽水。" + (tip ? " " + tip : "")
    );
    checkAchievements();

    const drinkKey = [cup, base, flavor, topping || "none"].join("-");
    state.drinksMade[drinkKey] = (state.drinksMade[drinkKey] || 0) + 1;

    const msgEl = document.getElementById("serve-msg");
    const reactions = [
      "轻轻笑了笑，接过杯子。",
      "「谢谢，正好想喝这个。」",
      "眼睛亮了一下。",
      "「好舒服的味道……」",
      "「像晚风一样。」",
    ];
    const reaction = reactions[Math.min(reactions.length - 1, Math.floor(score))];
    msgEl.textContent = `${reaction}  +${coins} 金币${hearts ? " · +1 好心情" : ""}${notes.length ? "（" + notes.join("，") + "）" : ""}`;
    const streakNote = (state.serveStreak || 0) >= 3 ? " · 连胜" + state.serveStreak : "";
    const scoreStars = "★".repeat(Math.max(1, Math.min(5, Math.round(score)))) + "☆".repeat(Math.max(0, 5 - Math.max(1, Math.min(5, Math.round(score)))));
    toast(`🥂 ${scoreStars} · +${coins} 🪙` + streakNote);
    if (score >= 3) {
      state.serveStreak = (state.serveStreak || 0) + 1;
      if (Core.addTipJar) {
        const tj = Core.addTipJar(state, 1);
        if (tj.hearts) toast("💝 小费罐满了 · 好心情 +" + tj.hearts);
      }
    } else state.serveStreak = 0;
    if ((state.serveStreak || 0) >= 3) {
      state.coins += 2;
      notes.push("连胜小奖励");
    }
    sfx("serve");
    state.lastServedFlavor = flavor;
    if (!state.customerAffinity) state.customerAffinity = {};
    const cname = state.customer && state.customer.name ? state.customer.name : "客人";
    if (score >= 3) {
      state.customerAffinity[cname] = (state.customerAffinity[cname] || 0) + 1;
    }
    // 记住每位客人上次配方，便于「还是老样子」
    if (!state.lastCraftByGuest) state.lastCraftByGuest = {};
    const prevKey = state.lastCraftByGuest[cname];
    if (prevKey && prevKey === drinkKey) {
      if (!state.stats) state.stats = {};
      state.stats.repeatOrders = (state.stats.repeatOrders || 0) + 1;
      state.coins += 1;
      notes.push("还是老样子");
      toast("🔁 老样子 · 小费 +1");
    }
    state.lastCraftByGuest[cname] = drinkKey;

    // 今日展示架：保留最近 3 杯影子
    if (!state.shelfDrinks) state.shelfDrinks = [];
    state.shelfDrinks.push({
      key: drinkKey,
      cup: cup,
      base: base,
      flavor: flavor,
      topping: topping || "none",
      score: score,
      at: Date.now(),
    });
    if (state.shelfDrinks.length > 3) state.shelfDrinks = state.shelfDrinks.slice(-3);

    // 重置部分配方，换客人
    state.craft = { cup: state.craft.cup, base: null, flavor: null, topping: null };
    state.customer = randomCustomer();
    save();
    refreshResources();
    setTimeout(() => {
      msgEl.textContent = "";
      renderShop();
    }, 1600);
  });

  document.getElementById("btn-skip-customer").addEventListener("click", () => {
    state.customer = randomCustomer();
    save();
    document.getElementById("serve-msg").textContent = "";
    renderShop();
    toast("下一位客人走来了");
  });

  const btnRecall = document.getElementById("btn-recall-order");
  if (btnRecall) {
    btnRecall.addEventListener("click", () => {
      const name = state.customer && state.customer.name;
      const r = Core.recallGuestCraft(state, name);
      if (!r.ok) {
        toast("还没有这位客人的上次配方");
        return;
      }
      state.craft = Object.assign({}, r.craft);
      save();
      renderShop();
      toast("🔁 已填入「" + name + "」上次的搭配");
      sfx("ui");
    });
  }

  const btnPin = document.getElementById("btn-pin-customer");
  if (btnPin) {
    btnPin.addEventListener("click", () => {
      const name = state.customer && state.customer.name;
      if (!name) {
        toast("还没有客人");
        return;
      }
      if (state.pinnedCustomer === name) {
        Core.unpinCustomer(state);
        toast("取消常客标记");
      } else {
        Core.pinCustomer(state, name);
        toast("📌 已记下常客：" + name);
      }
      save();
      renderShop();
      sfx("pin");
    });
  }

  const btnGuestNote = document.getElementById("btn-guest-note");
  if (btnGuestNote) {
    btnGuestNote.addEventListener("click", () => {
      const name = state.customer && state.customer.name;
      if (!name) {
        toast("还没有客人");
        return;
      }
      const prev = (state.guestNotes && state.guestNotes[name]) || "";
      const note = prompt("给「" + name + "」写一句便签（≤40字）：", prev);
      if (note == null) return;
      const r = Core.setGuestNote(state, name, note);
      if (!r.ok) {
        toast(r.reason === "empty_note" ? "便签是空的" : "没能贴上");
        return;
      }
      checkAchievements();
      save();
      renderShop();
      toast("📝 已为 " + name + " 贴上便签");
      sfx("ui");
    });
  }

  const btnPinRecipe = document.getElementById("btn-pin-recipe");
  if (btnPinRecipe) {
    btnPinRecipe.addEventListener("click", () => {
      const craft = state.craft || {};
      const match = (secretRecipes || []).find(
        (r) =>
          r &&
          r.cup === craft.cup &&
          r.base === craft.base &&
          r.flavor === craft.flavor &&
          (r.topping || "none") === (craft.topping || "none")
      );
      const id = match ? match.id || match.name : [craft.cup, craft.base, craft.flavor, craft.topping || "none"].join("-");
      if (!craft.cup || !craft.base || !craft.flavor) {
        toast("先选好杯型、基底和风味");
        return;
      }
      const r = Core.pinRecipe(state, id);
      if (!r.ok) {
        toast("没能钉住配方");
        return;
      }
      checkAchievements();
      save();
      renderShop();
      toast("📌 已钉住：" + (match ? match.name : id));
      sfx("pin");
    });
  }

  const btnPinFlavor = document.getElementById("btn-pin-flavor");
  if (btnPinFlavor) {
    btnPinFlavor.addEventListener("click", () => {
      const fid = state.craft && state.craft.flavor;
      if (!fid) {
        toast("先选一个风味");
        return;
      }
      if (!Core.pinFlavor) {
        toast("调味架还没装好");
        return;
      }
      const r = Core.pinFlavor(state, fid);
      if (!r.ok) {
        toast("没能钉住风味");
        return;
      }
      checkAchievements();
      save();
      renderShop();
      const fl = FLAVORS && FLAVORS.find ? FLAVORS.find((f) => f.id === fid) : null;
      toast("🌿 调味架：" + ((fl && fl.name) || fid));
      sfx("pin");
    });
  }
  const btnLoadPinnedFlavor = document.getElementById("btn-load-pinned-flavor");
  if (btnLoadPinnedFlavor) {
    btnLoadPinnedFlavor.addEventListener("click", () => {
      const fid = Core.getPinnedFlavor ? Core.getPinnedFlavor(state) : state.pinnedFlavorId;
      if (!fid) {
        toast("调味架还是空的");
        return;
      }
      if (!state.craft) state.craft = {};
      state.craft.flavor = fid;
      save();
      renderShop();
      const fl = FLAVORS && FLAVORS.find ? FLAVORS.find((f) => f.id === fid) : null;
      toast("🔁 已填入钉住的风味：" + ((fl && fl.name) || fid));
      sfx("ui");
    });
  }

  const btnLoadPinned = document.getElementById("btn-load-pinned-recipe");
  if (btnLoadPinned) {
    btnLoadPinned.addEventListener("click", () => {
      const pr = Core.getPinnedRecipe(state, secretRecipes);
      if (pr.ok && pr.recipe) {
        state.craft = {
          cup: pr.recipe.cup,
          base: pr.recipe.base,
          flavor: pr.recipe.flavor,
          topping: pr.recipe.topping || "none",
        };
        save();
        renderShop();
        toast("🔁 已填入钉住的配方：" + (pr.recipe.name || ""));
        sfx("ui");
        return;
      }
      // fallback: parse craft key cup-base-flavor-topping
      const key = state.pinnedRecipeId;
      if (!key || key.indexOf("-") < 0) {
        toast("还没有钉住的配方");
        return;
      }
      const parts = key.split("-");
      if (parts.length < 3) {
        toast("还没有钉住的配方");
        return;
      }
      state.craft = {
        cup: parts[0],
        base: parts[1],
        flavor: parts[2],
        topping: parts[3] || "none",
      };
      save();
      renderShop();
      toast("🔁 已填入钉住的搭配");
      sfx("ui");
    });
  }

  const btnCloseShop = document.getElementById("btn-close-shop");
  if (btnCloseShop) {
    btnCloseShop.addEventListener("click", () => {
      const r = Core.closeShopDay(state);
      if (!r.ok) {
        toast(r.reason === "already" ? "今天已经收过摊啦" : "还不能收摊");
        return;
      }
      checkAchievements();
      save();
      toast("🌙 " + r.line);
      sfx("ui");
    });
  }

  function renderShopShelf() {
    const row = document.getElementById("shop-shelf-row");
    const empty = document.getElementById("shop-shelf-empty");
    if (!row) return;
    const list = state.shelfDrinks || [];
    row.innerHTML = "";
    if (!list.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    list.slice().reverse().forEach((d) => {
      const flavorDef = FLAVORS.find((f) => f.id === d.flavor);
      const cupDef = CUPS.find((c) => c.id === d.cup);
      const el = document.createElement("div");
      el.className = "shelf-cup";
      el.innerHTML =
        `<span class="emoji">${(flavorDef && flavorDef.emoji) || (cupDef && cupDef.emoji) || "🥂"}</span>` +
        `<span>${(flavorDef && flavorDef.name) || d.flavor}</span>`;
      row.appendChild(el);
    });
  }

  // ---------- 图鉴 ----------
  let currentAlbumTab = "items";
  let albumKindFilter = "all";

  document.querySelectorAll(".album-tabs .tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".album-tabs .tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentAlbumTab = tab.dataset.tab;
      renderAlbum(currentAlbumTab);
    });
  });

  (function wireAlbumKindFilters() {
    const box = document.getElementById("album-kind-filters");
    if (!box || box._wired) return;
    box._wired = true;
    box.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-kind]");
      if (!chip) return;
      albumKindFilter = chip.dataset.kind || "all";
      box.querySelectorAll(".kind-chip").forEach((c) => c.classList.toggle("active", c === chip));
      renderAlbum(currentAlbumTab);
    });
  })();

  function renderAlbum(tab) {
    const grid = document.getElementById("album-grid");
    grid.innerHTML = "";
    const kindBox = document.getElementById("album-kind-filters");
    if (kindBox) kindBox.hidden = tab !== "items";

    if (tab === "recipes") {
      if (!secretRecipes.length) {
        grid.innerHTML =
          '<div class="album-card"><div class="emoji">📜</div><div class="name">还没有秘密</div><div class="meta">做出特别搭配后会出现在这里</div></div>';
        return;
      }
      secretRecipes.forEach((r) => {
        const key = [r.cup, r.base, r.flavor, r.topping || "none"].join("-");
        const made = !!(state.drinksMade && state.drinksMade[key]);
        const card = document.createElement("div");
        card.className = "album-card" + (made ? " done" : " locked");
        card.innerHTML = made
          ? `<div class="emoji">📜</div><div class="name">${r.name || "秘密汽水"}</div><div class="meta">${r.cup}/${r.base}/${r.flavor}${r.topping && r.topping !== "none" ? "/" + r.topping : ""} · 已解锁</div>`
          : `<div class="emoji">❔</div><div class="name">未发现的配方</div><div class="meta">提示：试试 ${r.flavor || "?"} 风味</div>`;
        grid.appendChild(card);
      });
      return;
    }

    if (tab === "paths") {
      const themes = PATH_THEMES || [];
      const touched = state._themesTouched || {};
      const fav = state.favoritePathThemeId;
      const summary = document.createElement("div");
      summary.className = "album-card memory-summary";
      const n = Object.keys(touched).length;
      summary.innerHTML = `
        <div class="emoji">🛤️</div>
        <div class="name">小路图鉴</div>
        <div class="meta">已走过 ${n} / ${themes.length} · 常走：${fav || "未标记"}</div>
      `;
      grid.appendChild(summary);
      themes.forEach((th) => {
        if (!th || !th.id) return;
        // skip mass template theme ids if any
        if (/^theme_\d+/.test(th.id)) return;
        const known = !!touched[th.id];
        const card = document.createElement("div");
        card.className = "album-card" + (known ? " done" : " locked");
        const star = fav === th.id ? " ★" : "";
        card.innerHTML = known
          ? `<div class="emoji">${th.emoji || "🌿"}</div><div class="name">${th.name || th.id}${star}</div><div class="meta">${th.desc || "已走过"}</div>`
          : `<div class="emoji">❔</div><div class="name">？？？</div><div class="meta">还没走过这条路</div>`;
        grid.appendChild(card);
      });
      return;
    }

    if (tab === "memories") {
      const st = state.stats || {};
      const stickers = Object.keys(state.pathStickers || {});
      const summary = document.createElement("div");
      summary.className = "album-card memory-summary";
      summary.innerHTML = `
        <div class="emoji">📖</div>
        <div class="name">小路回忆</div>
        <div class="meta">窗台速写 ${st.potSnaps || 0} · 熟土收获 ${st.memoryHarvests || 0} · 花盆便签 ${st.potNotes || 0} · 长椅 ${st.benchSits || 0} · 晨露 ${st.morningDews || 0}</div>
      `;
      grid.appendChild(summary);
      if (stickers.length) {
        const stCard = document.createElement("div");
        stCard.className = "album-card done";
        stCard.innerHTML = `
          <div class="emoji">🏷️</div>
          <div class="name">小路贴纸</div>
          <div class="meta">${stickers.map((id) => (state.pathStickers[id] && state.pathStickers[id].name) || id).join(" · ")}</div>
        `;
        grid.appendChild(stCard);
      }
      const snaps = (state.potSnaps || []).slice().reverse();
      if (!snaps.length) {
        const empty = document.createElement("div");
        empty.className = "album-card";
        empty.innerHTML =
          '<div class="emoji">📷</div><div class="name">还没有速写</div><div class="meta">在窗台点「窗台速写」，把盆栽记下来</div>';
        grid.appendChild(empty);
      } else {
        snaps.forEach((c) => {
          const card = document.createElement("div");
          card.className = "album-card done";
          const day = c.day != null ? "第" + c.day + "天" : "";
          const season = c.season || "";
          const note = c.note ? " · 「" + c.note + "」" : "";
          card.innerHTML = `
            <div class="emoji">${c.emoji || "🪴"}</div>
            <div class="name">${c.name || "窗台"}</div>
            <div class="meta">${day}${season ? " · " + season : ""} · 心情 ${c.mood != null ? c.mood : "?"}${note}</div>
          `;
          grid.appendChild(card);
        });
      }
      // pot harvest memory from current sill
      (state.pots || []).forEach((pot, i) => {
        if (!pot.plantId || !(pot.harvestCount > 0)) return;
        const def = PLANTS[pot.plantId] || {};
        const card = document.createElement("div");
        card.className = "album-card" + (pot.harvestCount >= 3 ? " done" : "");
        card.innerHTML = `
          <div class="emoji">${(def.emoji && def.emoji[2]) || "🪴"}</div>
          <div class="name">${pot.nickname || def.name || "花盆"} · 熟土</div>
          <div class="meta">花盆 #${i + 1} · 收获 ${pot.harvestCount} 次${pot.harvestCount >= 3 ? " · 记忆加成中" : ""}</div>
        `;
        grid.appendChild(card);
      });
      return;
    }

    if (tab === "items") {
      // Prefer unique non-spam items: drop mass seed_* / *_r#### template ids for display
      const list = Object.values(ITEMS).filter((it) => {
        if (!it || !it.id) return false;
        if (/^seed_/.test(it.id) || /_r\d{3,}/.test(it.id)) return false;
        if (albumKindFilter !== "all" && it.kind !== albumKindFilter) return false;
        return true;
      });
      if (!list.length) {
        grid.innerHTML =
          '<div class="album-card"><div class="emoji">🧺</div><div class="name">这一类还空着</div><div class="meta">换个筛选或去小路走走</div></div>';
        return;
      }
      list.forEach((it) => {
        const known = state.discovered[it.id];
        const count = state.bag[it.id] || 0;
        const card = document.createElement("div");
        card.className = "album-card" + (known ? "" : " locked");
        card.innerHTML = known
          ? `<div class="emoji">${it.emoji}</div><div class="name">${it.name}</div><div class="meta">${it.kind} · 持有 ${count}${it.seed ? " · 可种植" : ""}</div>`
          : `<div class="emoji">❔</div><div class="name">？？？</div><div class="meta">${it.kind || "收集"} · 还没遇见</div>`;
        grid.appendChild(card);
      });
    } else if (tab === "plants") {
      Object.values(PLANTS)
        .filter((p) => p && p.id && !/^plant_/.test(p.id) && !/_\d{3,}/.test(p.id))
        .forEach((p) => {
        const growing = state.pots.some((pot) => pot.plantId === p.id);
        const ever = growing || state.discovered[p.harvest];
        const card = document.createElement("div");
        card.className = "album-card" + (ever ? "" : " locked");
        const harvestName = ITEMS[p.harvest] ? ITEMS[p.harvest].emoji + ITEMS[p.harvest].name : p.harvest;
        card.innerHTML = ever
          ? `<div class="emoji">${(p.emoji && p.emoji[2]) || "🪴"}</div><div class="name">${p.name}</div><div class="meta">收获 ${harvestName}${growing ? " · 培育中" : ""}</div>`
          : `<div class="emoji">❔</div><div class="name">？？？</div><div class="meta">种下后解锁</div>`;
        grid.appendChild(card);
      });
    } else {
      // drinks: show made combos sorted by times made (most first)
      const made = Object.entries(state.drinksMade).sort((a, b) => (b[1] || 0) - (a[1] || 0));
      if (!made.length) {
        grid.innerHTML = `<div class="album-card"><div class="emoji">🍋</div><div class="name">还没有作品</div><div class="meta">去汽水铺做一杯吧</div></div>`;
        return;
      }
      made.forEach(([key, n]) => {
        const [cup, base, flavor, topping] = key.split("-");
        const cupDef = CUPS.find((c) => c.id === cup);
        const baseDef = BASES.find((b) => b.id === base);
        const flavorDef = FLAVORS.find((f) => f.id === flavor);
        const topDef = TOPPINGS.find((t) => t.id === topping);
        const card = document.createElement("div");
        card.className = "album-card";
        const title = `${flavorDef?.name || ""}${baseDef?.name || ""}`;
        card.innerHTML = `
          <div class="emoji">${flavorDef?.emoji || "🥂"}</div>
          <div class="name">${title}</div>
          <div class="meta">${cupDef?.emoji || ""} ${topDef && topDef.id !== "none" ? topDef.emoji : ""} · 做过 ${n} 次</div>
        `;
        grid.appendChild(card);
      });
    }
  }

  // 离线时盆栽缓慢变化（打开时结算，含晨露）
  function settleOfflineGrowth() {
    const r = Core.settleOfflineGrowth(state, Date.now(), PLANTS);
    if (r && r.state) state = r.state;
    if (r && r.dewCount > 0) {
      toast("💧 晨露轻润了 " + r.dewCount + " 盆植物");
      checkAchievements();
    }
    save();
  }

  // ---------- 设置 / 存档 / 引导 ----------
  function wireSettings() {
    const sound = document.getElementById("set-sound");
    const motion = document.getElementById("set-motion");
    const tips = document.getElementById("set-tips");
    const weather = document.getElementById("set-weather");
    const ambience = document.getElementById("set-ambience");
    const quietShop = document.getElementById("set-quiet-shop");
    const bind = (el, key) => {
      if (!el) return;
      el.addEventListener("change", () => {
        const patch = {};
        if (key === "sound") patch.sound = !!el.checked;
        if (key === "reduceMotion") patch.reduceMotion = !!el.checked;
        if (key === "showTips") patch.showTips = !!el.checked;
        if (key === "weatherFx") patch.weatherFx = !!el.checked;
        if (key === "ambience") patch.ambience = !!el.checked;
        if (key === "quietShop") patch.quietShop = !!el.checked;
        Core.updateSettings(state, patch);
        applySettingsToDom();
        save();
        sfx("ui");
        const msg = document.getElementById("settings-msg");
        if (msg) msg.textContent = "已保存设置";
      });
    };
    bind(sound, "sound");
    bind(motion, "reduceMotion");
    bind(tips, "showTips");
    bind(weather, "weatherFx");
    bind(ambience, "ambience");
    bind(quietShop, "quietShop");

    const newDayBtn = document.getElementById("btn-soft-newday");
    if (newDayBtn) {
      newDayBtn.addEventListener("click", () => {
        if (!confirm("迎来新的一天？今日小目标会刷新，背包与植物会保留。")) return;
        Core.softNewDay(state);
        save();
        refreshResources();
        refreshDailyUI();
        const msg = document.getElementById("settings-msg");
        if (msg) msg.textContent = "新的一天：第 " + (state.day || "?") + " 天";
        toast("🌅 新的一天");
        sfx("theme");
      });
    }
    const copyBtn = document.getElementById("btn-copy-save");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        const text = Core.exportSave(state);
        const io = document.getElementById("save-io");
        if (io) io.value = text;
        const msg = document.getElementById("settings-msg");
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            if (msg) msg.textContent = "已复制到剪贴板。";
            toast("📋 存档已复制");
          } else {
            if (msg) msg.textContent = "浏览器不支持剪贴板，请手动复制文本框。";
          }
        } catch (e) {
          if (msg) msg.textContent = "复制失败，请手动复制文本框内容。";
        }
        sfx("ui");
      });
    }
    const exportBtn = document.getElementById("btn-export-save");
    const importBtn = document.getElementById("btn-import-save");
    const io = document.getElementById("save-io");
    if (exportBtn && io) {
      exportBtn.addEventListener("click", () => {
        io.value = Core.exportSave(state);
        const msg = document.getElementById("settings-msg");
        if (msg) msg.textContent = "已导出到文本框，可复制保存。";
        sfx("ui");
      });
    }
    if (importBtn && io) {
      importBtn.addEventListener("click", () => {
        const r = Core.importSave(io.value.trim());
        const msg = document.getElementById("settings-msg");
        if (!r.ok) {
          if (msg) msg.textContent = "导入失败：存档格式不对。";
          return;
        }
        state = r.state;
        if (!state.customer) state.customer = randomCustomer();
        save();
        refreshResources();
        applySettingsToDom();
        if (msg) msg.textContent = "导入成功，继续温柔的日常吧。";
        toast("存档已导入");
        sfx("ui");
      });
    }
  }

  const TUTORIAL_STEPS = [
    { title: "欢迎来到晚风小路", body: "这里没有倒计时，也没有失败——只有散步、盆栽和汽水。" },
    { title: "晚风小路", body: "用左右按钮或方向键走走看，靠近发光的小东西就能捡起来。" },
    { title: "窗台盆栽", body: "把种子种进空花盆，浇水、日照、说说话，成熟后可以收获。" },
    { title: "青柠汽水铺", body: "按客人的心情搭配杯型、基底、风味和装饰。做错了也没关系。" },
  ];
  let tutIndex = 0;

  function showTutorial(force) {
    const st = Core.getSettings(state);
    if (!force && st.tutorialDone) return;
    const box = document.getElementById("tutorial");
    if (!box) return;
    tutIndex = 0;
    renderTutorialStep();
    box.hidden = false;
  }

  function renderTutorialStep() {
    const step = TUTORIAL_STEPS[tutIndex] || TUTORIAL_STEPS[0];
    const title = document.getElementById("tut-title");
    const body = document.getElementById("tut-body");
    const meta = document.getElementById("tut-step");
    const next = document.getElementById("tut-next");
    if (title) title.textContent = step.title;
    if (body) body.textContent = step.body;
    if (meta) meta.textContent = tutIndex + 1 + " / " + TUTORIAL_STEPS.length;
    if (next) next.textContent = tutIndex >= TUTORIAL_STEPS.length - 1 ? "开始吧" : "下一步";
  }

  function hideTutorial(done) {
    const box = document.getElementById("tutorial");
    if (box) box.hidden = true;
    if (done) {
      Core.updateSettings(state, { tutorialDone: true });
      save();
    }
  }

  function wireTutorial() {
    const next = document.getElementById("tut-next");
    const skip = document.getElementById("tut-skip");
    const replay = document.getElementById("btn-replay-tutorial");
    if (next) {
      next.addEventListener("click", () => {
        if (tutIndex >= TUTORIAL_STEPS.length - 1) {
          hideTutorial(true);
          toast("晚风等你来散步");
          return;
        }
        tutIndex++;
        renderTutorialStep();
        sfx("ui");
      });
    }
    if (skip) skip.addEventListener("click", () => hideTutorial(true));
    if (replay) {
      replay.addEventListener("click", () => {
        go("home");
        showTutorial(true);
      });
    }
  }

  // daily reward + demo
  const claimBtn = document.getElementById("btn-claim-daily");
  if (claimBtn) {
    claimBtn.addEventListener("click", () => {
      const r = Core.claimDailyReward(state);
      const msg = document.getElementById("daily-msg");
      if (!r.ok) {
        if (msg) msg.textContent = r.reason === "claimed" ? "已经领过啦。" : "还没全部完成哦。";
        return;
      }
      save();
      refreshResources();
      refreshDailyUI();
      const giftLabel =
        r.gift && ITEMS[r.gift]
          ? ITEMS[r.gift].emoji + " " + ITEMS[r.gift].name
          : r.gift || "";
      if (msg) {
        msg.textContent =
          `领取成功：+${r.coins} 金币，+${r.hearts} 好心情` +
          (giftLabel ? "，小礼 " + giftLabel : "");
      }
      toast("☀️ 今日小目标完成" + (giftLabel ? " · 小礼 " + giftLabel : ""));
      sfx("serve");
    });
  }
  const mailBtn = document.getElementById("btn-open-mail");
  if (mailBtn) mailBtn.addEventListener("click", openOneMail);
  const demoBtn = document.getElementById("btn-demo-mode");
  if (demoBtn) {
    demoBtn.addEventListener("click", () => {
      if (!confirm("载入演示存档？当前进度会写入演示状态（可用导出备份）。")) return;
      state = Core.createDemoState();
      state.customer = randomCustomer();
      save();
      refreshResources();
      refreshDailyUI();
      applySettingsToDom();
      toast("🎬 已进入演示模式");
      setTimeout(() => toast("提示：1小路 2盆栽 3汽水 4图鉴"), 900);
      go("home");
    });
  }

  // keyboard: 1-4 quick nav from home
  window.addEventListener("keydown", (e) => {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    const map = { "1": "walk", "2": "garden", "3": "shop", "4": "album", "?": "help", "/": "help", "h": "help", "H": "help", "b": "bag", "B": "bag", "m": "mail", "M": "mail" };
    if (e.key === "Escape") {
      const tut = document.getElementById("tutorial");
      if (tut && !tut.hidden) {
        // leave tutorial handler alone
      } else {
        go("home");
        e.preventDefault();
      }
      return;
    }
    if (map[e.key]) {
      go(map[e.key]);
      e.preventDefault();
    }
  });

  // ---------- 启动 ----------
  settleOfflineGrowth();
  Core.ensureDailyGoals(state);
  Core.evaluateDailyGoals(state);
  refreshResources();
  refreshDailyUI();
  applySettingsToDom();
  wireSettings();
  wireTutorial();
  showTutorial(false);

  // soft ambient dialogue on home (from game-data dialogues)
  if (DIALOGUES.length) {
    const copy = document.getElementById("home-blurb") || document.querySelector(".home-copy p");
    if (copy) {
      const line = DIALOGUES[Math.floor(Math.random() * DIALOGUES.length)];
      copy.textContent = line + " 沿着小路散步收集灵感，在窗台照料小植物，再为路过的人调制一杯汽水吧。";
    }
  }
  // random tip toast from ui-copy
  const st0 = Core.getSettings(state);
  if (st0.showTips !== false && uiCopy.tips && uiCopy.tips.length && Math.random() < 0.35) {
    const tip = uiCopy.tips[Math.floor(Math.random() * uiCopy.tips.length)];
    setTimeout(() => toast("💡 " + tip), 600);
  }

  // decorate garden with plant art if present
  const gardenBanner = document.querySelector("#screen-garden .scene-banner");
  if (gardenBanner) {
    gardenBanner.insertAdjacentHTML(
      "afterend",
      '<div class="art-row"><img src="assets/plants/mint-stages.jpg" alt="盆栽生长" class="art-thumb"/><img src="assets/ui/garden-actions.jpg" alt="照料动作" class="art-thumb"/></div>'
    );
  }
  const shopBanner = document.querySelector("#screen-shop .scene-banner");
  if (shopBanner) {
    shopBanner.insertAdjacentHTML(
      "afterend",
      '<div class="art-row"><img src="assets/shop/berry-soda.jpg" alt="野莓汽水" class="art-thumb"/><img src="assets/shop/customers-sheet.jpg" alt="客人" class="art-thumb"/><img src="assets/shop/cups-set.jpg" alt="杯型" class="art-thumb"/></div>'
    );
  }
})();
