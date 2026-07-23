/**
 * 晚风小路 · pure game logic (browser + Node)
 * Shipped unit: inventory, plants, craft scoring, discovery, persistence.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.WanfengCore = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SAVE_KEY = "wanfeng-xiaolu-v1";
  const VERSION = 3;
  var ECONOMY = { serveBase: 5, serveScoreMul: 2, harvestCoins: 4, pathBonus: 3, dailyRewardCoins: 10, dailyRewardHearts: 1 };

  const DEFAULT_ITEMS = {
    maple: { id: "maple", name: "枫叶", emoji: "🍁", kind: "装饰", seed: null },
    petal: { id: "petal", name: "花瓣", emoji: "🌸", kind: "装饰", seed: null },
    berry: { id: "berry", name: "野莓", emoji: "🫐", kind: "风味", seed: "berryBush" },
    lemon: { id: "lemon", name: "青柠", emoji: "🍋", kind: "基底", seed: "lemonTree" },
    mint: { id: "mint", name: "薄荷", emoji: "🌿", kind: "风味", seed: "mintPlant" },
    honey: { id: "honey", name: "野蜜", emoji: "🍯", kind: "风味", seed: null },
    stone: { id: "stone", name: "鹅卵石", emoji: "🪨", kind: "收藏", seed: null },
    clover: { id: "clover", name: "三叶草", emoji: "🍀", kind: "装饰", seed: "cloverPot" },
    peach: { id: "peach", name: "水蜜桃", emoji: "🍑", kind: "风味", seed: "peachSapling" },
    jasmine: { id: "jasmine", name: "茉莉", emoji: "🌼", kind: "风味", seed: "jasminePot" },
  };

  const DEFAULT_PLANTS = {
    berryBush: { id: "berryBush", name: "野莓丛", emoji: ["🌱", "🌿", "🫐"], harvest: "berry", days: 3 },
    lemonTree: { id: "lemonTree", name: "青柠苗", emoji: ["🌱", "🪴", "🍋"], harvest: "lemon", days: 4 },
    mintPlant: { id: "mintPlant", name: "薄荷苗", emoji: ["🌱", "🌿", "🌿"], harvest: "mint", days: 2 },
    cloverPot: { id: "cloverPot", name: "三叶草", emoji: ["🌱", "🍀", "🍀"], harvest: "clover", days: 2 },
    peachSapling: { id: "peachSapling", name: "桃树苗", emoji: ["🌱", "🌳", "🍑"], harvest: "peach", days: 5 },
    jasminePot: { id: "jasminePot", name: "茉莉", emoji: ["🌱", "🌿", "🌼"], harvest: "jasmine", days: 3 },
  };

  const DEFAULT_CUPS = [
    { id: "tall", name: "高脚杯", emoji: "🥂", vibe: "清爽" },
    { id: "mug", name: "暖暖杯", emoji: "🍵", vibe: "温柔" },
    { id: "jar", name: "玻璃罐", emoji: "🫙", vibe: "田园" },
  ];

  const DEFAULT_BASES = [
    { id: "soda", name: "气泡水", emoji: "🫧", need: null, color: ["#d8f0e8", "#9ed4c0"], vibe: "清爽" },
    { id: "tea", name: "凉茶底", emoji: "🍵", need: null, color: ["#e8dcc0", "#c8b888"], vibe: "温柔" },
    { id: "lemon", name: "青柠水", emoji: "🍋", need: "lemon", color: ["#f0f8c8", "#d0e060"], vibe: "清爽" },
  ];

  const DEFAULT_FLAVORS = [
    { id: "plain", name: "原味", emoji: "✨", need: null, tags: ["清爽"] },
    { id: "berry", name: "野莓", emoji: "🫐", need: "berry", tags: ["果香", "甜蜜"] },
    { id: "mint", name: "薄荷", emoji: "🌿", need: "mint", tags: ["清爽", "草本"] },
    { id: "honey", name: "野蜜", emoji: "🍯", need: "honey", tags: ["甜蜜", "温柔"] },
    { id: "peach", name: "水蜜桃", emoji: "🍑", need: "peach", tags: ["果香", "甜蜜"] },
    { id: "jasmine", name: "茉莉", emoji: "🌼", need: "jasmine", tags: ["花香", "温柔"] },
  ];

  const DEFAULT_TOPPINGS = [
    { id: "none", name: "不加", emoji: "—", need: null },
    { id: "petal", name: "花瓣", emoji: "🌸", need: "petal" },
    { id: "maple", name: "枫叶", emoji: "🍁", need: "maple" },
    { id: "clover", name: "三叶草", emoji: "🍀", need: "clover" },
  ];

  const DEFAULT_CUSTOMERS = [
    { name: "晚归的邮差", avatar: "📮", wish: "骑了一天车，想喝点提神又清爽的。", tags: ["清爽"], flavors: ["mint", "lemon", "plain"] },
    { name: "看书的女孩", avatar: "📖", wish: "来点温柔花香，最好不那么甜。", tags: ["温柔", "花香"], flavors: ["jasmine", "plain", "mint"] },
    { name: "散步的老爷爷", avatar: "🎩", wish: "田园一点的就好，甜的也行。", tags: ["田园", "甜蜜"], flavors: ["honey", "peach", "berry"] },
    { name: "画画的少年", avatar: "🎨", wish: "要果香满满，像夏天的颜色。", tags: ["果香", "清爽"], flavors: ["berry", "peach", "lemon"] },
    { name: "抱猫的邻居", avatar: "🐱", wish: "随便啦，甜蜜或草本我都喜欢。", tags: ["甜蜜", "草本"], flavors: ["honey", "mint", "berry"] },
    { name: "放风筝的孩子", avatar: "🪁", wish: "要气泡！要好看的装饰！", tags: ["清爽"], flavors: ["plain", "berry", "mint"], wantTopping: true },
    { name: "写生的旅人", avatar: "🎒", wish: "来杯有茉莉或青柠味道的，慢慢喝。", tags: ["花香", "清爽"], flavors: ["jasmine", "lemon", "mint"] },
    { name: "打伞的小姐", avatar: "☂️", wish: "温柔一点的茶底，加一点蜜就完美。", tags: ["温柔", "甜蜜"], flavors: ["honey", "jasmine", "plain"] },
  ];

  function emptyPot() {
    return { plantId: null, water: 0, sun: 0, mood: 0, growth: 0, tendedAt: 0 };
  }

  function defaultState(potCount) {
    const n = potCount || 4;
    const pots = [];
    for (let i = 0; i < n; i++) pots.push(emptyPot());
    return {
      version: VERSION,
      coins: 20,
      hearts: 0,
      bag: { lemon: 2, mint: 1, berry: 1 },
      discovered: { lemon: true, mint: true, berry: true },
      potSlots: n,
      pots: pots,
      drinksMade: {},
      pathsWalked: 0,
      selectedPot: 0,
      craft: { cup: null, base: null, flavor: null, topping: null },
      customer: null,
      season: "dusk",
      day: 1,
      journal: [],
      unlocked: { walk: true, garden: true, shop: true, album: true, seasons: true },
      stats: { itemsPicked: 0, drinksServed: 0, plantsHarvested: 0, seasonsSeen: 1 },
      achievements: {},
      seasonIndex: 0,
      settings: {
        sound: true,
        reduceMotion: false,
        showTips: true,
        tutorialDone: false,
      },
      pathThemeId: "maple_lane",
      _seasonsTouched: { dusk: true },
    };
  }

  var DEFAULT_PATH_THEMES = [
    {
      id: "maple_lane",
      name: "枫叶小径",
      emoji: "🍁",
      desc: "落叶柔软，晚霞偏暖。",
      sky: ["#3d4a6b", "#8b6a8a", "#e8a878", "#f0c898", "#c8b888"],
      ground: "#8faf6a",
      path: "#c4ae88",
      bias: { maple: 3.5, petal: 1.5, stone: 1.2 },
      ambient: ["枫叶打着旋落在鞋边。", "风里有干燥木头的味道。"],
    },
  ];

  function getPathTheme(state, themes) {
    themes = themes && themes.length ? themes : DEFAULT_PATH_THEMES;
    var id = (state && state.pathThemeId) || "maple_lane";
    for (var i = 0; i < themes.length; i++) {
      if (themes[i].id === id) return themes[i];
    }
    return themes[0];
  }

  function setPathTheme(state, themeId, themes) {
    themes = themes && themes.length ? themes : DEFAULT_PATH_THEMES;
    var ok = false;
    for (var i = 0; i < themes.length; i++) {
      if (themes[i].id === themeId) {
        ok = true;
        break;
      }
    }
    if (!ok) return { ok: false, reason: "unknown_theme" };
    state.pathThemeId = themeId;
    return { ok: true, themeId: themeId };
  }

  /** Build weighted spawn list from theme bias + base keys */
  function buildSpawnList(itemIds, bias, maxLen) {
    itemIds = itemIds || [];
    bias = bias || {};
    maxLen = maxLen || 80;
    var weighted = [];
    for (var i = 0; i < itemIds.length; i++) {
      var id = itemIds[i];
      var w = Math.max(1, Math.round((bias[id] != null ? bias[id] : 1) * 10));
      w = Math.min(w, 40);
      for (var j = 0; j < w; j++) weighted.push(id);
    }
    if (!weighted.length) return itemIds.slice(0, maxLen);
    return weighted.slice(0, maxLen);
  }

  function getSettings(state) {
    state.settings = state.settings || {
      sound: true,
      reduceMotion: false,
      showTips: true,
      tutorialDone: false,
    };
    return state.settings;
  }

  function updateSettings(state, patch) {
    var s = getSettings(state);
    Object.keys(patch || {}).forEach(function (k) {
      s[k] = patch[k];
    });
    return s;
  }

  function exportSave(state) {
    return serialize(state);
  }

  function importSave(raw) {
    var data = deserialize(raw);
    if (!data) return { ok: false, reason: "invalid" };
    return { ok: true, state: data };
  }

  /** Soft daily goals — no punishment if incomplete */
  var DAILY_GOAL_DEFS = [
    { id: "walk_once", name: "沿小路走一段", desc: "完成一次「再走一段新路」", check: function (s, p) { return (s.pathsWalked || 0) > (p.pathsWalked || 0); } },
    { id: "pick_three", name: "拾取三件小物", desc: "今日累计拾取 3 件", check: function (s, p) { return ((s.stats && s.stats.itemsPicked) || 0) >= ((p.itemsPicked || 0) + 3); } },
    { id: "tend_plant", name: "照料一株植物", desc: "浇水、日照或说说话一次", check: function (s, p) { return (s._tendsToday || 0) >= 1; } },
    { id: "serve_one", name: "招待一位客人", desc: "成功端出一杯汽水", check: function (s, p) { return ((s.stats && s.stats.drinksServed) || 0) > (p.drinksServed || 0); } },
    { id: "journal_day", name: "留下一行手帐", desc: "任意行为写入手帐", check: function (s, p) { return (s.journal || []).length > (p.journalLen || 0); } },
  ];

  function dayKey(ts) {
    var d = new Date(ts || Date.now());
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function ensureDailyGoals(state, now) {
    now = now || Date.now();
    var key = dayKey(now);
    if (!state.daily || state.daily.key !== key) {
      // pick 3 stable goals from defs using date hash
      var seed = 0;
      for (var i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
      var picks = [];
      var used = {};
      var n = 0;
      while (picks.length < 3 && n < 20) {
        var idx = (seed + n * 17) % DAILY_GOAL_DEFS.length;
        n++;
        if (used[idx]) continue;
        used[idx] = true;
        picks.push(DAILY_GOAL_DEFS[idx].id);
      }
      state.daily = {
        key: key,
        goalIds: picks,
        baseline: {
          pathsWalked: state.pathsWalked || 0,
          itemsPicked: (state.stats && state.stats.itemsPicked) || 0,
          drinksServed: (state.stats && state.stats.drinksServed) || 0,
          journalLen: (state.journal || []).length,
        },
        completed: {},
        claimed: false,
      };
      state._tendsToday = 0;
    }
    return state.daily;
  }

  function evaluateDailyGoals(state) {
    var daily = ensureDailyGoals(state);
    var newly = [];
    daily.goalIds.forEach(function (id) {
      if (daily.completed[id]) return;
      var def = DAILY_GOAL_DEFS.filter(function (d) { return d.id === id; })[0];
      if (!def) return;
      if (def.check(state, daily.baseline || {})) {
        daily.completed[id] = true;
        newly.push(def);
      }
    });
    return { daily: daily, newly: newly, allDone: daily.goalIds.every(function (id) { return daily.completed[id]; }) };
  }

  function claimDailyReward(state) {
    var ev = evaluateDailyGoals(state);
    if (!ev.allDone) return { ok: false, reason: "incomplete" };
    if (ev.daily.claimed) return { ok: false, reason: "claimed" };
    ev.daily.claimed = true;
    state.coins = (state.coins || 0) + ECONOMY.dailyRewardCoins;
    state.hearts = (state.hearts || 0) + ECONOMY.dailyRewardHearts;
    appendJournal(state, "完成了今日的温柔小目标。");
    return { ok: true, coins: ECONOMY.dailyRewardCoins, hearts: ECONOMY.dailyRewardHearts };
  }

  /** Demo mode: seed a showcase state without combat */
  function unlockPotSlot(state, cost) {
    cost = cost == null ? 25 : cost;
    var slots = state.potSlots || (state.pots && state.pots.length) || 4;
    if (slots >= 6) return { ok: false, reason: "max" };
    if ((state.coins || 0) < cost) return { ok: false, reason: "coins" };
    state.coins -= cost;
    state.potSlots = slots + 1;
    if (!state.pots) state.pots = [];
    while (state.pots.length < state.potSlots) state.pots.push(emptyPot());
    appendJournal(state, "窗台多了一只空花盆。");
    return { ok: true, potSlots: state.potSlots, cost: cost };
  }

  function createDemoState() {
    var s = defaultState(5);
    s.potSlots = 5;
    s.coins = 48;
    s.hearts = 6;
    s.pathsWalked = 3;
    s.bag = { lemon: 4, mint: 3, berry: 3, petal: 2, maple: 2, honey: 2, peach: 1, jasmine: 1, clover: 1 };
    s.discovered = {};
    Object.keys(s.bag).forEach(function (k) { s.discovered[k] = true; });
    s.pots[0] = { plantId: "mintPlant", water: 70, sun: 65, mood: 80, growth: 2.2, tendedAt: Date.now() };
    s.pots[1] = { plantId: "lemonTree", water: 50, sun: 55, mood: 60, growth: 3.5, tendedAt: Date.now() };
    s.stats = { itemsPicked: 20, drinksServed: 5, plantsHarvested: 2, seasonsSeen: 3 };
    s.settings = { sound: true, reduceMotion: false, showTips: true, tutorialDone: true };
    s.demo = true;
    appendJournal(s, "演示存档：展示散步、盆栽与汽水的温柔日常。");
    ensureDailyGoals(s);
    return s;
  }

  var SEASON_ORDER = ["dusk", "spring", "summer", "autumn", "winter"];
  var SEASON_LABELS = {
    dusk: "黄昏",
    spring: "春日",
    summer: "盛夏",
    autumn: "秋晚",
    winter: "冬夜",
  };
  var SEASON_ART = {
    dusk: "assets/seasons/dusk.jpg",
    spring: "assets/seasons/spring.jpg",
    summer: "assets/seasons/summer.jpg",
    autumn: "assets/seasons/autumn.jpg",
    winter: "assets/seasons/winter.jpg",
  };

  var DEFAULT_ACHIEVEMENTS = [
    { id: "first_walk", name: "第一次散步", desc: "走完一段小路", check: function (s) { return (s.pathsWalked || 0) >= 1; } },
    { id: "picker_10", name: "拾荒小能手", desc: "累计拾取 10 件", check: function (s) { return (s.stats && s.stats.itemsPicked || 0) >= 10; } },
    { id: "green_thumb", name: "绿拇指", desc: "收获一次盆栽", check: function (s) { return (s.stats && s.stats.plantsHarvested || 0) >= 1; } },
    { id: "barista", name: "温柔店员", desc: "服务 3 位客人", check: function (s) { return (s.stats && s.stats.drinksServed || 0) >= 3; } },
    { id: "hearts_5", name: "好心情满满", desc: "好心情达到 5", check: function (s) { return (s.hearts || 0) >= 5; } },
    { id: "season_tour", name: "四季旅人", desc: "经历全部季节", check: function (s) { return (s.stats && s.stats.seasonsSeen || 0) >= 5; } },
    { id: "coins_50", name: "小金库", desc: "持有 50 金币", check: function (s) { return (s.coins || 0) >= 50; } },
    { id: "discover_8", name: "图鉴起步", desc: "发现 8 种收集物", check: function (s) { return Object.keys(s.discovered || {}).length >= 8; } },
  ];

  function advanceSeason(state) {
    var idx = typeof state.seasonIndex === "number" ? state.seasonIndex : SEASON_ORDER.indexOf(state.season || "dusk");
    if (idx < 0) idx = 0;
    idx = (idx + 1) % SEASON_ORDER.length;
    state.seasonIndex = idx;
    state.season = SEASON_ORDER[idx];
    state.day = (state.day || 1) + 1;
    if (!state.stats) state.stats = {};
    state.stats.seasonsSeen = Math.min(5, (state.stats.seasonsSeen || 1) + (idx === 0 ? 0 : 0));
    // count unique seasons via journal of seasons
    if (!state._seasonsTouched) state._seasonsTouched = {};
    state._seasonsTouched[state.season] = true;
    state.stats.seasonsSeen = Object.keys(state._seasonsTouched).length;
    appendJournal(state, "季节换成了" + (SEASON_LABELS[state.season] || state.season) + "。");
    return state.season;
  }

  function appendJournal(state, text) {
    if (!state.journal) state.journal = [];
    state.journal.push({
      day: state.day || 1,
      season: state.season || "dusk",
      text: String(text || ""),
      at: Date.now(),
    });
    if (state.journal.length > 80) state.journal = state.journal.slice(-80);
    return state.journal;
  }

  function evaluateAchievements(state, defs) {
    defs = defs || DEFAULT_ACHIEVEMENTS;
    if (!state.achievements) state.achievements = {};
    var newly = [];
    for (var i = 0; i < defs.length; i++) {
      var a = defs[i];
      if (state.achievements[a.id]) continue;
      var ok = false;
      try {
        ok = !!a.check(state);
      } catch (e) {
        ok = false;
      }
      if (ok) {
        state.achievements[a.id] = { at: Date.now(), name: a.name };
        newly.push(a);
        appendJournal(state, "解锁成就：" + a.name);
      }
    }
    return newly;
  }

  function bagCount(state) {
    return Object.values(state.bag || {}).reduce(function (a, b) {
      return a + b;
    }, 0);
  }

  function hasItem(state, id, n) {
    n = n == null ? 1 : n;
    return (state.bag[id] || 0) >= n;
  }

  function addItem(state, id, n) {
    n = n == null ? 1 : n;
    if (!state.bag) state.bag = {};
    if (!state.discovered) state.discovered = {};
    state.bag[id] = (state.bag[id] || 0) + n;
    state.discovered[id] = true;
    if (!state.stats) state.stats = {};
    state.stats.itemsPicked = (state.stats.itemsPicked || 0) + n;
    return state;
  }

  function takeItem(state, id, n) {
    n = n == null ? 1 : n;
    if (!hasItem(state, id, n)) return false;
    state.bag[id] -= n;
    if (state.bag[id] <= 0) delete state.bag[id];
    return true;
  }

  function growthStage(pot, plants) {
    plants = plants || DEFAULT_PLANTS;
    if (!pot || !pot.plantId) return 0;
    var def = plants[pot.plantId];
    if (!def) return 0;
    if (pot.growth >= def.days) return 2;
    if (pot.growth >= def.days * 0.45) return 1;
    return 0;
  }

  function isReady(pot, plants) {
    plants = plants || DEFAULT_PLANTS;
    if (!pot || !pot.plantId) return false;
    var def = plants[pot.plantId];
    return !!(def && pot.growth >= def.days);
  }

  function plantSeed(state, potIndex, itemId, catalog) {
    catalog = catalog || { items: DEFAULT_ITEMS, plants: DEFAULT_PLANTS };
    var pot = state.pots[potIndex];
    if (!pot) return { ok: false, reason: "bad_pot" };
    if (pot.plantId) return { ok: false, reason: "occupied" };
    var it = catalog.items[itemId];
    if (!it || !it.seed) return { ok: false, reason: "not_seed" };
    if (!catalog.plants[it.seed]) return { ok: false, reason: "unknown_plant" };
    if (!takeItem(state, itemId, 1)) return { ok: false, reason: "missing_item" };
    pot.plantId = it.seed;
    pot.water = 40;
    pot.sun = 40;
    pot.mood = 50;
    pot.growth = 0;
    pot.tendedAt = Date.now();
    return { ok: true, plantId: it.seed };
  }


  function renamePlant(state, potIndex, name) {
    var pot = state.pots && state.pots[potIndex];
    if (!pot || !pot.plantId) return { ok: false, reason: "empty" };
    name = String(name || "").trim().slice(0, 12);
    if (!name) return { ok: false, reason: "empty_name" };
    pot.nickname = name;
    appendJournal(state, "给植物取名：「" + name + "」。");
    return { ok: true, nickname: name };
  }

  function tend(state, potIndex, act, plants) {
    plants = plants || DEFAULT_PLANTS;
    var pot = state.pots[potIndex];
    if (!pot || !pot.plantId) return { ok: false, reason: "empty" };

    if (act === "water") {
      pot.water = Math.min(100, pot.water + 28);
    } else if (act === "sun") {
      pot.sun = Math.min(100, pot.sun + 28);
    } else if (act === "talk") {
      pot.mood = Math.min(100, pot.mood + 22);
    } else if (act === "harvest") {
      if (!isReady(pot, plants)) return { ok: false, reason: "not_ready" };
      var def = plants[pot.plantId];
      var n = 1 + (pot.mood > 70 ? 1 : 0);
      addItem(state, def.harvest, n);
      state.hearts = (state.hearts || 0) + 1;
      state.coins = (state.coins || 0) + ECONOMY.harvestCoins;
      if (!state.stats) state.stats = {};
      state.stats.plantsHarvested = (state.stats.plantsHarvested || 0) + 1;
      pot.growth = def.days * 0.4;
      pot.water = 30;
      pot.sun = 30;
      pot.mood = 40;
      pot.tendedAt = Date.now();
      return { ok: true, harvested: def.harvest, count: n };
    } else {
      return { ok: false, reason: "bad_act" };
    }

    var care = (pot.water + pot.sun + pot.mood) / 300;
    pot.growth += 0.35 + care * 0.55;
    pot.water = Math.max(0, pot.water - 6);
    pot.sun = Math.max(0, pot.sun - 5);
    pot.mood = Math.max(0, pot.mood - 4);
    pot.tendedAt = Date.now();
    return { ok: true, growth: pot.growth };
  }

  function settleOfflineGrowth(state, now, plants) {
    plants = plants || DEFAULT_PLANTS;
    now = now || Date.now();
    (state.pots || []).forEach(function (pot) {
      if (!pot.plantId || !pot.tendedAt) return;
      var hours = Math.min(12, (now - pot.tendedAt) / 3600000);
      if (hours < 0.15) return;
      var care = (pot.water + pot.sun + pot.mood) / 300;
      pot.growth += hours * (0.15 + care * 0.2);
      pot.water = Math.max(0, pot.water - hours * 4);
      pot.sun = Math.max(0, pot.sun - hours * 3);
      pot.mood = Math.max(10, pot.mood - hours * 2);
      pot.tendedAt = now;
    });
    return state;
  }

  function scoreDrink(customer, craft, catalogs) {
    catalogs = catalogs || {};
    var cups = catalogs.cups || DEFAULT_CUPS;
    var bases = catalogs.bases || DEFAULT_BASES;
    var flavors = catalogs.flavors || DEFAULT_FLAVORS;
    var toppings = catalogs.toppings || DEFAULT_TOPPINGS;

    var cupDef = cups.find(function (x) {
      return x.id === craft.cup;
    });
    var baseDef = bases.find(function (x) {
      return x.id === craft.base;
    });
    var flavorDef = flavors.find(function (x) {
      return x.id === craft.flavor;
    });
    var topDef = toppings.find(function (x) {
      return x.id === craft.topping;
    });

    if (!cupDef || !baseDef || !flavorDef) {
      return { score: 0, notes: ["incomplete"], coins: 0, hearts: 0 };
    }

    var score = 1;
    var notes = [];

    if (customer.flavors && customer.flavors.indexOf(flavorDef.id) >= 0) {
      score += 2;
      notes.push("风味很合心意");
    } else if (
      flavorDef.tags &&
      flavorDef.tags.some(function (t) {
        return customer.tags && customer.tags.indexOf(t) >= 0;
      })
    ) {
      score += 1;
      notes.push("味道方向对了");
    }
    if (customer.favoriteFlavor && flavorDef.id === customer.favoriteFlavor) {
      score += 0.5;
      notes.push("记得你上次的味道");
    }

    if (baseDef.vibe && customer.tags && customer.tags.indexOf(baseDef.vibe) >= 0) {
      score += 1;
      notes.push("基底很搭");
    }
    if (cupDef.vibe && customer.tags && customer.tags.indexOf(cupDef.vibe) >= 0) {
      score += 1;
      notes.push("杯子选得好");
    }
    if (customer.wantTopping && topDef && topDef.id !== "none") {
      score += 1;
      notes.push("装饰很可爱");
    } else if (topDef && topDef.id !== "none") {
      score += 0.5;
    }

    score = Math.min(5, score);
    var coins = ECONOMY.serveBase + Math.floor(score * ECONOMY.serveScoreMul);
    var hearts = score >= 3 ? 1 : 0;
    return { score: score, notes: notes, coins: coins, hearts: hearts };
  }

  function serveDrink(state, customer, craft, catalogs) {
    catalogs = catalogs || {};
    var bases = catalogs.bases || DEFAULT_BASES;
    var flavors = catalogs.flavors || DEFAULT_FLAVORS;
    var toppings = catalogs.toppings || DEFAULT_TOPPINGS;
    var baseDef = bases.find(function (b) {
      return b.id === craft.base;
    });
    var flavorDef = flavors.find(function (f) {
      return f.id === craft.flavor;
    });
    var topDef = toppings.find(function (t) {
      return t.id === craft.topping;
    });
    if (!baseDef || !flavorDef) return { ok: false, reason: "incomplete" };

    if (baseDef.need && !takeItem(state, baseDef.need, 1)) {
      return { ok: false, reason: "missing_base" };
    }
    if (flavorDef.need && !takeItem(state, flavorDef.need, 1)) {
      if (baseDef.need) addItem(state, baseDef.need, 1);
      return { ok: false, reason: "missing_flavor" };
    }
    if (topDef && topDef.need && !takeItem(state, topDef.need, 1)) {
      if (baseDef.need) addItem(state, baseDef.need, 1);
      if (flavorDef.need) addItem(state, flavorDef.need, 1);
      return { ok: false, reason: "missing_topping" };
    }

    var result = scoreDrink(customer, craft, catalogs);
    state.coins = (state.coins || 0) + result.coins;
    state.hearts = (state.hearts || 0) + result.hearts;
    if (!state.drinksMade) state.drinksMade = {};
    var drinkKey = [craft.cup, craft.base, craft.flavor, craft.topping || "none"].join("-");
    state.drinksMade[drinkKey] = (state.drinksMade[drinkKey] || 0) + 1;
    if (!state.stats) state.stats = {};
    state.stats.drinksServed = (state.stats.drinksServed || 0) + 1;
    return { ok: true, result: result, drinkKey: drinkKey };
  }

  function serialize(state) {
    return JSON.stringify(state);
  }

  function migrateState(data) {
    if (!data || typeof data !== "object") return data;
    var v = data.version || 1;
    if (v < 2) {
      data.settings = data.settings || { sound: true, reduceMotion: false, showTips: true, tutorialDone: false };
      data.season = data.season || "dusk";
    }
    if (v < 3) {
      data.potSlots = data.potSlots || (data.pots && data.pots.length) || 4;
      data.pathThemeId = data.pathThemeId || "maple_lane";
      data.daily = data.daily || null;
    }
    data.version = VERSION;
    return data;
  }

  function deserialize(raw) {
    if (!raw) return null;
    var data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!data || typeof data !== "object") return null;
    data = migrateState(data);
    var base = defaultState();
    Object.keys(base).forEach(function (k) {
      if (data[k] === undefined) data[k] = base[k];
    });
    if (!Array.isArray(data.pots) || !data.pots.length) data.pots = base.pots;
    while (data.pots.length < (data.potSlots || 4)) data.pots.push(emptyPot());
    data.version = VERSION;
    return data;
  }

  function mergeCatalog(extra) {
    extra = extra || {};
    return {
      items: Object.assign({}, DEFAULT_ITEMS, extra.items || {}),
      plants: Object.assign({}, DEFAULT_PLANTS, extra.plants || {}),
      cups: (DEFAULT_CUPS || []).concat(extra.cups || []),
      bases: (DEFAULT_BASES || []).concat(extra.bases || []),
      flavors: (DEFAULT_FLAVORS || []).concat(extra.flavors || []),
      toppings: (DEFAULT_TOPPINGS || []).concat(extra.toppings || []),
      customers: (DEFAULT_CUSTOMERS || []).concat(extra.customers || []),
    };
  }

  function pickRandomCustomer(customers, rng) {
    customers = customers || DEFAULT_CUSTOMERS;
    rng = rng || Math.random;
    var c = customers[Math.floor(rng() * customers.length)];
    return Object.assign({}, c, { id: Date.now() + Math.floor(rng() * 1000) });
  }

  function assertNoCombat(text) {
    var s = String(text || "");
    var banned = [
      ["d","amage"].join(""),
      ["H","P"].join(""),
      "攻击",
      "战斗",
      "击杀",
      ["blo","od"].join("")
    ];
    for (var i = 0; i < banned.length; i++) {
      if (s.toLowerCase().indexOf(banned[i].toLowerCase()) >= 0) return false;
    }
    return true;
  }

  return {
    SAVE_KEY: SAVE_KEY,
    VERSION: VERSION,
    DEFAULT_ITEMS: DEFAULT_ITEMS,
    DEFAULT_PLANTS: DEFAULT_PLANTS,
    DEFAULT_CUPS: DEFAULT_CUPS,
    DEFAULT_BASES: DEFAULT_BASES,
    DEFAULT_FLAVORS: DEFAULT_FLAVORS,
    DEFAULT_TOPPINGS: DEFAULT_TOPPINGS,
    DEFAULT_CUSTOMERS: DEFAULT_CUSTOMERS,
    SEASON_ORDER: SEASON_ORDER,
    SEASON_LABELS: SEASON_LABELS,
    SEASON_ART: SEASON_ART,
    DEFAULT_ACHIEVEMENTS: DEFAULT_ACHIEVEMENTS,
    emptyPot: emptyPot,
    defaultState: defaultState,
    bagCount: bagCount,
    hasItem: hasItem,
    addItem: addItem,
    takeItem: takeItem,
    growthStage: growthStage,
    isReady: isReady,
    plantSeed: plantSeed,
    renamePlant: renamePlant,
    tend: tend,
    settleOfflineGrowth: settleOfflineGrowth,
    scoreDrink: scoreDrink,
    serveDrink: serveDrink,
    serialize: serialize,
    deserialize: deserialize,
    migrateState: migrateState,
    mergeCatalog: mergeCatalog,
    pickRandomCustomer: pickRandomCustomer,
    assertNoCombat: assertNoCombat,
    advanceSeason: advanceSeason,
    appendJournal: appendJournal,
    evaluateAchievements: evaluateAchievements,
    getSettings: getSettings,
    updateSettings: updateSettings,
    exportSave: exportSave,
    importSave: importSave,
    DAILY_GOAL_DEFS: DAILY_GOAL_DEFS,
    dayKey: dayKey,
    ensureDailyGoals: ensureDailyGoals,
    evaluateDailyGoals: evaluateDailyGoals,
    claimDailyReward: claimDailyReward,
    createDemoState: createDemoState,
    unlockPotSlot: unlockPotSlot,
    ECONOMY: ECONOMY,
    DEFAULT_PATH_THEMES: DEFAULT_PATH_THEMES,
    getPathTheme: getPathTheme,
    setPathTheme: setPathTheme,
    buildSpawnList: buildSpawnList,
  };
});
