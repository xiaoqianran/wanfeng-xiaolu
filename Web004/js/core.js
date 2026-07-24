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
  var ECONOMY = {
    serveBase: 5,
    serveScoreMul: 2,
    harvestCoins: 4,
    pathBonus: 3,
    dailyRewardCoins: 10,
    dailyRewardHearts: 1,
    potUnlockCost: 25,
    affinityBonusThreshold: 3,
    wateringCanMax: 5,
    wateringCanBonus: 12,
  };

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
        weatherFx: true,
        ambience: false,
        quietShop: false,
      },
      pathThemeId: "maple_lane",
      serveStreak: 0,
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
    var firstVisit = !(state._themesTouched && state._themesTouched[themeId]);
    state.pathThemeId = themeId;
    if (!state._themesTouched) state._themesTouched = {};
    state._themesTouched[themeId] = true;
    state.lastPathThemeId = themeId;
    if (firstVisit) {
      var name = themeId;
      for (var j = 0; j < themes.length; j++) {
        if (themes[j].id === themeId) {
          name = themes[j].name || themeId;
          break;
        }
      }
      appendJournal(state, "第一次走上「" + name + "」，风的味道不太一样。");
      if (!state.stats) state.stats = {};
      state.stats.firstThemeVisits = (state.stats.firstThemeVisits || 0) + 1;
    }
    return { ok: true, themeId: themeId, firstVisit: firstVisit };
  }

  /** Soft favorite path theme — one-tap return, no combat */
  function favoritePathTheme(state, themeId) {
    themeId = String(themeId || state.pathThemeId || "");
    if (!themeId) return { ok: false, reason: "empty" };
    state.favoritePathThemeId = themeId;
    appendJournal(state, "把小路「" + themeId + "」标成了常走的那条。");
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
      weatherFx: true,
      ambience: false,
      quietShop: false,
    };
    if (state.settings.ambience === undefined) state.settings.ambience = false;
    if (state.settings.weatherFx === undefined) state.settings.weatherFx = true;
    if (state.settings.quietShop === undefined) state.settings.quietShop = false;
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
    { id: "pot_note_day", name: "写一句花盆便签", desc: "给植物贴一张便签", check: function (s, p) { return ((s.stats && s.stats.potNotes) || 0) > (p.potNotes || 0); } },
    { id: "bench_once", name: "长椅歇脚一次", desc: "在小路长椅坐下歇歇", check: function (s, p) { return ((s.stats && s.stats.benchSits) || 0) > (p.benchSits || 0); } },
  ];

  function dayKey(ts) {
    var d = new Date(ts || Date.now());
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /**
   * Soft daily special — season + day-key pick one flavor suggestion.
   * Matching it on serve is a gentle tip, not a hard quest.
   */
  var DAILY_SPECIAL_BY_SEASON = {
    spring: [
      { flavor: "jasmine", label: "茉莉" },
      { flavor: "honeysuckle", label: "金银花" },
      { flavor: "chamomile", label: "洋甘菊" },
      { flavor: "lilac", label: "丁香" },
      { flavor: "cherry", label: "樱桃" },
      { flavor: "apricot", label: "杏" },
      { flavor: "vanilla", label: "香草" },
    ],
    summer: [
      { flavor: "mint", label: "薄荷" },
      { flavor: "perilla", label: "紫苏" },
      { flavor: "dill", label: "莳萝" },
      { flavor: "matcha", label: "抹茶" },
      { flavor: "lemongrass", label: "香茅" },
      { flavor: "passion_fruit", label: "百香果" },
      { flavor: "kiwi", label: "猕猴桃" },
      { flavor: "grapefruit", label: "西柚" },
      { flavor: "wax_apple", label: "莲雾" },
      { flavor: "sugarcane", label: "甘蔗" },
      { flavor: "lemon", label: "柠檬" },
      { flavor: "lime", label: "青柠" },
    ],
    autumn: [
      { flavor: "honey", label: "野蜜" },
      { flavor: "peach", label: "水蜜桃" },
      { flavor: "tea_leaf", label: "野茶" },
      { flavor: "thyme", label: "百里香" },
      { flavor: "pear", label: "梨" },
      { flavor: "guava", label: "番石榴" },
    ],
    winter: [
      { flavor: "tea_leaf", label: "野茶" },
      { flavor: "yuzu", label: "柚子" },
      { flavor: "honey", label: "野蜜" },
      { flavor: "rosemary", label: "迷迭香" },
      { flavor: "jujube", label: "红枣" },
      { flavor: "tangerine", label: "蜜橘" },
      { flavor: "kumquat", label: "金桔" },
      { flavor: "cocoa", label: "可可" },
      { flavor: "vanilla", label: "香草" },
    ],
    dusk: [
      { flavor: "lavender_bud", label: "薰衣草" },
      { flavor: "jasmine", label: "茉莉" },
      { flavor: "peach", label: "水蜜桃" },
      { flavor: "mint", label: "薄荷" },
      { flavor: "bergamot", label: "佛手柑" },
      { flavor: "dragonfruit", label: "火龙果" },
      { flavor: "cherry", label: "樱桃" },
    ],
  };

  function getDailySpecial(state, now) {
    now = now || Date.now();
    var key = dayKey(now);
    var season = (state && state.season) || "dusk";
    var pool = DAILY_SPECIAL_BY_SEASON[season] || DAILY_SPECIAL_BY_SEASON.dusk;
    var sum = 0;
    for (var i = 0; i < key.length; i++) sum = (sum * 33 + key.charCodeAt(i)) >>> 0;
    var pick = pool[sum % pool.length];
    return {
      key: key,
      season: season,
      flavor: pick.flavor,
      label: pick.label,
      hint: "今日小特调方向：" + pick.label,
    };
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
          potNotes: (state.stats && state.stats.potNotes) || 0,
          benchSits: (state.stats && state.stats.benchSits) || 0,
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


  function softNewDay(state, now) {
    now = now || Date.now();
    state.day = (state.day || 1) + 1;
    // force daily refresh
    if (state.daily) state.daily.key = "";
    ensureDailyGoals(state, now);
    state._tendsToday = 0;
    appendJournal(state, "新的一天开始了。背包还在，风也还在。");
    return { ok: true, day: state.day, daily: state.daily };
  }

  var DAILY_GIFT_POOL = ["petal", "maple", "clover", "mint", "berry", "stone", "seashell", "pinecone", "rosemary", "lavender_bud", "honeysuckle", "sage", "yuzu", "matcha", "moss"];

  function claimDailyReward(state) {
    var ev = evaluateDailyGoals(state);
    if (!ev.allDone) return { ok: false, reason: "incomplete" };
    if (ev.daily.claimed) return { ok: false, reason: "claimed" };
    ev.daily.claimed = true;
    state.coins = (state.coins || 0) + ECONOMY.dailyRewardCoins;
    state.hearts = (state.hearts || 0) + ECONOMY.dailyRewardHearts;
    // soft day-end gift: deterministic from day key so not pure RNG spam
    var key = (ev.daily && ev.daily.key) || dayKey();
    var sum = 0;
    for (var i = 0; i < key.length; i++) sum += key.charCodeAt(i);
    var giftId = DAILY_GIFT_POOL[sum % DAILY_GIFT_POOL.length];
    addItem(state, giftId, 1);
    appendJournal(state, "完成了今日的温柔小目标，还收到一份小礼：" + giftId + "。");
    return {
      ok: true,
      coins: ECONOMY.dailyRewardCoins,
      hearts: ECONOMY.dailyRewardHearts,
      gift: giftId,
    };
  }

  /** Demo mode: seed a showcase state without combat */
  function unlockPotSlot(state, cost) {
    cost = cost == null ? (ECONOMY.potUnlockCost || 25) : cost;
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
    s.settings = { sound: true, reduceMotion: false, showTips: true, tutorialDone: true, weatherFx: true, ambience: false };
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
    { id: "gentle_rest", name: "陪它歇歇", desc: "让植物休息 3 次", check: function (s) { return (s.stats && s.stats.rests || 0) >= 3; } },
    { id: "theme_walker", name: "多路旅人", desc: "切换过 3 种小路主题", check: function (s) { return Object.keys(s._themesTouched || {}).length >= 3; } },
    { id: "mail_reader", name: "拆信人", desc: "读过 3 封来信", check: function (s) { return Object.keys(s._readMail || {}).length >= 3; } },
    { id: "pot_scribe", name: "花盆便签", desc: "给植物写下 2 句便签", check: function (s) { return (s.stats && s.stats.potNotes || 0) >= 2; } },
    { id: "bench_sitter", name: "长椅旅人", desc: "在小路长椅歇脚 3 次", check: function (s) { return (s.stats && s.stats.benchSits || 0) >= 3; } },
    { id: "theme_collector", name: "十路旅人", desc: "切换过 5 种小路主题", check: function (s) { return Object.keys(s._themesTouched || {}).length >= 5; } },
    { id: "can_gardener", name: "小水壶园丁", desc: "用水壶浇灌 5 次", check: function (s) { return (s.stats && s.stats.canWaters || 0) >= 5; } },
    { id: "sill_photographer", name: "窗台速写", desc: "拍下 3 张盆栽速写", check: function (s) { return (s.stats && s.stats.potSnaps || 0) >= 3; } },
    { id: "discover_15", name: "图鉴半开", desc: "发现 15 种收集物", check: function (s) { return Object.keys(s.discovered || {}).length >= 15; } },
    { id: "pin_host", name: "记得你", desc: "标记过一位常客", check: function (s) { return !!(s.pinnedCustomer); } },
    { id: "snow_walker", name: "雪灯旅人", desc: "走过雪灯小径", check: function (s) { return !!(s._themesTouched && s._themesTouched.snow_lantern); } },
    { id: "fav_path", name: "有常走的路", desc: "标记一条常走小路", check: function (s) { return !!(s.favoritePathThemeId); } },
    { id: "root_memory", name: "熟土记忆", desc: "在同一花盆收获满 3 次（记忆加成）", check: function (s) { return (s.stats && s.stats.memoryHarvests || 0) >= 1; } },
    { id: "order_keeper", name: "记得口味", desc: "为常客复刻上次配方 1 次", check: function (s) { return (s.stats && s.stats.repeatOrders || 0) >= 1; } },
    { id: "early_walker", name: "今日第一脚", desc: "领取 3 次今日首次出门奖励", check: function (s) { return (s.stats && s.stats.firstWalks || 0) >= 3; } },
    { id: "sticker_collector", name: "贴纸收藏", desc: "获得 2 枚小路里程贴纸", check: function (s) { return Object.keys(s.pathStickers || {}).length >= 2; } },
    { id: "daily_specialist", name: "今日特调手", desc: "按今日小特调出杯 3 次", check: function (s) { return (s.stats && s.stats.dailySpecialHits || 0) >= 3; } },
    { id: "coastal_set", name: "潮湾三件套", desc: "发现贝壳、河光石与海盐晶", check: function (s) {
      var d = s.discovered || {};
      return !!(d.seashell && d.river_pebble && d.salt_crystal);
    } },
    { id: "herb_garden", name: "草本窗台", desc: "发现罗勒、香茅、莳萝与百里香", check: function (s) {
      var d = s.discovered || {};
      return !!(d.basil && d.lemongrass && d.dill && d.thyme);
    } },
    { id: "fennel_sill", name: "茴香窗台", desc: "发现茴香并可种植", check: function (s) {
      return !!(s.discovered && s.discovered.fennel);
    } },
    { id: "bergamot_sill", name: "佛手柑窗台", desc: "发现佛手柑并可种植", check: function (s) {
      return !!(s.discovered && s.discovered.bergamot);
    } },
    { id: "moss_walker", name: "青苔旅人", desc: "走过青苔石阶", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.moss_steps);
    } },
    { id: "memory_keeper", name: "回忆保管员", desc: "图鉴回忆页攒下 2 张速写", check: function (s) {
      return (s.stats && s.stats.potSnaps || 0) >= 2;
    } },
    { id: "coriander_sill", name: "香菜窗台", desc: "发现香菜", check: function (s) {
      return !!(s.discovered && s.discovered.coriander);
    } },
    { id: "ink_walker", name: "墨香旅人", desc: "走过墨香小院", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ink_courtyard);
    } },
    { id: "regular_host", name: "常客东道", desc: "与同一位客人熟悉度达到 3", check: function (s) {
      var aff = s.customerAffinity || {};
      return Object.keys(aff).some(function (k) { return (aff[k] || 0) >= 3; });
    } },
    { id: "violet_sill", name: "紫花窗台", desc: "发现紫罗兰", check: function (s) {
      return !!(s.discovered && s.discovered.violet);
    } },
    { id: "lotus_walker", name: "荷塘旅人", desc: "走过荷塘浅步", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lotus_pond);
    } },
    { id: "sill_arranger", name: "窗台整理", desc: "对调花盆 2 次", check: function (s) {
      return (s.stats && s.stats.potSwaps || 0) >= 2;
    } },
    { id: "calendula_sill", name: "金盏窗台", desc: "发现金盏花", check: function (s) {
      return !!(s.discovered && s.discovered.calendula);
    } },
    { id: "chime_walker", name: "风铃旅人", desc: "走过风铃廊", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wind_chime);
    } },
    { id: "dew_keeper", name: "晨露看顾", desc: "收获 3 次隔夜晨露", check: function (s) {
      return (s.stats && s.stats.morningDews || 0) >= 3;
    } },
    { id: "lemon_balm_sill", name: "香蜂草窗台", desc: "发现香蜂草", check: function (s) {
      return !!(s.discovered && s.discovered.lemon_balm);
    } },
    { id: "tea_walker", name: "茶台旅人", desc: "走过茶台慢坡", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.tea_terrace);
    } },
    { id: "ginger_sill", name: "姜香窗台", desc: "发现姜片", check: function (s) {
      return !!(s.discovered && s.discovered.ginger);
    } },
    { id: "rain_walker", name: "雨园旅人", desc: "走过雨园慢径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rain_garden);
    } },
    { id: "cardamom_sill", name: "豆蔻窗台", desc: "发现豆蔻", check: function (s) {
      return !!(s.discovered && s.discovered.cardamom);
    } },
    { id: "orchard_walker", name: "果园旅人", desc: "走过果园暮色", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.orchard_dusk);
    } },
    { id: "rose_sill", name: "玫瑰窗台", desc: "发现玫瑰花瓣", check: function (s) {
      return !!(s.discovered && s.discovered.rose_petal);
    } },
    { id: "rose_walker", name: "玫瑰旅人", desc: "走过玫瑰短巷", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rose_lane);
    } },
    { id: "recipe_pinner", name: "配方钉选", desc: "钉住一份秘密配方", check: function (s) {
      return !!(s.pinnedRecipeId);
    } },
    { id: "marjoram_sill", name: "马郁兰窗台", desc: "发现马郁兰", check: function (s) {
      return !!(s.discovered && s.discovered.marjoram);
    } },
    { id: "cliff_walker", name: "崖边旅人", desc: "走过崖边慢径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cliff_path);
    } },
    { id: "companion_gardener", name: "邻盆园丁", desc: "在邻盆作伴时照料 5 次", check: function (s) {
      return (s.stats && s.stats.companionTends || 0) >= 5;
    } },
    { id: "elder_sill", name: "接骨木窗台", desc: "发现接骨木花", check: function (s) {
      return !!(s.discovered && s.discovered.elderflower);
    } },
    { id: "willow_walker", name: "柳岸旅人", desc: "走过柳岸轻步", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.willow_bank);
    } },
    { id: "open_calm_host", name: "清静店主", desc: "开店清静加成累计 5 次", check: function (s) {
      return (s.stats && s.stats.openCalmServes || 0) >= 5;
    } },
    { id: "hibiscus_sill", name: "洛神窗台", desc: "发现洛神花", check: function (s) {
      return !!(s.discovered && s.discovered.hibiscus);
    } },
    { id: "night_pond_walker", name: "夜荷旅人", desc: "走过夜荷池", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.night_pond);
    } },
    { id: "chrys_sill", name: "菊香窗台", desc: "发现菊花", check: function (s) {
      return !!(s.discovered && s.discovered.chrysanthemum);
    } },
    { id: "chrys_walker", name: "菊圃旅人", desc: "走过菊圃晚径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chrys_garden);
    } },
    { id: "jasmine_sill", name: "茉莉窗台", desc: "发现茉莉", check: function (s) {
      return !!(s.discovered && s.discovered.jasmine);
    } },
    { id: "osmanthus_walker", name: "桂院旅人", desc: "走过桂花小院", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.osmanthus_court);
    } },
    { id: "shop_closer", name: "温柔收摊", desc: "收摊记录 3 次", check: function (s) {
      return (s.stats && s.stats.shopCloses || 0) >= 3;
    } },
    { id: "sea_lav_sill", name: "补血草窗台", desc: "发现补血草", check: function (s) {
      return !!(s.discovered && s.discovered.sea_lavender);
    } },
    { id: "seaside_walker", name: "海边旅人", desc: "走过海边暮色", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.seaside_dusk);
    } },
    { id: "path_atlas", name: "小路图鉴手", desc: "走过 15 种小路主题", check: function (s) {
      return Object.keys(s._themesTouched || {}).length >= 15;
    } },
    { id: "peach_sill", name: "蜜桃窗台", desc: "发现蜜桃瓣", check: function (s) {
      return !!(s.discovered && s.discovered.peach);
    } },
    { id: "lantern_bridge_walker", name: "灯桥旅人", desc: "走过灯桥夜步", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lantern_bridge);
    } },
    { id: "pine_sill", name: "松针窗台", desc: "发现松针", check: function (s) {
      return !!(s.discovered && s.discovered.pine_needle);
    } },
    { id: "pine_walker", name: "松脊旅人", desc: "走过松脊晚风", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pine_ridge);
    } },
    { id: "plum_sill", name: "李子窗台", desc: "发现李子", check: function (s) {
      return !!(s.discovered && s.discovered.plum);
    } },
    { id: "plum_walker", name: "李花旅人", desc: "走过李花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.plum_path);
    } },
    { id: "path_explorer", name: "四十路旅人", desc: "走过 20 种小路主题", check: function (s) {
      return Object.keys(s._themesTouched || {}).length >= 20;
    } },
    { id: "mulberry_sill", name: "桑葚窗台", desc: "发现桑葚", check: function (s) {
      return !!(s.discovered && s.discovered.mulberry);
    } },
    { id: "mulberry_walker", name: "桑荫旅人", desc: "走过桑荫小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mulberry_lane);
    } },
    { id: "variety_gardener", name: "多样园丁", desc: "多样窗台照料 5 次", check: function (s) {
      return (s.stats && s.stats.varietyTends || 0) >= 5;
    } },
    { id: "strawberry_sill", name: "草莓窗台", desc: "发现草莓", check: function (s) {
      return !!(s.discovered && s.discovered.strawberry);
    } },
    { id: "berry_walker", name: "莓田旅人", desc: "走过莓田慢步", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.berry_patch);
    } },
    { id: "blueberry_sill", name: "蓝莓窗台", desc: "发现蓝莓", check: function (s) {
      return !!(s.discovered && s.discovered.blueberry);
    } },
    { id: "fog_walker", name: "雾甸旅人", desc: "走过雾草甸", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fog_meadow);
    } },
    { id: "grape_sill", name: "葡萄窗台", desc: "发现葡萄", check: function (s) {
      return !!(s.discovered && s.discovered.grape);
    } },
    { id: "vine_walker", name: "梯田旅人", desc: "走过葡萄梯田", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.vine_terrace);
    } },
    { id: "persimmon_sill", name: "柿子窗台", desc: "发现柿子", check: function (s) {
      return !!(s.discovered && s.discovered.persimmon);
    } },
    { id: "autumn_walker", name: "秋坡旅人", desc: "走过秋坡慢步", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.autumn_slope);
    } },
    { id: "fig_sill", name: "无花果窗台", desc: "发现无花果", check: function (s) {
      return !!(s.discovered && s.discovered.fig);
    } },
    { id: "fig_walker", name: "果台旅人", desc: "走过无花果台", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fig_terrace);
    } },
    { id: "pom_sill", name: "石榴窗台", desc: "发现石榴籽", check: function (s) {
      return !!(s.discovered && s.discovered.pomegranate);
    } },
    { id: "pom_walker", name: "石榴院旅人", desc: "走过石榴小院", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pomegranate_court);
    } },
    { id: "plant_fav", name: "最想照料", desc: "标记一盆最想照料的植物", check: function (s) {
      return !!(s.favoritePlantId);
    } },
    { id: "yangmei_sill", name: "杨梅窗台", desc: "发现杨梅", check: function (s) {
      return !!(s.discovered && s.discovered.yangmei);
    } },
    { id: "pavilion_walker", name: "雨亭旅人", desc: "走过雨亭慢歇", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rain_pavilion);
    } },
    { id: "morning_gardener", name: "晨间园丁", desc: "完成 5 次晨间首次照料", check: function (s) {
      return (s.stats && s.stats.morningTends || 0) >= 5;
    } },
    { id: "longan_sill", name: "龙眼窗台", desc: "发现龙眼", check: function (s) {
      return !!(s.discovered && s.discovered.longan);
    } },
    { id: "dew_walker", name: "露径旅人", desc: "走过露径慢步", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dew_path);
    } },
    { id: "litchi_sill", name: "荔枝窗台", desc: "发现荔枝", check: function (s) {
      return !!(s.discovered && s.discovered.litchi);
    } },
    { id: "litchi_walker", name: "荔林旅人", desc: "走过荔枝林径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.litchi_grove);
    } },
    { id: "path_fifty", name: "五十路图鉴", desc: "切换过 25 种小路主题", check: function (s) {
      return Object.keys(s._themesTouched || {}).length >= 25;
    } },
    { id: "loquat_sill", name: "枇杷窗台", desc: "发现枇杷", check: function (s) {
      return !!(s.discovered && s.discovered.loquat);
    } },
    { id: "loquat_walker", name: "枇杷巷旅人", desc: "走过枇杷巷", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.loquat_lane);
    } },
    { id: "olive_sill", name: "橄榄窗台", desc: "发现橄榄", check: function (s) {
      return !!(s.discovered && s.discovered.olive);
    } },
    { id: "olive_walker", name: "橄榄坡旅人", desc: "走过橄榄坡", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.olive_grove);
    } },
    { id: "guest_scribe", name: "客人便签", desc: "为客人写下 2 条便签", check: function (s) {
      return (s.stats && s.stats.guestNotes || 0) >= 2;
    } },
    { id: "hawthorn_sill", name: "山楂窗台", desc: "发现山楂", check: function (s) {
      return !!(s.discovered && s.discovered.hawthorn);
    } },
    { id: "hawthorn_walker", name: "山楂径旅人", desc: "走过山楂短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hawthorn_path);
    } },
    { id: "mango_sill", name: "芒果窗台", desc: "发现芒果", check: function (s) {
      return !!(s.discovered && s.discovered.mango);
    } },
    { id: "mango_walker", name: "芒荫旅人", desc: "走过芒果树荫", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mango_shade);
    } },
    { id: "path_scribe", name: "换路手帐", desc: "首次踏上 5 条新小路并记入手帐", check: function (s) {
      return (s.stats && s.stats.firstThemeVisits || 0) >= 5;
    } },
    { id: "pineapple_sill", name: "菠萝窗台", desc: "发现菠萝", check: function (s) {
      return !!(s.discovered && s.discovered.pineapple);
    } },
    { id: "dune_walker", name: "沙丘旅人", desc: "走过沙丘晚风", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sand_dune);
    } },
    { id: "coconut_sill", name: "椰子窗台", desc: "发现椰子", check: function (s) {
      return !!(s.discovered && s.discovered.coconut);
    } },
    { id: "lagoon_walker", name: "潟湖旅人", desc: "走过潟湖浅径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lagoon_path);
    } },
    { id: "starfruit_sill", name: "杨桃窗台", desc: "发现杨桃", check: function (s) {
      return !!(s.discovered && s.discovered.starfruit);
    } },
    { id: "starfruit_walker", name: "杨桃径旅人", desc: "走过杨桃小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.starfruit_lane);
    } },
    { id: "kumquat_sill", name: "金桔窗台", desc: "发现金桔", check: function (s) {
      return !!(s.discovered && s.discovered.kumquat);
    } },
    { id: "kumquat_walker", name: "金桔篱旅人", desc: "走过金桔篱径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.kumquat_hedge);
    } },
    { id: "passion_sill", name: "百香果窗台", desc: "发现百香果", check: function (s) {
      return !!(s.discovered && s.discovered.passion_fruit);
    } },
    { id: "passion_walker", name: "百香藤廊旅人", desc: "走过百香藤廊", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.passion_arch);
    } },
    { id: "kiwi_sill", name: "猕猴桃窗台", desc: "发现猕猴桃", check: function (s) {
      return !!(s.discovered && s.discovered.kiwi);
    } },
    { id: "kiwi_walker", name: "猕猴桃架径旅人", desc: "走过猕猴桃架径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.kiwi_trellis);
    } },
    { id: "dragonfruit_sill", name: "火龙果窗台", desc: "发现火龙果", check: function (s) {
      return !!(s.discovered && s.discovered.dragonfruit);
    } },
    { id: "dragon_walker", name: "火龙仙人掌径旅人", desc: "走过火龙仙人掌径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dragon_cactus);
    } },
    { id: "guava_sill", name: "番石榴窗台", desc: "发现番石榴", check: function (s) {
      return !!(s.discovered && s.discovered.guava);
    } },
    { id: "guava_walker", name: "番石榴径旅人", desc: "走过番石榴小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.guava_grove);
    } },
    { id: "cherry_sill", name: "樱桃窗台", desc: "发现樱桃", check: function (s) {
      return !!(s.discovered && s.discovered.cherry);
    } },
    { id: "cherry_walker", name: "樱桃巷旅人", desc: "走过樱桃短巷", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cherry_lane);
    } },
    { id: "apricot_sill", name: "杏子窗台", desc: "发现杏", check: function (s) {
      return !!(s.discovered && s.discovered.apricot);
    } },
    { id: "apricot_walker", name: "杏径旅人", desc: "走过杏花小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.apricot_grove);
    } },
    { id: "pear_sill", name: "梨子窗台", desc: "发现梨", check: function (s) {
      return !!(s.discovered && s.discovered.pear);
    } },
    { id: "pear_walker", name: "梨园旅人", desc: "走过梨园慢径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pear_orchard);
    } },
    { id: "jujube_sill", name: "红枣窗台", desc: "发现红枣", check: function (s) {
      return !!(s.discovered && s.discovered.jujube);
    } },
    { id: "jujube_walker", name: "红枣径旅人", desc: "走过红枣短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.jujube_path);
    } },
    { id: "grapefruit_sill", name: "西柚窗台", desc: "发现西柚", check: function (s) {
      return !!(s.discovered && s.discovered.grapefruit);
    } },
    { id: "grapefruit_walker", name: "西柚露台旅人", desc: "走过西柚露台", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.grapefruit_terrace);
    } },
    { id: "tangerine_sill", name: "蜜橘窗台", desc: "发现蜜橘", check: function (s) {
      return !!(s.discovered && s.discovered.tangerine);
    } },
    { id: "tangerine_walker", name: "蜜橘石阶旅人", desc: "走过蜜橘石阶", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.tangerine_steps);
    } },
    { id: "wax_apple_sill", name: "莲雾窗台", desc: "发现莲雾", check: function (s) {
      return !!(s.discovered && s.discovered.wax_apple);
    } },
    { id: "wax_apple_walker", name: "莲雾径旅人", desc: "走过莲雾短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wax_apple_lane);
    } },
    { id: "sugarcane_sill", name: "甘蔗窗台", desc: "发现甘蔗", check: function (s) {
      return !!(s.discovered && s.discovered.sugarcane);
    } },
    { id: "sugarcane_walker", name: "甘蔗田旅人", desc: "走过甘蔗田径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cane_field);
    } },
    { id: "lemon_sill", name: "柠檬窗台", desc: "发现柠檬", check: function (s) {
      return !!(s.discovered && s.discovered.lemon);
    } },
    { id: "lemon_walker", name: "柠檬树径旅人", desc: "走过柠檬树径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lemon_grove);
    } },
    { id: "lime_sill", name: "青柠窗台", desc: "发现青柠", check: function (s) {
      return !!(s.discovered && s.discovered.lime);
    } },
    { id: "lime_walker", name: "青柠径旅人", desc: "走过青柠小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lime_path);
    } },
    { id: "vanilla_sill", name: "香草窗台", desc: "发现香草", check: function (s) {
      return !!(s.discovered && s.discovered.vanilla);
    } },
    { id: "vanilla_walker", name: "香草径旅人", desc: "走过香草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.vanilla_lane);
    } },
    { id: "cocoa_sill", name: "可可窗台", desc: "发现可可", check: function (s) {
      return !!(s.discovered && s.discovered.cocoa);
    } },
    { id: "cocoa_walker", name: "可可院旅人", desc: "走过可可小院", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cocoa_courtyard);
    } },
    { id: "path_catalog", name: "十路图鉴", desc: "切换过 10 种小路主题", check: function (s) { return Object.keys(s._themesTouched || {}).length >= 10; } },
    { id: "path_sixty", name: "六十路图鉴", desc: "切换过 60 种小路主题", check: function (s) { return Object.keys(s._themesTouched || {}).length >= 60; } },
    { id: "fav_path", name: "最爱的小路", desc: "标记一条最爱小路", check: function (s) { return !!(s.favoritePathThemeId); } },
    { id: "specialist_hand", name: "特调熟手", desc: "今日小特调命中 8 次", check: function (s) { return (s.stats && s.stats.dailySpecialHits || 0) >= 8; } },
    { id: "tip_friend", name: "小费罐朋友", desc: "小费罐累计换得 3 点心情", check: function (s) { return (s.stats && s.stats.tipJarHearts || 0) >= 3; } },
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

  /** Soft note on a pot — pure still-life journaling, no combat */
  function setPotNote(state, potIndex, note) {
    var pot = state.pots && state.pots[potIndex];
    if (!pot || !pot.plantId) return { ok: false, reason: "empty" };
    note = String(note || "").trim().slice(0, 40);
    if (!note) return { ok: false, reason: "empty_note" };
    pot.note = note;
    if (!state.stats) state.stats = {};
    state.stats.potNotes = (state.stats.potNotes || 0) + 1;
    appendJournal(state, "在花盆边写下一句：「" + note + "」。");
    return { ok: true, note: note };
  }

  /** Pathside bench rest: soft recovery, no combat, tiny heart chance via streak */
  function sitBench(state) {
    state = state || {};
    if (!state.stats) state.stats = {};
    state.stats.benchSits = (state.stats.benchSits || 0) + 1;
    var heartsGain = 0;
    if ((state.stats.benchSits % 3) === 0) {
      heartsGain = 1;
      state.hearts = (state.hearts || 0) + 1;
    }
    // walking/sitting also drips a bit into the watering can
    chargeWateringCan(state, 1);
    appendJournal(state, "在小路边的长椅上歇了歇脚。");
    return { ok: true, sits: state.stats.benchSits, hearts: heartsGain };
  }

  function getWateringCan(state) {
    if (!state.wateringCan || typeof state.wateringCan.charge !== "number") {
      state.wateringCan = { charge: 2, max: ECONOMY.wateringCanMax || 5 };
    }
    if (state.wateringCan.max == null) state.wateringCan.max = ECONOMY.wateringCanMax || 5;
    return state.wateringCan;
  }

  /** Soft charge from path walks / bench — no combat, no drain death */

  function upgradeWateringCan(state, cost) {
    cost = cost == null ? 20 : cost;
    var can = getWateringCan(state);
    if ((can.max || 5) >= 8) return { ok: false, reason: "max" };
    if ((state.coins || 0) < cost) return { ok: false, reason: "coins" };
    state.coins -= cost;
    can.max = (can.max || 5) + 1;
    can.charge = Math.min(can.max, (can.charge || 0) + 1);
    appendJournal(state, "水壶变大了一点，能多装一格水。");
    return { ok: true, max: can.max, cost: cost };
  }

  function chargeWateringCan(state, n) {
    n = n == null ? 1 : n;
    var can = getWateringCan(state);
    var before = can.charge;
    can.charge = Math.min(can.max, can.charge + n);
    return { ok: true, charge: can.charge, gained: can.charge - before, full: can.charge >= can.max };
  }

  /**
   * Soft first-walk-of-day bonus: first new path after daily key
   * grants tiny hearts/coins once — pure cozy, no combat.
   */
  function claimFirstWalkBonus(state, now) {
    now = now || Date.now();
    var key = dayKey(now);
    if (!state._firstWalk) state._firstWalk = {};
    if (state._firstWalk[key]) return { ok: false, reason: "claimed" };
    state._firstWalk[key] = true;
    state.coins = (state.coins || 0) + 2;
    state.hearts = (state.hearts || 0) + 1;
    chargeWateringCan(state, 1);
    if (!state.stats) state.stats = {};
    state.stats.firstWalks = (state.stats.firstWalks || 0) + 1;
    appendJournal(state, "今天第一次出门，晚风先送了一点小心意。");
    return { ok: true, coins: 2, hearts: 1 };
  }

  /** Soft path milestones — stickers at 5/15/30/50 walks, no combat */
  var PATH_MILESTONES = [
    { n: 5, id: "m5", name: "五段晚风", coins: 3, hearts: 1 },
    { n: 15, id: "m15", name: "十五段小路", coins: 5, hearts: 1 },
    { n: 30, id: "m30", name: "三十次出门", coins: 8, hearts: 2 },
    { n: 50, id: "m50", name: "五十段温柔", coins: 12, hearts: 2 },
  ];

  function checkPathMilestones(state) {
    if (!state.pathStickers) state.pathStickers = {};
    var walked = state.pathsWalked || 0;
    var newly = [];
    for (var i = 0; i < PATH_MILESTONES.length; i++) {
      var m = PATH_MILESTONES[i];
      if (walked >= m.n && !state.pathStickers[m.id]) {
        state.pathStickers[m.id] = { at: Date.now(), name: m.name };
        state.coins = (state.coins || 0) + m.coins;
        state.hearts = (state.hearts || 0) + m.hearts;
        appendJournal(state, "贴上小路贴纸：「" + m.name + "」。");
        newly.push(m);
      }
    }
    return { ok: true, newly: newly };
  }

  /**
   * Use watering can on a pot: spends 1 charge, extra water soft bonus.
   * Falls back to normal water if empty (still ok, just no bonus).
   */
  function useWateringCan(state, potIndex, plants) {
    plants = plants || DEFAULT_PLANTS;
    var pot = state.pots && state.pots[potIndex];
    if (!pot || !pot.plantId) return { ok: false, reason: "empty" };
    var can = getWateringCan(state);
    var bonus = 0;
    var used = false;
    if (can.charge >= 1) {
      can.charge -= 1;
      bonus = ECONOMY.wateringCanBonus || 12;
      used = true;
    }
    // apply base water via tend path fields
    pot.water = Math.min(100, pot.water + 28 + bonus);
    var season = state.season || "dusk";
    var seasonNote = null;
    if (season === "autumn") {
      pot.water = Math.min(100, pot.water + 6);
      pot.mood = Math.min(100, pot.mood + 4);
      seasonNote = "秋水温柔";
    }
    var care = (pot.water + pot.sun + pot.mood) / 300;
    pot.growth += 0.35 + care * 0.55 + (used ? 0.05 : 0);
    pot.water = Math.max(0, pot.water - 6);
    pot.sun = Math.max(0, pot.sun - 5);
    pot.mood = Math.max(0, pot.mood - 4);
    pot.tendedAt = Date.now();
    if (!state.stats) state.stats = {};
    state.stats.canWaters = (state.stats.canWaters || 0) + (used ? 1 : 0);
    state._tendsToday = (state._tendsToday || 0) + 1;
    return {
      ok: true,
      usedCan: used,
      bonus: bonus,
      charge: can.charge,
      growth: pot.growth,
      seasonNote: seasonNote,
    };
  }

  /** Soft hint: how many secret recipe slots match current craft */
  function recipeMatchHint(craft, recipes) {
    recipes = recipes || [];
    craft = craft || {};
    if (!craft.cup || !craft.base || !craft.flavor) {
      return { matches: 0, close: [], perfect: null };
    }
    var close = [];
    var perfect = null;
    for (var i = 0; i < recipes.length; i++) {
      var r = recipes[i];
      if (!r) continue;
      var score = 0;
      if (r.cup === craft.cup) score++;
      if (r.base === craft.base) score++;
      if (r.flavor === craft.flavor) score++;
      if ((r.topping || "none") === (craft.topping || "none")) score++;
      if (score === 4) {
        perfect = r;
      } else if (score >= 3) {
        close.push({ name: r.name, score: score });
      }
    }
    return { matches: close.length + (perfect ? 1 : 0), close: close, perfect: perfect };
  }

  function tend(state, potIndex, act, plants) {
    plants = plants || DEFAULT_PLANTS;
    var pot = state.pots[potIndex];
    if (!pot || !pot.plantId) return { ok: false, reason: "empty" };

    var season = state.season || "dusk";
    var seasonNote = null;

    if (act === "water") {
      pot.water = Math.min(100, pot.water + 28);
      // 秋晚多一点湿润关怀
      if (season === "autumn") {
        pot.water = Math.min(100, pot.water + 6);
        pot.mood = Math.min(100, pot.mood + 4);
        seasonNote = "秋水温柔";
      }
    } else if (act === "sun") {
      pot.sun = Math.min(100, pot.sun + 28);
      // 盛夏日照更足
      if (season === "summer") {
        pot.sun = Math.min(100, pot.sun + 8);
        pot.growth += 0.08;
        seasonNote = "夏日暖光";
      }
    } else if (act === "talk") {
      pot.mood = Math.min(100, pot.mood + 22);
      // 春日更爱聊天
      if (season === "spring") {
        pot.mood = Math.min(100, pot.mood + 8);
        pot.growth += 0.05;
        seasonNote = "春语轻声";
      }
    } else if (act === "rest") {
      // Soft rest: restore mood/water slightly, almost no growth push, no death
      pot.mood = Math.min(100, pot.mood + 18);
      pot.water = Math.min(100, pot.water + 8);
      pot.sun = Math.max(0, pot.sun - 3);
      pot.growth += 0.08;
      // 冬夜歇息格外舒服
      if (season === "winter") {
        pot.mood = Math.min(100, pot.mood + 10);
        pot.water = Math.min(100, pot.water + 4);
        seasonNote = "冬夜安歇";
      }
      pot.tendedAt = Date.now();
      if (!state.stats) state.stats = {};
      state.stats.rests = (state.stats.rests || 0) + 1;
      return { ok: true, rested: true, growth: pot.growth, mood: pot.mood, seasonNote: seasonNote };
    } else if (act === "harvest") {
      if (!isReady(pot, plants)) return { ok: false, reason: "not_ready" };
      var def = plants[pot.plantId];
      var n = 1 + (pot.mood > 70 ? 1 : 0);
      // Soft pot memory: same pot harvested many times feels "known"
      pot.harvestCount = (pot.harvestCount || 0) + 1;
      var memoryBonus = pot.harvestCount >= 3;
      if (memoryBonus) n += 1;
      addItem(state, def.harvest, n);
      state.hearts = (state.hearts || 0) + 1;
      state.coins = (state.coins || 0) + ECONOMY.harvestCoins + (memoryBonus ? 1 : 0);
      var gift = null;
      if (pot.mood > 85) {
        var extras = ["petal", "clover", "maple", "stone", "moss", "driftwood", "seashell"];
        gift = extras[Math.floor((pot.mood + (pot.water || 0)) % extras.length)];
        addItem(state, gift, 1);
      }
      if (!state.stats) state.stats = {};
      state.stats.plantsHarvested = (state.stats.plantsHarvested || 0) + 1;
      if (memoryBonus) state.stats.memoryHarvests = (state.stats.memoryHarvests || 0) + 1;
      pot.growth = def.days * 0.4;
      pot.water = 30;
      pot.sun = 30;
      // Known pots start a bit happier after harvest cycle
      pot.mood = memoryBonus ? 48 : 40;
      pot.tendedAt = Date.now();
      return {
        ok: true,
        harvested: def.harvest,
        count: n,
        gift: gift,
        harvestCount: pot.harvestCount,
        memoryBonus: memoryBonus,
      };
    } else {
      return { ok: false, reason: "bad_act" };
    }

    var care = (pot.water + pot.sun + pot.mood) / 300;
    pot.growth += 0.35 + care * 0.55;
    // Soft morning first-tend of the day: soil feels cooler, mood gentler
    if (!state.stats) state.stats = {};
    var dayK = dayKey(Date.now());
    if (state._tendDayKey !== dayK) {
      state._tendDayKey = dayK;
      state._tendsToday = 0;
    }
    state._tendsToday = (state._tendsToday || 0) + 1;
    if (state._tendsToday === 1) {
      pot.mood = Math.min(100, pot.mood + 4);
      pot.water = Math.min(100, pot.water + 3);
      if (!seasonNote) seasonNote = "晨间照料";
      state.stats.morningTends = (state.stats.morningTends || 0) + 1;
    }
    // 黄昏轻柔成长：几乎不催，只多一点心情
    if (season === "dusk" && !seasonNote) {
      pot.mood = Math.min(100, pot.mood + 3);
      seasonNote = "暮色静养";
    }
    // Soft companion sill: two+ planted pots feel a little less lonely
    var planted = 0;
    var kinds = {};
    for (var pi = 0; pi < (state.pots || []).length; pi++) {
      if (state.pots[pi] && state.pots[pi].plantId) {
        planted += 1;
        kinds[state.pots[pi].plantId] = true;
      }
    }
    var companion = false;
    if (planted >= 2) {
      pot.mood = Math.min(100, pot.mood + 3);
      companion = true;
      if (!seasonNote) seasonNote = "邻盆作伴";
      if (!state.stats) state.stats = {};
      state.stats.companionTends = (state.stats.companionTends || 0) + 1;
    }
    // Soft variety sill: 3+ different plant kinds — soft mood for diversity
    var variety = false;
    var kindCount = Object.keys(kinds).length;
    if (kindCount >= 3) {
      pot.mood = Math.min(100, pot.mood + 2);
      variety = true;
      if (!seasonNote || seasonNote === "邻盆作伴") seasonNote = "多样窗台";
      if (!state.stats) state.stats = {};
      state.stats.varietyTends = (state.stats.varietyTends || 0) + 1;
    }
    // Soft favorite plant: tending marked plant feels a little warmer
    if (state.favoritePlantId && pot.plantId === state.favoritePlantId) {
      pot.mood = Math.min(100, pot.mood + 2);
      if (!seasonNote) seasonNote = "最想照料";
    }
    pot.water = Math.max(0, pot.water - 6);
    pot.sun = Math.max(0, pot.sun - 5);
    pot.mood = Math.max(0, pot.mood - 4);
    pot.tendedAt = Date.now();
    return { ok: true, growth: pot.growth, seasonNote: seasonNote, companion: companion, variety: variety };
  }

  function settleOfflineGrowth(state, now, plants) {
    plants = plants || DEFAULT_PLANTS;
    now = now || Date.now();
    var dewCount = 0;
    (state.pots || []).forEach(function (pot) {
      if (!pot.plantId || !pot.tendedAt) return;
      var hours = Math.min(12, (now - pot.tendedAt) / 3600000);
      if (hours < 0.15) return;
      var care = (pot.water + pot.sun + pot.mood) / 300;
      pot.growth += hours * (0.15 + care * 0.2);
      pot.water = Math.max(0, pot.water - hours * 4);
      pot.sun = Math.max(0, pot.sun - hours * 3);
      pot.mood = Math.max(10, pot.mood - hours * 2);
      // Soft morning dew: after a long rest, leaves sip a little water/mood back
      if (hours >= 6) {
        pot.water = Math.min(100, pot.water + 8);
        pot.mood = Math.min(100, pot.mood + 6);
        dewCount += 1;
      }
      pot.tendedAt = now;
    });
    if (dewCount > 0) {
      if (!state.stats) state.stats = {};
      state.stats.morningDews = (state.stats.morningDews || 0) + dewCount;
    }
    return { state: state, dewCount: dewCount };
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
    // soft seasonal affinity (optional catalogs.season)
    var season = catalogs.season || customer.season;
    if (season === "spring" && (flavorDef.id === "jasmine" || flavorDef.id === "lavender_bud" || flavorDef.id === "lilac" || flavorDef.id === "chamomile" || flavorDef.id === "honeysuckle" || flavorDef.id === "bergamot" || flavorDef.id === "violet" || flavorDef.id === "calendula" || flavorDef.id === "rose_petal" || flavorDef.id === "elderflower" || flavorDef.id === "loquat" || flavorDef.id === "vanilla" || baseDef.id === "floral_tea")) {
      score += 0.5;
      notes.push("春日花香");
    }
    if (season === "summer" && (flavorDef.id === "mint" || flavorDef.id === "rosemary" || flavorDef.id === "bluebell" || flavorDef.id === "matcha" || flavorDef.id === "perilla" || flavorDef.id === "thyme" || flavorDef.id === "dill" || flavorDef.id === "basil" || flavorDef.id === "lemongrass" || flavorDef.id === "coriander" || flavorDef.id === "lemon_balm" || flavorDef.id === "marjoram" || flavorDef.id === "hibiscus" || flavorDef.id === "elderflower" || flavorDef.id === "sea_lavender" || flavorDef.id === "mulberry" || flavorDef.id === "strawberry" || flavorDef.id === "blueberry" || flavorDef.id === "pomegranate" || flavorDef.id === "yangmei" || flavorDef.id === "litchi" || flavorDef.id === "olive" || flavorDef.id === "mango" || flavorDef.id === "pineapple" || flavorDef.id === "coconut" || flavorDef.id === "starfruit" || flavorDef.id === "passion_fruit" || flavorDef.id === "kiwi" || flavorDef.id === "dragonfruit" || flavorDef.id === "guava" || flavorDef.id === "cherry" || flavorDef.id === "apricot" || flavorDef.id === "grapefruit" || flavorDef.id === "tangerine" || flavorDef.id === "wax_apple" || flavorDef.id === "sugarcane" || flavorDef.id === "lemon" || flavorDef.id === "lime" || baseDef.id === "soda" || baseDef.id === "berry_soda")) {
      score += 0.5;
      notes.push("夏日清爽");
    }
    if (season === "autumn" && (flavorDef.id === "honey" || flavorDef.id === "peach" || flavorDef.id === "tea_leaf" || flavorDef.id === "fennel" || flavorDef.id === "cardamom" || flavorDef.id === "ginger" || flavorDef.id === "calendula" || flavorDef.id === "chrysanthemum" || flavorDef.id === "hibiscus" || flavorDef.id === "plum" || flavorDef.id === "grape" || flavorDef.id === "mulberry" || flavorDef.id === "persimmon" || flavorDef.id === "fig" || flavorDef.id === "longan" || flavorDef.id === "hawthorn" || flavorDef.id === "pear" || flavorDef.id === "apricot")) {
      score += 0.5;
      notes.push("秋日温甜");
    }
    if (season === "winter" && (baseDef.id === "tea" || baseDef.id === "honey_water" || flavorDef.id === "tea_leaf" || flavorDef.id === "yuzu" || flavorDef.id === "ginger" || flavorDef.id === "honey" || flavorDef.id === "pine_needle" || flavorDef.id === "chrysanthemum" || flavorDef.id === "kumquat" || flavorDef.id === "jujube" || flavorDef.id === "cocoa" || flavorDef.id === "vanilla")) {
      score += 0.5;
      notes.push("冬日暖茶");
    }
    if (season === "dusk" && topDef && topDef.id !== "none") {
      score += 0.25;
      notes.push("黄昏点缀");
    }
    if (season === "dusk" && topDef && topDef.id === "camellia_top") {
      score += 0.25;
      notes.push("暮色山茶");
    }
    if (customer.wantTopping && topDef && topDef.id !== "none") {
      score += 1;
      notes.push("装饰很可爱");
    } else if (topDef && topDef.id !== "none") {
      score += 0.5;
    }

    // soft affinity: returning guest warmth (catalogs.affinity or customer.affinity)
    var aff = catalogs.affinity != null ? catalogs.affinity : (customer.affinity || 0);
    var affThreshold = ECONOMY.affinityBonusThreshold || 3;
    if (aff >= affThreshold) {
      score += 0.5;
      notes.push("老熟人默契");
    } else if (aff >= 1) {
      score += 0.25;
      notes.push("似曾相识");
    }

    // soft daily special (catalogs.dailySpecial.flavor)
    var special = catalogs.dailySpecial;
    if (special && special.flavor && flavorDef.id === special.flavor) {
      score += 0.5;
      notes.push("今日小特调");
    }

    score = Math.min(5, score);
    var coins = ECONOMY.serveBase + Math.floor(score * ECONOMY.serveScoreMul);
    if (aff >= affThreshold) {
      coins += 1;
    }
    if (special && special.flavor && flavorDef.id === special.flavor) {
      coins += 1;
    }
    var hearts = score >= 3 ? 1 : 0;
    return { score: score, notes: notes, coins: coins, hearts: hearts, affinity: aff, dailySpecial: !!(special && special.flavor && flavorDef.id === special.flavor) };
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

    catalogs = Object.assign({}, catalogs);
    if (!catalogs.dailySpecial) catalogs.dailySpecial = getDailySpecial(state);
    if (!catalogs.season) catalogs.season = state.season;
    var result = scoreDrink(customer, craft, catalogs);
    // Soft repeat-order memory for known guests
    var cname = customer && customer.name ? customer.name : null;
    var drinkKey = [craft.cup, craft.base, craft.flavor, craft.topping || "none"].join("-");
    var repeated = false;
    if (cname && state.lastCraftByGuest && state.lastCraftByGuest[cname] === drinkKey) {
      repeated = true;
      result.score = Math.min(5, (result.score || 0) + 0.25);
      result.notes = (result.notes || []).concat(["还是老样子"]);
      result.coins = (result.coins || 0) + 1;
      if (!state.stats) state.stats = {};
      state.stats.repeatOrders = (state.stats.repeatOrders || 0) + 1;
    }
    if (result.dailySpecial) {
      if (!state.stats) state.stats = {};
      state.stats.dailySpecialHits = (state.stats.dailySpecialHits || 0) + 1;
    }
    state.coins = (state.coins || 0) + result.coins;
    state.hearts = (state.hearts || 0) + result.hearts;
    if (!state.drinksMade) state.drinksMade = {};
    state.drinksMade[drinkKey] = (state.drinksMade[drinkKey] || 0) + 1;
    if (cname) {
      if (!state.lastCraftByGuest) state.lastCraftByGuest = {};
      state.lastCraftByGuest[cname] = drinkKey;
    }
    if (!state.stats) state.stats = {};
    state.stats.drinksServed = (state.stats.drinksServed || 0) + 1;
    // Soft first cups of the day: opening calm, not a pressure system
    if (!state.stats) state.stats = {};
    var dayK = dayKey(Date.now());
    if (state._serveDayKey !== dayK) {
      state._serveDayKey = dayK;
      state._servesToday = 0;
    }
    state._servesToday = (state._servesToday || 0) + 1;
    var openCalm = false;
    if (state._servesToday <= 3 && result.score >= 2) {
      openCalm = true;
      result.coins = (result.coins || 0) + 1;
      result.notes = (result.notes || []).concat(["开店清静"]);
      state.stats.openCalmServes = (state.stats.openCalmServes || 0) + 1;
    }
    if (result.score >= 3) {
      state.serveStreak = (state.serveStreak || 0) + 1;
      addTipJar(state, 1);
    } else {
      state.serveStreak = 0;
    }
    var streakBonus = 0;
    if (state.serveStreak >= 3) {
      streakBonus = 2;
      state.coins = (state.coins || 0) + streakBonus;
      result.notes = (result.notes || []).concat(["连胜小奖励"]);
      result.coins = (result.coins || 0) + streakBonus;
    }
    return {
      ok: true,
      result: result,
      drinkKey: drinkKey,
      serveStreak: state.serveStreak || 0,
      repeated: repeated,
      openCalm: openCalm,
    };
  }

  /** Apply last remembered craft for a guest name into craft object */
  
  
  /** Soft tip jar: spare coins become hearts when jar fills (no combat) */
  
  function pinBagItem(state, itemId) {
    itemId = String(itemId || "").trim();
    if (!itemId) return { ok: false, reason: "empty" };
    state.pinnedBagItem = itemId;
    appendJournal(state, "把「" + itemId + "」钉在竹篮最上面。");
    return { ok: true, itemId: itemId };
  }

  /** Soft sticky note for a guest name (shop memory, no combat) */
  function setGuestNote(state, guestName, note) {
    guestName = String(guestName || "").trim();
    note = String(note || "").trim().slice(0, 40);
    if (!guestName) return { ok: false, reason: "empty_name" };
    if (!note) return { ok: false, reason: "empty_note" };
    if (!state.guestNotes) state.guestNotes = {};
    state.guestNotes[guestName] = note;
    if (!state.stats) state.stats = {};
    state.stats.guestNotes = (state.stats.guestNotes || 0) + 1;
    appendJournal(state, "给客人「" + guestName + "」贴了便签。");
    return { ok: true, guestName: guestName, note: note };
  }

  /** Soft favorite plant id for sill preference (still-life, no combat) */
  function setFavoritePlant(state, plantId) {
    plantId = String(plantId || "").trim();
    if (!plantId) return { ok: false, reason: "empty" };
    state.favoritePlantId = plantId;
    if (!state.stats) state.stats = {};
    state.stats.plantFavs = (state.stats.plantFavs || 0) + 1;
    appendJournal(state, "把「" + plantId + "」记成窗台最想照料的那盆。");
    return { ok: true, plantId: plantId };
  }

  /** Soft favorite path theme for walk preference (collection, no combat) */
  function setFavoritePathTheme(state, themeId) {
    themeId = String(themeId || "").trim();
    if (!themeId) return { ok: false, reason: "empty" };
    state.favoritePathThemeId = themeId;
    if (!state.stats) state.stats = {};
    state.stats.pathFavs = (state.stats.pathFavs || 0) + 1;
    appendJournal(state, "把「" + themeId + "」记成最想再走一遍的小路。");
    return { ok: true, themeId: themeId };
  }

  /** Soft end-of-day shop close: journal a calm summary (no fail state) */
  function closeShopDay(state, now) {
    now = now || Date.now();
    var dk = dayKey(now);
    if (state._closedShopDay === dk) return { ok: false, reason: "already" };
    state._closedShopDay = dk;
    var served = state._servesToday || 0;
    var tip = (state.tipJar && state.tipJar.coins) || 0;
    var line =
      "收摊了。今天出杯 " +
      served +
      "，小费罐 " +
      tip +
      "/10。灯先留一盏。";
    appendJournal(state, line);
    if (!state.stats) state.stats = {};
    state.stats.shopCloses = (state.stats.shopCloses || 0) + 1;
    return { ok: true, line: line, served: served };
  }

  /** Soft pin a secret recipe id for one-tap craft recall (no combat) */
  function pinRecipe(state, recipeId) {
    recipeId = String(recipeId || "").trim();
    if (!recipeId) return { ok: false, reason: "empty" };
    state.pinnedRecipeId = recipeId;
    if (!state.stats) state.stats = {};
    state.stats.recipePins = (state.stats.recipePins || 0) + 1;
    appendJournal(state, "把配方「" + recipeId + "」钉在柜台边。");
    return { ok: true, recipeId: recipeId };
  }

  function getPinnedRecipe(state, recipes) {
    recipes = recipes || [];
    var id = state && state.pinnedRecipeId;
    if (!id) return { ok: false, reason: "none" };
    for (var i = 0; i < recipes.length; i++) {
      if (recipes[i] && (recipes[i].id === id || recipes[i].name === id)) {
        return { ok: true, recipe: recipes[i] };
      }
    }
    return { ok: false, reason: "missing" };
  }

  /** Soft shop board: top guests by affinity warmth (no ranking pressure) */
  function getTopGuests(state, limit) {
    limit = limit == null ? 3 : limit;
    var aff = (state && state.customerAffinity) || {};
    return Object.keys(aff)
      .map(function (name) {
        return { name: name, affinity: aff[name] || 0 };
      })
      .filter(function (g) {
        return g.affinity > 0;
      })
      .sort(function (a, b) {
        return b.affinity - a.affinity;
      })
      .slice(0, Math.max(0, limit));
  }

function addTipJar(state, coins) {
    coins = coins == null ? 1 : coins;
    if (!state.tipJar) state.tipJar = { coins: 0 };
    state.tipJar.coins = (state.tipJar.coins || 0) + coins;
    var hearts = 0;
    while (state.tipJar.coins >= 10) {
      state.tipJar.coins -= 10;
      state.hearts = (state.hearts || 0) + 1;
      hearts += 1;
    }
    if (hearts && !state.stats) state.stats = {};
    if (hearts) state.stats.tipJarHearts = (state.stats.tipJarHearts || 0) + hearts;
    return { ok: true, jar: state.tipJar.coins, hearts: hearts };
  }

function setFavoriteCup(state, cupId) {
    cupId = String(cupId || "").trim();
    if (!cupId) return { ok: false, reason: "empty" };
    state.favoriteCupId = cupId;
    appendJournal(state, "记下常用杯型：「" + cupId + "」。");
    return { ok: true, cupId: cupId };
  }

function recallGuestCraft(state, guestName) {
    if (!guestName || !state.lastCraftByGuest || !state.lastCraftByGuest[guestName]) {
      return { ok: false, reason: "none" };
    }
    var key = state.lastCraftByGuest[guestName];
    var parts = String(key).split("-");
    if (parts.length < 3) return { ok: false, reason: "bad" };
    return {
      ok: true,
      craft: {
        cup: parts[0],
        base: parts[1],
        flavor: parts[2],
        topping: parts[3] || "none",
      },
      drinkKey: key,
    };
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
      if (data.settings && data.settings.weatherFx === undefined) data.settings.weatherFx = true;
      if (data.settings && data.settings.ambience === undefined) data.settings.ambience = false;
      if (data.settings && data.settings.quietShop === undefined) data.settings.quietShop = false;
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

  /** Soft pin a favorite guest name — higher chance to reappear, no combat */
  function pinCustomer(state, name) {
    name = String(name || "").trim();
    if (!name) return { ok: false, reason: "empty" };
    state.pinnedCustomer = name;
    appendJournal(state, "记下常客：「" + name + "」。");
    return { ok: true, name: name };
  }

  function unpinCustomer(state) {
    var prev = state.pinnedCustomer || null;
    state.pinnedCustomer = null;
    return { ok: true, prev: prev };
  }

  /** Soft rearrange: swap two sill pots (still-life, no combat) */
  function swapPots(state, a, b) {
    if (!state.pots || !state.pots.length) return { ok: false, reason: "empty" };
    a = a | 0;
    b = b | 0;
    if (a === b) return { ok: false, reason: "same" };
    if (a < 0 || b < 0 || a >= state.pots.length || b >= state.pots.length) {
      return { ok: false, reason: "range" };
    }
    var tmp = state.pots[a];
    state.pots[a] = state.pots[b];
    state.pots[b] = tmp;
    if (!state.stats) state.stats = {};
    state.stats.potSwaps = (state.stats.potSwaps || 0) + 1;
    appendJournal(state, "把窗台花盆轻轻对调了一下。");
    return { ok: true, a: a, b: b };
  }

  /** Soft windowsill snapshot — still-life memory card, no combat */
  function snapshotPot(state, potIndex, plants) {
    plants = plants || DEFAULT_PLANTS;
    var pot = state.pots && state.pots[potIndex];
    if (!pot || !pot.plantId) return { ok: false, reason: "empty" };
    var def = plants[pot.plantId] || { name: pot.plantId, emoji: ["🪴"] };
    var stage = growthStage(pot, plants);
    var card = {
      at: Date.now(),
      day: state.day || 1,
      season: state.season || "dusk",
      plantId: pot.plantId,
      name: pot.nickname || def.name,
      emoji: (def.emoji && def.emoji[stage]) || "🪴",
      mood: Math.round(pot.mood || 0),
      note: pot.note || "",
    };
    if (!state.potSnaps) state.potSnaps = [];
    state.potSnaps.push(card);
    if (state.potSnaps.length > 12) state.potSnaps = state.potSnaps.slice(-12);
    if (!state.stats) state.stats = {};
    state.stats.potSnaps = (state.stats.potSnaps || 0) + 1;
    appendJournal(state, "给「" + card.name + "」拍了一张窗台速写。");
    return { ok: true, card: card };
  }

  function pickCustomerWithPin(state, customers, rng) {
    customers = customers || DEFAULT_CUSTOMERS;
    rng = rng || Math.random;
    var pin = state && state.pinnedCustomer;
    if (pin && rng() < 0.45) {
      for (var i = 0; i < customers.length; i++) {
        if (customers[i].name === pin) {
          return Object.assign({}, customers[i], { id: Date.now() + Math.floor(rng() * 1000), pinned: true });
        }
      }
    }
    return pickRandomCustomer(customers, rng);
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
    setPotNote: setPotNote,
    sitBench: sitBench,
    getWateringCan: getWateringCan,
    chargeWateringCan: chargeWateringCan,
    useWateringCan: useWateringCan,
    recipeMatchHint: recipeMatchHint,
    tend: tend,
    settleOfflineGrowth: settleOfflineGrowth,
    scoreDrink: scoreDrink,
    serveDrink: serveDrink,
    serialize: serialize,
    deserialize: deserialize,
    migrateState: migrateState,
    mergeCatalog: mergeCatalog,
    pickRandomCustomer: pickRandomCustomer,
    pinCustomer: pinCustomer,
    unpinCustomer: unpinCustomer,
    pickCustomerWithPin: pickCustomerWithPin,
    snapshotPot: snapshotPot,
    swapPots: swapPots,
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
    getDailySpecial: getDailySpecial,
    DAILY_SPECIAL_BY_SEASON: DAILY_SPECIAL_BY_SEASON,
    ensureDailyGoals: ensureDailyGoals,
    evaluateDailyGoals: evaluateDailyGoals,
    claimDailyReward: claimDailyReward,
    DAILY_GIFT_POOL: DAILY_GIFT_POOL,
    softNewDay: softNewDay,
    createDemoState: createDemoState,
    unlockPotSlot: unlockPotSlot,
    ECONOMY: ECONOMY,
    DEFAULT_PATH_THEMES: DEFAULT_PATH_THEMES,
    getPathTheme: getPathTheme,
    setPathTheme: setPathTheme,
    favoritePathTheme: favoritePathTheme,
    buildSpawnList: buildSpawnList,
    recallGuestCraft: recallGuestCraft,
    setFavoriteCup: setFavoriteCup,
    addTipJar: addTipJar,
    pinBagItem: pinBagItem,
    getTopGuests: getTopGuests,
    pinRecipe: pinRecipe,
    getPinnedRecipe: getPinnedRecipe,
    closeShopDay: closeShopDay,
    setFavoritePlant: setFavoritePlant,
    setFavoritePathTheme: setFavoritePathTheme,
    setGuestNote: setGuestNote,
    claimFirstWalkBonus: claimFirstWalkBonus,
    upgradeWateringCan: upgradeWateringCan,
    checkPathMilestones: checkPathMilestones,
    PATH_MILESTONES: PATH_MILESTONES,
  };
});
