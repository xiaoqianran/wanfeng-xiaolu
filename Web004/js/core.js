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
      { flavor: "cranberry", label: "蔓越莓" },
      { flavor: "elderberry", label: "接骨木果" },
      { flavor: "honeydew", label: "哈密瓜" },
      { flavor: "watermelon", label: "西瓜" },
      { flavor: "cantaloupe", label: "甜瓜" },
      { flavor: "papaya", label: "木瓜" },
      { flavor: "rambutan", label: "红毛丹" },
      { flavor: "jackfruit", label: "菠萝蜜" },
      { flavor: "oregano", label: "牛至" },
      { flavor: "chive", label: "细香葱" },
      { flavor: "parsley", label: "欧芹" },
      { flavor: "avocado", label: "牛油果" },
      { flavor: "chervil", label: "香芹" },
      { flavor: "sorrel", label: "酸模" },
      { flavor: "verbena", label: "马鞭草" },
      { flavor: "savory", label: "香薄荷" },
      { flavor: "celery_seed", label: "芹菜籽" },
      { flavor: "galangal", label: "高良姜" },
      { flavor: "pandan", label: "班兰" },
      { flavor: "kaffir_lime", label: "卡菲尔青柠" },
      { flavor: "juniper", label: "杜松子" },
      { flavor: "sumac", label: "盐肤木" },
      { flavor: "nigella", label: "黑种草" },
      { flavor: "mustard_seed", label: "芥末籽" },
      { flavor: "wasabi", label: "山葵" },
      { flavor: "dandelion", label: "蒲公英" },
      { flavor: "nettle", label: "荨麻" },
      { flavor: "borage", label: "琉璃苣" },
      { flavor: "hops", label: "啤酒花" },
      { flavor: "heather", label: "石楠" },
      { flavor: "arnica", label: "山金车" },
      { flavor: "echinacea", label: "紫锥菊" },
      { flavor: "feverfew", label: "小白菊" },
      { flavor: "lemon_verbena", label: "柠檬马鞭草" },
      { flavor: "mullein", label: "毛蕊花" },
      { flavor: "plantain_leaf", label: "车前草" },
      { flavor: "bee_balm", label: "美国薄荷" },
      { flavor: "marshmallow", label: "药蜀葵" },
      { flavor: "goldenrod", label: "一枝黄花" },
      { flavor: "red_clover", label: "红车轴草" },
      { flavor: "white_clover", label: "白车轴草" },
      { flavor: "catnip", label: "猫薄荷" },
      { flavor: "tansy", label: "艾菊" },
      { flavor: "agrimony", label: "龙芽草" },
      { flavor: "rue", label: "芸香" },
      { flavor: "costmary", label: "艾菊薄荷" },
      { flavor: "elecampane", label: "土木香" },
      { flavor: "meadow_clary", label: "草地鼠尾草" },
      { flavor: "soapwort", label: "皂草" },
      { flavor: "milfoil", label: "洋蓍草" },
      { flavor: "lady_mantle", label: "羽衣草" },
      { flavor: "speedwell", label: "婆婆纳" },
      { flavor: "stitchwort", label: "繁缕" },
      { flavor: "campion", label: "剪秋罗" },
      { flavor: "silverweed", label: "鹅绒委陵菜" },
      { flavor: "loosestrife", label: "千屈菜" },
      { flavor: "willowherb", label: "柳兰" },
      { flavor: "bedstraw", label: "猪殃殃" },
      { flavor: "cleavers", label: "拉拉藤" },
      { flavor: "bugle", label: "筋骨草" },
      { flavor: "primrose", label: "报春花" },
      { flavor: "cowslip", label: "黄花九轮草" },
      { flavor: "oxeye", label: "滨菊" },
      { flavor: "knapweed", label: "矢车菊" },
      { flavor: "scabious", label: "山萝卜" },
      { flavor: "nettle_seed", label: "荨麻籽" },
      { flavor: "rowan", label: "花楸果" },
      { flavor: "crabapple", label: "海棠果" },
      { flavor: "serviceberry", label: "唐棣" },
      { flavor: "elderflower_fresh", label: "接骨木花鲜" },
      { flavor: "meadowsweet_fresh", label: "绣线菊鲜" },
      { flavor: "wood_sorrel", label: "酢浆草" },
      { flavor: "wild_garlic", label: "熊葱" },
      { flavor: "ramsons", label: "熊蒜" },
      { flavor: "jack_by_hedge", label: "蒜芥" },
      { flavor: "hedge_mustard", label: "蒜芥菜" },
      { flavor: "watercress", label: "豆瓣菜" },
      { flavor: "brooklime", label: "有柄水苦荬" },
      { flavor: "cloudberry", label: "云莓" },
      { flavor: "lingonberry", label: "越橘" },
      { flavor: "bilberry", label: "欧洲越橘" },
      { flavor: "gooseberry", label: "醋栗" },
      { flavor: "currant_red", label: "红醋栗" },
      { flavor: "currant_black", label: "黑醋栗" },
      { flavor: "whitecurrant", label: "白醋栗" },
      { flavor: "sea_buckthorn", label: "沙棘" },
      { flavor: "damson", label: "西洋李" },
      { flavor: "greengage", label: "青李" },
      { flavor: "mirabelle", label: "黄香李" },
      { flavor: "saskatoon", label: "萨斯卡通莓" },
      { flavor: "chokeberry", label: "野樱莓" },
      { flavor: "yarrow_white", label: "白蓍" },
      { flavor: "achillea_pink", label: "粉蓍" },
      { flavor: "cornflower", label: "矢车菊蓝" },
      { flavor: "poppy_seed", label: "罂粟籽" },
      { flavor: "flax_flower", label: "亚麻花" },
      { flavor: "chia_seed", label: "奇亚籽" },
      { flavor: "sunflower_seed", label: "葵花籽" },
      { flavor: "fennel_pollen", label: "茴香花粉" },
      { flavor: "fennel_frond", label: "茴香叶" },
      { flavor: "dill_pollen", label: "莳萝花粉" },
      { flavor: "celery_leaf", label: "芹菜叶" },
      { flavor: "rooibos", label: "路易波士" },
      { flavor: "honeybush", label: "蜜树茶" },
      { flavor: "yerba_mate", label: "马黛茶" },
      { flavor: "guayusa", label: "瓜尤萨" },
      { flavor: "gardenia", label: "栀子花" },
      { flavor: "magnolia", label: "玉兰花" },
      { flavor: "frangipani", label: "鸡蛋花" },
      { flavor: "plumeria", label: "缅栀" },
      { flavor: "stephanotis", label: "马达加斯加茉莉" },
      { flavor: "garden_phlox", label: "福禄考" },
      { flavor: "osmanthus_fresh", label: "桂花鲜瓣" },
      { flavor: "galangal_fresh", label: "鲜高良姜" },
      { flavor: "ginger_flower", label: "姜花" },
      { flavor: "turmeric_fresh", label: "鲜姜黄" },
      { flavor: "cubeb", label: "毕澄茄" },
      { flavor: "makrut_leaf", label: "青柠叶" },
      { flavor: "curry_leaf", label: "咖喱叶" },
      { flavor: "holy_basil", label: "圣罗勒" },
      { flavor: "thai_basil", label: "泰罗勒" },
      { flavor: "lemon_basil", label: "柠檬罗勒" },

      { flavor: "rambutan_fresh", label: "鲜红毛丹" },
      { flavor: "lychee_fresh", label: "鲜荔枝" },
      { flavor: "mangosteen", label: "山竹" },
      { flavor: "durian_flower", label: "榴莲花" },
      { flavor: "tamarind", label: "罗望子" },
      { flavor: "calamansi", label: "四季桔" },
      { flavor: "fig_fresh", label: "无花果鲜" },
      { flavor: "pomegranate_seed", label: "石榴籽" },
      { flavor: "cactus_pear", label: "仙人掌果" },
      { flavor: "prickly_pear", label: "霸王树果" },
      { flavor: "sapodilla", label: "人心果" },
      { flavor: "soursop", label: "刺果番荔枝" },
      { flavor: "cherimoya", label: "毛叶番荔枝" },
      { flavor: "feijoa", label: "费约果" },
      { flavor: "loquat_fresh", label: "鲜枇杷" },
      { flavor: "jujube_fresh", label: "鲜枣" },
      { flavor: "mulberry_white", label: "白桑" },
      { flavor: "mulberry_black", label: "黑桑" },
      { flavor: "elderberry_fresh", label: "鲜接骨木果" },
      { flavor: "bergamot_fresh", label: "鲜佛手柑" },
      { flavor: "sudachi", label: "酢橘" },
      { flavor: "kabosu", label: "香酸柑" },
      { flavor: "amanatsu", label: "甘夏" },
      { flavor: "shiso_green", label: "青紫苏" },
      { flavor: "shiso_red", label: "赤紫苏" },
      { flavor: "mitsuba", label: "三叶" },
      { flavor: "myoga", label: "茗荷" },
      { flavor: "wasabi_leaf", label: "山葵叶" },
      { flavor: "sansho", label: "山椒" },
      { flavor: "kinome", label: "木芽" },
      { flavor: "gentian", label: "龙胆" },
      { flavor: "arnica_montana", label: "山地金车" },
      { flavor: "alpine_strawberry", label: "野草莓" },
      { flavor: "bilberry_leaf", label: "越橘叶" },
      { flavor: "spruce_tip", label: "云杉芽" },
      { flavor: "olive_leaf", label: "橄榄叶" },
      { flavor: "caper", label: "续随子花蕾" },
      { flavor: "zaatar", label: "扎塔香草" },
      { flavor: "sumac_berry", label: "盐肤木果" },
      { flavor: "orange_blossom", label: "橙花" },
      { flavor: "lavender_honey", label: "薰衣草蜜" },
      { flavor: "thyme_honey", label: "百里香蜜" },
      { flavor: "acacia_honey", label: "洋槐蜜" },
      { flavor: "manuka", label: "麦卢卡" },
      { flavor: "bee_pollen", label: "蜂花粉" },
      { flavor: "comb_honey", label: "巢蜜" },
      { flavor: "linden_honey", label: "椴树蜜" },
      { flavor: "heather_honey_wild", label: "石楠野蜜" },
      { flavor: "wildflower_honey", label: "野花蜜" },
      { flavor: "clover_honey", label: "车轴草蜜" },
      { flavor: "eucalyptus_honey", label: "桉树蜜" },
      { flavor: "mesquite", label: "牧豆" },
      { flavor: "lucuma", label: "蛋黄果粉" },
      { flavor: "camu_camu", label: "卡姆果" },
      { flavor: "acai", label: "阿萨伊" },
      { flavor: "maqui", label: "智利酒果" },
      { flavor: "goji_fresh", label: "鲜枸杞" },
      { flavor: "amla", label: "余甘子" },
      { flavor: "baobab", label: "猴面包果" },
      { flavor: "morinda", label: "诺丽" },
      { flavor: "noni", label: "海巴戟" },
      { flavor: "cupuacu", label: "古布阿苏" },
      { flavor: "matcha_ceremonial", label: "抹茶礼" },
      { flavor: "sencha", label: "煎茶" },
      { flavor: "gyokuro", label: "玉露" },
      { flavor: "bancha", label: "番茶" },
      { flavor: "kukicha", label: "茎茶" },
      { flavor: "mugicha", label: "麦茶" },
      { flavor: "barley_grass", label: "大麦若叶" },
      { flavor: "wheatgrass", label: "小麦草" },
      { flavor: "spirulina", label: "螺旋藻" },
      { flavor: "chlorella", label: "小球藻" },
      { flavor: "kelp", label: "海带" },
      { flavor: "nori", label: "紫菜" },
      { flavor: "hibiscus_fresh", label: "鲜洛神" },
      { flavor: "chrysanthemum_fresh", label: "鲜菊花" },
      { flavor: "peony", label: "牡丹" },
      { flavor: "lotus_leaf_fresh", label: "鲜荷叶" },
      { flavor: "osmanthus_sugar", label: "桂花糖" },
      { flavor: "orchid_petal", label: "兰花瓣" },
      { flavor: "bamboo_leaf_fresh", label: "鲜竹叶" },
      { flavor: "bamboo_shoot_fresh", label: "鲜竹笋" },
      { flavor: "safflower", label: "红花" },
      { flavor: "calendula_fresh", label: "鲜金盏" },
      { flavor: "pot_marigold", label: "金盏菊" },
      { flavor: "coreopsis", label: "金鸡菊" },
      { flavor: "cosmos", label: "波斯菊" },
      { flavor: "zinnia", label: "百日草" },
      { flavor: "dahlia", label: "大丽花" },
      { flavor: "gladiolus", label: "剑兰" },
      { flavor: "iris", label: "鸢尾" },
      { flavor: "tulip", label: "郁金香" },
      { flavor: "ranunculus", label: "花毛茛" },
      { flavor: "sweet_pea", label: "香豌豆" },
      { flavor: "nasturtium", label: "旱金莲" },
      { flavor: "morning_glory", label: "牵牛花" },
      { flavor: "clematis", label: "铁线莲" },
      { flavor: "wisteria_fresh", label: "鲜紫藤" },
      { flavor: "jasmine_sambac", label: "双瓣茉莉" },
      { flavor: "gardenia_tea", label: "栀子花茶" },

      { flavor: "boysenberry", label: "波森莓" },
      { flavor: "loganberry", label: "罗甘莓" },
      { flavor: "tayberry", label: "泰莓" },
      { flavor: "marionberry", label: "马里恩莓" },
      { flavor: "wineberry", label: "酒莓" },
      { flavor: "salmonberry", label: "鲑莓" },
      { flavor: "thimbleberry", label: "糙莓" },
      { flavor: "cloudberry_leaf", label: "云莓叶" },
      { flavor: "lovage_fresh", label: "鲜独活" },
      { flavor: "sweet_cicely", label: "欧洲没药" },
      { flavor: "ramsons_flower", label: "熊葱花" },
      { flavor: "sea_kale", label: "海甘蓝" },
      { flavor: "scurvygrass", label: "坏血病草" },
      { flavor: "marsh_samphire", label: "海蓬子" },
      { flavor: "agave_nectar", label: "龙舌兰蜜" },
      { flavor: "prickly_pear_pad", label: "仙人掌叶" },
      { flavor: "jojoba", label: "霍霍巴" },
      { flavor: "mesquite_pod", label: "牧豆荚" },
      { flavor: "creosote", label: "三齿拉瑞阿" },
      { flavor: "desert_sage", label: "沙漠鼠尾草" },
      { flavor: "yucca_flower", label: "丝兰花" },
      { flavor: "yerba_santa", label: "圣草" },
      { flavor: "cedron", label: "南美柠檬马鞭草" },
      { flavor: "muña", label: "木纳草" },
      { flavor: "coca_leaf_tea", label: "古柯叶茶" },
      { flavor: "guarana", label: "瓜拉纳" },
      { flavor: "stevia_leaf", label: "甜叶菊" },
      { flavor: "rooibos_green", label: "绿路易波士" },
      { flavor: "honeybush_fresh", label: "鲜蜜树" },
      { flavor: "buchu", label: "布枯" },
      { flavor: "baobab_leaf", label: "猴面包叶" },
      { flavor: "marula", label: "马鲁拉" },
      { flavor: "kinkeliba", label: "金凯利巴" },
      { flavor: "hibiscus_sab", label: "玫瑰茄" },
      { flavor: "pandan_fresh", label: "鲜班兰" },
      { flavor: "lemongrass_fresh", label: "鲜香茅" },
      { flavor: "galangal_leaf", label: "高良姜叶" },
      { flavor: "torch_ginger", label: "火炬姜" },
      { flavor: "butterfly_pea", label: "蝶豆花" },
      { flavor: "chrysanthemum_ind", label: "印尼菊" },
      { flavor: "tamarind_leaf", label: "罗望子叶" },
      { flavor: "coconut_flower", label: "椰花" },
      { flavor: "bergamot_leaf", label: "佛手柑叶" },
      { flavor: "neroli", label: "橙花精" },
      { flavor: "petitgrain", label: "苦橙叶" },
      { flavor: "immortelle", label: "蜡菊" },
      { flavor: "helichrysum", label: "蜡菊花" },
      { flavor: "cistus", label: "岩蔷薇" },
      { flavor: "spruce_beer", label: "云杉芽酒香" },
      { flavor: "fireweed", label: "火草" },
      { flavor: "fireweed_honey", label: "火草蜜" },
      { flavor: "crowberry", label: "岩高兰" },
      { flavor: "bearberry", label: "熊果" },
      { flavor: "labrador_violet", label: "拉布拉多堇" },
      { flavor: "matcha_salt", label: "抹茶盐" },
      { flavor: "sansho_leaf", label: "山椒叶" },
      { flavor: "shiso_flower", label: "紫苏穗" },
      { flavor: "sakura_leaf", label: "樱叶" },
      { flavor: "lavender_sugar", label: "薰衣草糖" },
      { flavor: "rose_water", label: "玫瑰水" },
      { flavor: "orange_flower_water", label: "橙花水" },
      { flavor: "almond_blossom", label: "杏花" },
      { flavor: "chestnut_flower", label: "板栗花" },
      { flavor: "maesil", label: "梅实" },
      { flavor: "persimmon_leaf", label: "柿叶" },
      { flavor: "pine_flower", label: "松花" },
      { flavor: "tulsi", label: "圣罗勒印" },
      { flavor: "neem_flower", label: "苦楝花" },
      { flavor: "curry_blossom", label: "咖喱花" },
      { flavor: "ajwain_leaf", label: "香旱芹叶" },
      { flavor: "fenugreek_leaf", label: "胡芦巴叶" },
      { flavor: "moringa", label: "辣木" },
      { flavor: "gotu_kola", label: "积雪草" },
      { flavor: "brahmi", label: "假马齿苋" },
      { flavor: "hibiscus_rosa", label: "朱槿" },
      { flavor: "allspice_berry", label: "多香果鲜" },
      { flavor: "annatto", label: "胭脂树" },
      { flavor: "epazote", label: "土荆芥" },
      { flavor: "papalo", label: "帕帕洛" },
      { flavor: "hoja_santa", label: "圣叶" },
      { flavor: "mexican_oregano", label: "墨西哥牛至" },
      { flavor: "chile_flower", label: "辣椒花" },
      { flavor: "noni_leaf", label: "诺丽叶" },
      { flavor: "ti_leaf", label: "铁树叶" },
      { flavor: "frangipani_tea", label: "鸡蛋花茶" },
      { flavor: "soursop_leaf", label: "刺果番荔枝叶" },
      { flavor: "guava_leaf", label: "番石榴叶" },
      { flavor: "passion_leaf", label: "百香果叶" },
      { flavor: "vanilla_orchid", label: "香荚兰" },
      { flavor: "longjing", label: "龙井" },
      { flavor: "biluochun", label: "碧螺春" },
      { flavor: "puer_raw", label: "生普" },
      { flavor: "white_peony_tea", label: "白牡丹茶" },
      { flavor: "valerian_flower", label: "缬草花" },
      { flavor: "hops_flower", label: "啤酒花花" },
      { flavor: "meadowsweet_flower", label: "绣线菊花" },
      { flavor: "yarrow_flower", label: "蓍草花" },
      { flavor: "nettle_seed_tea", label: "荨麻籽茶" },
      { flavor: "silver_birch", label: "银白桦" },
      { flavor: "copper_beech", label: "紫叶山毛榉" },
      { flavor: "hornbeam", label: "鹅耳枥" },
      { flavor: "field_maple", label: "田野槭" },
      { flavor: "wild_service", label: "野花楸" },
      { flavor: "guelder_rose", label: "欧洲荚蒾" },
      { flavor: "wayfaring", label: "绵毛荚蒾" },
      { flavor: "dogwood", label: "山茱萸" },
      { flavor: "spindle", label: "卫矛" },
      { flavor: "buckthorn", label: "鼠李" },
      { flavor: "privet", label: "女贞" },
      { flavor: "boxwood", label: "黄杨" },
      { flavor: "bluebell_fresh", label: "鲜风铃草" },
      { flavor: "primula_veris", label: "黄花九轮" },
      { flavor: "oxlip", label: "高报春" },
      { flavor: "cowslip_fresh", label: "鲜九轮草" },
      { flavor: "wood_anemone", label: "林银莲" },
      { flavor: "wood_sorrel_pink", label: "粉酢浆草" },
      { flavor: "greater_stitchwort", label: "大繁缕" },
      { flavor: "red_campion", label: "红剪秋罗" },
      { flavor: "white_campion", label: "白剪秋罗" },
      { flavor: "ragged_robin", label: "剪秋罗羽" },
      { flavor: "cuckooflower", label: "布谷鸟剪" },
      { flavor: "lady_smock", label: "水田芥花" },
      { flavor: "garlic_mustard_fl", label: "蒜芥花" },
      { flavor: "hedge_garlic_seed", label: "蒜芥籽" },
      { flavor: "jack_hedge_leaf", label: "篱蒜芥叶" },
      { flavor: "wild_mustard", label: "野芥" },
      { flavor: "meadow_buttercup", label: "草地毛茛" },
      { flavor: "creeping_buttercup", label: "匍匐毛茛" },
      { flavor: "lesser_celandine", label: "小白屈菜" },
      { flavor: "marsh_marigold", label: "驴蹄草" },
      { flavor: "globe_flower", label: "金莲花" },
      { flavor: "columbine", label: "耧斗菜" },
      { flavor: "monkshood", label: "乌头" },
      { flavor: "larkspur", label: "飞燕草" },
      { flavor: "delphinium", label: "翠雀" },
      { flavor: "pasque_flower", label: "白头翁" },
      { flavor: "anemone_coronaria", label: "冠状银莲" },
      { flavor: "hepatic", label: "獐耳细辛" },
      { flavor: "clematis_vitalba", label: "老铁线莲" },
      { flavor: "speedwell_germander", label: "石蚕婆婆纳" },
      { flavor: "germander", label: "石蚕" },
      { flavor: "betony_fresh", label: "鲜水苏" },
      { flavor: "selfheal_fresh", label: "鲜夏枯草" },
      { flavor: "woundwort", label: "水苏属" },
      { flavor: "hedge_woundwort", label: "篱水苏" },
      { flavor: "marsh_woundwort", label: "沼水苏" },
      { flavor: "motherwort_fresh", label: "鲜益母草" },
      { flavor: "scutellaria", label: "盔状黄芩" },
      { flavor: "bugle_fresh", label: "鲜筋骨草" },
      { flavor: "alehoof", label: "啤酒花草" },
      { flavor: "clary_sage", label: "南欧丹参" },
      { flavor: "pineapple_sage", label: "菠萝鼠尾草" },
      { flavor: "fruit_sage", label: "果香鼠尾草" },
      { flavor: "white_sage", label: "白鼠尾草" },
      { flavor: "russian_sage", label: "俄罗斯鼠尾草" },
      { flavor: "meadow_clary_fresh", label: "鲜草地鼠尾" },
      { flavor: "wood_sage", label: "林地鼠尾草" },
      { flavor: "jerusalem_sage", label: "耶路撒冷鼠尾" },
      { flavor: "catmint", label: "假荆芥" },
      { flavor: "catnip_fresh", label: "鲜猫薄荷" },
      { flavor: "hyssop_fresh", label: "鲜神香草" },
      { flavor: "anise_hyssop", label: "茴香藿香" },
      { flavor: "korean_mint", label: "藿香" },
      { flavor: "agastache", label: "藿香属" },
      { flavor: "lavender_spike", label: "穗花薰衣草" },
      { flavor: "lavender_sto", label: "法国薰衣草" },
      { flavor: "thyme_lemon", label: "柠檬百里香" },
      { flavor: "thyme_orange", label: "橙香百里香" },
      { flavor: "thyme_caraway", label: "葛缕子百里香" },
      { flavor: "thyme_woolly", label: "绵毛百里香" },
      { flavor: "creeping_thyme", label: "铺地百里香" },
      { flavor: "oregano_greek", label: "希腊牛至" },
      { flavor: "oregano_italian", label: "意大利牛至" },
      { flavor: "marjoram_sweet", label: "甜马郁兰" },
      { flavor: "savory_summer", label: "夏香薄荷" },
      { flavor: "basil_genovese", label: "热那亚罗勒" },
      { flavor: "basil_cinnamon", label: "肉桂罗勒" },
      { flavor: "basil_purple", label: "紫罗勒" },
      { flavor: "basil_lettuce", label: "生菜罗勒" },
      { flavor: "mint_peppermint", label: "胡椒薄荷" },
      { flavor: "mint_spearmint", label: "留兰香" },
      { flavor: "mint_chocolate", label: "巧克力薄荷" },
      { flavor: "mint_apple", label: "苹果薄荷" },
      { flavor: "mint_ginger", label: "姜味薄荷" },
      { flavor: "mint_orange", label: "橙香薄荷" },
      { flavor: "mint_lavender", label: "薰衣草薄荷" },
      { flavor: "mint_bergamot", label: "佛手柑薄荷" },
      { flavor: "mint_corsican", label: "科西嘉薄荷" },
      { flavor: "mint_water", label: "水薄荷" },
      { flavor: "melissa_fresh", label: "鲜香蜂草" },
      { flavor: "lemon_balm_var", label: "柠檬香蜂" },
      { flavor: "bee_balm_pink", label: "粉美国薄荷" },
      { flavor: "bee_balm_purple", label: "紫美国薄荷" },
      { flavor: "oregano_hop", label: "啤酒花牛至" },
      { flavor: "dittany", label: "白鲜" },
      { flavor: "dictamnus", label: "白藓花" },
      { flavor: "burning_bush", label: "燃烧灌木" },
      { flavor: "chamomile_roman", label: "罗马洋甘菊" },
      { flavor: "chamomile_german", label: "德国洋甘菊" },
      { flavor: "feverfew_fresh", label: "鲜小白菊" },
      { flavor: "tansy_fresh", label: "鲜艾菊" },
      { flavor: "yarrow_pink", label: "粉蓍草" },
      { flavor: "yarrow_gold", label: "金蓍草" },
      { flavor: "arnica_fresh", label: "鲜山金车" },
      { flavor: "calendula_offic", label: "药用金盏" },
      { flavor: "pot_marigold_dbl", label: "重瓣金盏" },
      { flavor: "tagetes", label: "万寿菊" },
      { flavor: "marigold_french", label: "法国万寿" },
      { flavor: "signet_marigold", label: "香叶万寿" },
      { flavor: "costmary_fresh", label: "鲜艾菊薄荷" },
      { flavor: "elecampane_fresh", label: "鲜土木香" },
      { flavor: "inula", label: "旋覆花" },
      { flavor: "eupatorium", label: "佩兰" },
      { flavor: "echinacea_purp", label: "紫松果菊" },
      { flavor: "echinacea_ang", label: "狭叶紫锥" },
      { flavor: "echinacea_pall", label: "淡紫锥菊" },
      { flavor: "rudbeckia", label: "金光菊" },
      { flavor: "black_eyed_susan", label: "黑心金光" },
      { flavor: "coneflower_yellow", label: "黄松果菊" },
      { flavor: "helenium", label: "堆心菊" },
      { flavor: "helenium_autumn", label: "秋堆心菊" },
      { flavor: "coreopsis_lance", label: "剑叶金鸡" },
      { flavor: "coreopsis_tick", label: "两色金鸡" },
      { flavor: "gaillardia", label: "天人菊" },
      { flavor: "gaillardia_fan", label: "扇形天人" },
      { flavor: "ratibida", label: "草原松果" },
      { flavor: "silphium", label: "杯叶菊" },
      { flavor: "cup_plant", label: "杯托菊" },
      { flavor: "compass_plant", label: "罗盘草" },
      { flavor: "aster_novae", label: "新英格兰紫菀" },
      { flavor: "aster_novi", label: "纽约紫菀" },
      { flavor: "michaelmas", label: "米迦勒紫菀" },
      { flavor: "goldenrod_fresh", label: "鲜一枝黄" },
      { flavor: "solidago", label: "加拿大一枝黄" },
      { flavor: "boltonia", label: "千星菊" },
      { flavor: "erigeron", label: "飞蓬" },
      { flavor: "fleabane", label: "春飞蓬" },
      { flavor: "daisy_oxeye", label: "滨菊鲜" },
      { flavor: "daisy_english", label: "英国雏菊" },
      { flavor: "daisy_shasta", label: "滨菊大" },
      { flavor: "chrysanthemum_ind_fresh", label: "鲜印菊" },
      { flavor: "chrysanthemum_mor", label: "杭白菊" },
      { flavor: "chrysanthemum_yej", label: "野菊" },
      { flavor: "tanacetum", label: "菊蒿" },
      { flavor: "pyrethrum", label: "除虫菊" },
      { flavor: "sunflower_dwarf", label: "矮向日葵" },
      { flavor: "sunflower_multi", label: "多头向日葵" },
      { flavor: "sunflower_red", label: "红向日葵" },
      { flavor: "sunchoke_flower", label: "菊芋花" },
      { flavor: "dahlia_cactus", label: "仙人掌大丽" },
      { flavor: "dahlia_pompom", label: "绒球大丽" },
      { flavor: "zinnia_dwarf", label: "矮百日草" },
      { flavor: "zinnia_cactus", label: "仙人掌百日" },
      { flavor: "cosmos_sulph", label: "硫华菊" },
      { flavor: "cosmos_choco", label: "巧克力波斯" },
      { flavor: "tithonia", label: "肿柄菊" },
      { flavor: "mexican_sunflower", label: "墨西哥向日葵" },
      { flavor: "heliopsis", label: "假向日葵" },
      { flavor: "inula_helenium", label: "土木香欧" },
      { flavor: "verbena_bon", label: "柳叶马鞭草" },
      { flavor: "verbena_rig", label: "硬枝马鞭草" },
      { flavor: "lantana", label: "马缨丹" },
      { flavor: "lantana_white", label: "白马缨丹" },
      { flavor: "phlox_pan", label: "锥花福禄考" },
      { flavor: "phlox_sub", label: "针叶福禄考" },
      { flavor: "phlox_drum", label: "小福禄考" },
      { flavor: "dianthus_chin", label: "石竹" },
      { flavor: "dianthus_barb", label: "须苞石竹" },
      { flavor: "sweet_william", label: "美国石竹" },
      { flavor: "carnation", label: "康乃馨" },
      { flavor: "pinks", label: "常夏石竹" },
      { flavor: "gypsophila", label: "满天星" },
      { flavor: "baby_breath", label: "霞草" },
      { flavor: "saponaria", label: "肥皂草" },
      { flavor: "soapwort_fresh", label: "鲜皂草" },
      { flavor: "campanula", label: "风铃草属" },
      { flavor: "campanula_med", label: "地中海风铃" },
      { flavor: "lobelia", label: "半边莲" },
      { flavor: "lobelia_card", label: "红半边莲" },
      { flavor: "penstemon", label: "钓钟柳" },
      { flavor: "penstemon_fox", label: "狐尾钓钟柳" },
      { flavor: "digitalis", label: "毛地黄" },
      { flavor: "digitalis_lutea", label: "黄毛地黄" },
      { flavor: "snapdragon", label: "金鱼草" },
      { flavor: "snapdragon_dwarf", label: "矮金鱼草" },
      { flavor: "antirrhinum", label: "龙口花" },
      { flavor: "linaria", label: "柳穿鱼" },
      { flavor: "toadflax", label: "普通柳穿" },
      { flavor: "verbascum_chaix", label: "网脉毛蕊" },
      { flavor: "mullein_white", label: "白毛蕊" },
      { flavor: "mimulus", label: "沟酸浆" },
      { flavor: "monkeyflower", label: "猴面花" },
      { flavor: "collinsia", label: "可林草" },
      { flavor: "castilleja", label: "火焰草" },
      { flavor: "paintbrush", label: "印地安画笔" },
      { flavor: "orthocarpus", label: "直果草" },
      { flavor: "pedicularis", label: "马先蒿" },
      { flavor: "lousewort", label: "虱草" },
      { flavor: "euphrasia", label: "小米草" },
      { flavor: "eyebright", label: "光明草" },
      { flavor: "rhinanthus", label: "鼻花" },
      { flavor: "yellow_rattle", label: "黄响铃" },
      { flavor: "melampyrum", label: "山罗花" },
      { flavor: "cow_wheat", label: "牛麦" },
      { flavor: "bartisia", label: "巴氏草" },
      { flavor: "cattleya", label: "卡特兰" },
      { flavor: "dendrobium", label: "石斛" },
      { flavor: "phalaenopsis", label: "蝴蝶兰" },
      { flavor: "oncidium", label: "文心兰" },
      { flavor: "vanda", label: "万代兰" },
      { flavor: "paphiopedilum", label: "兜兰" },
      { flavor: "miltonia", label: "米尔顿兰" },
      { flavor: "odontoglossum", label: "齿瓣兰" },
      { flavor: "brassia", label: "蜘蛛兰" },
      { flavor: "epidendrum", label: "树兰" },
      { flavor: "ludisia", label: "血叶兰" },
      { flavor: "anoectochilus", label: "金线莲" },
      { flavor: "gastrodia", label: "天麻" },
      { flavor: "bletilla", label: "白及" },
      { flavor: "calanthe", label: "虾脊兰" },
      { flavor: "boston_fern", label: "波士顿蕨" },
      { flavor: "bird_nest_fern", label: "鸟巢蕨" },
      { flavor: "staghorn", label: "鹿角蕨" },
      { flavor: "holly_fern", label: "刺叶蕨" },
      { flavor: "autumn_fern", label: "秋色蕨" },
      { flavor: "ostrich_fern", label: "鸵鸟蕨" },
      { flavor: "cinnamon_fern", label: "肉桂蕨" },
      { flavor: "bracken_tip", label: "蕨菜尖" },
      { flavor: "adder_tongue", label: "瓶尔小草" },
      { flavor: "miscanthus", label: "芒草" },
      { flavor: "pampas", label: "蒲苇" },
      { flavor: "fountain_grass", label: "狼尾草" },
      { flavor: "japanese_forest", label: "日本森林草" },
      { flavor: "carex_morrow", label: "阔叶苔草" },
      { flavor: "scirpus", label: "藨草" },
      { flavor: "typha_pollen", label: "香蒲花粉" },
      { flavor: "phragmites", label: "芦苇" },
      { flavor: "bamboo_black", label: "紫竹" },
      { flavor: "bamboo_golden", label: "金镶玉竹" },
      { flavor: "echeveria", label: "石莲花" },
      { flavor: "sedum_morgan", label: "玉树景天" },
      { flavor: "sedum_spect", label: "八宝景天" },
      { flavor: "sempervivum", label: "长生草" },
      { flavor: "aeonium", label: "莲花掌" },
      { flavor: "crassula", label: "青锁龙" },
      { flavor: "kalanchoe", label: "长寿花" },
      { flavor: "haworthia", label: "十二卷" },
      { flavor: "agave_flower", label: "龙舌兰花" },
      { flavor: "yucca_filament", label: "丝兰丝" },
      { flavor: "sansevieria", label: "虎尾兰" },
      { flavor: "jade_plant", label: "翡翠木" },
      { flavor: "panda_plant", label: "熊猫草" },
      { flavor: "boysen_leaf", label: "波森莓叶" },
      { flavor: "logan_leaf", label: "罗甘莓叶" },
      { flavor: "tay_leaf", label: "泰莓叶" },
      { flavor: "marion_leaf", label: "马里恩莓叶" },
      { flavor: "wine_leaf", label: "酒莓叶" },
      { flavor: "salmon_leaf", label: "鲑莓叶" },
      { flavor: "thimble_leaf", label: "糙莓叶" },
      { flavor: "cloud_flower", label: "云莓花" },
      { flavor: "huckleberry", label: "美洲越橘" },
      { flavor: "huckle_leaf", label: "美洲越橘叶" },
      { flavor: "salal", label: "萨拉尔" },
      { flavor: "salal_leaf", label: "萨拉尔叶" },
      { flavor: "oregon_grape", label: "俄勒冈葡萄" },
      { flavor: "mahonia", label: "十大功劳" },
      { flavor: "barberry_red", label: "红小檗" },
      { flavor: "barberry_leaf", label: "小檗叶" },
      { flavor: "currant_flower", label: "醋栗花" },
      { flavor: "goose_flower", label: "鹅莓花" },
      { flavor: "josta", label: "约斯塔莓" },
      { flavor: "worcesterberry", label: "伍斯特莓" },
      { flavor: "juneberry", label: "六月莓" },
      { flavor: "shadbush", label: "唐棣花" },
      { flavor: "chokecherry", label: "稠李" },
      { flavor: "bird_cherry", label: "鸟樱" },
      { flavor: "pin_cherry", label: "细樱" },
      { flavor: "sand_cherry", label: "沙樱" },
      { flavor: "nanking_cherry", label: "毛樱桃" },
      { flavor: "cornelian", label: "欧亚山茱萸" },
      { flavor: "honeyberry", label: "蜜莓" },
      { flavor: "hascap", label: "哈斯卡普" },
      { flavor: "clematis_arm", label: "绣球铁线莲" },
      { flavor: "clematis_mon", label: "绣球铁线" },
      { flavor: "clematis_tang", label: "甘青铁线莲" },
      { flavor: "clematis_ori", label: "东方铁线莲" },
      { flavor: "akibia", label: "木通" },
      { flavor: "akebia_flower", label: "木通花" },
      { flavor: "kiwi_hardy", label: "软枣猕猴桃" },
      { flavor: "kiwi_flower", label: "猕猴桃花" },
      { flavor: "actinidia", label: "羊桃" },
      { flavor: "silver_vine", label: "葛枣猕猴桃" },
      { flavor: "hop_fresh", label: "鲜啤酒花" },
      { flavor: "hop_leaf", label: "啤酒花叶" },
      { flavor: "humulus", label: "葎草" },
      { flavor: "japanese_hop", label: "日本葎草" },
      { flavor: "grape_leaf_fresh", label: "鲜葡萄叶" },
      { flavor: "vine_tendril", label: "葡萄卷须" },
      { flavor: "muscadine", label: "圆叶葡萄" },
      { flavor: "scuppernong", label: "白圆叶葡萄" },
      { flavor: "passiflora_inc", label: "西番莲" },
      { flavor: "passiflora_cae", label: "天蓝西番莲" },
      { flavor: "passiflora_ed", label: "百香花" },
      { flavor: "maypop", label: "五月瓜" },
      { flavor: "morning_glory_red", label: "红牵牛" },
      { flavor: "morning_glory_blue", label: "蓝牵牛" },
      { flavor: "ipomoea_bat", label: "红薯花" },
      { flavor: "moonvine", label: "月藤" },
      { flavor: "cypress_vine", label: "茑萝" },
      { flavor: "cardinal_climber", label: "红雀藤" },
      { flavor: "black_eyed_susan_vine", label: "黑眼苏珊藤" },
      { flavor: "thunbergia", label: "山牵牛" },
      { flavor: "sweet_potato_leaf", label: "红薯叶" },
      { flavor: "dioscorea", label: "薯蓣" },
      { flavor: "luffa_flower", label: "丝瓜花" },
      { flavor: "luffa_leaf", label: "丝瓜叶" },
      { flavor: "bitter_melon_fl", label: "苦瓜花" },
      { flavor: "bitter_melon_leaf", label: "苦瓜叶" },
      { flavor: "squash_blossom", label: "南瓜花" },
      { flavor: "zucchini_flower", label: "西葫芦花" },
      { flavor: "cucumber_flower", label: "黄瓜花" },
      { flavor: "melon_flower", label: "甜瓜花" },
      { flavor: "okra_flower", label: "秋葵花" },
      { flavor: "okra_leaf", label: "秋葵叶" },
      { flavor: "hibiscus_escul", label: "黄秋葵" },
      { flavor: "roselle_fresh", label: "鲜玫瑰茄" },
      { flavor: "cotton_flower", label: "棉花" },
      { flavor: "cotton_leaf", label: "棉叶" },
      { flavor: "kenaf", label: "红麻" },
      { flavor: "jute_leaf", label: "黄麻叶" },
      { flavor: "flax_blue", label: "蓝亚麻" },
      { flavor: "flax_red", label: "红亚麻" },
      { flavor: "hemp_flower", label: "火麻花" },
      { flavor: "nettle_fresh", label: "鲜荨麻" },
      { flavor: "dead_nettle", label: "野芝麻" },
      { flavor: "purple_dead_nettle", label: "紫野芝麻" },
      { flavor: "henbit", label: "宝盖草" },
      { flavor: "lamium", label: "银边野芝麻" },
      { flavor: "galeopsis", label: "鼬瓣花" },
      { flavor: "stachys_byz", label: "绵毛水苏" },
      { flavor: "alpine_rosemary", label: "高山迷迭香" },
      { flavor: "alpine_marjoram", label: "高山马郁兰" },
      { flavor: "alpine_chive", label: "高山香葱" },
      { flavor: "alpine_cilantro", label: "高山香菜" },
      { flavor: "alpine_dill", label: "高山莳萝" },
      { flavor: "alpine_lovage", label: "高山独活" },
      { flavor: "alpine_sorrel", label: "高山酸模" },
      { flavor: "coastal_thyme", label: "海岸百里香" },
      { flavor: "coastal_sage", label: "海岸鼠尾草" },
      { flavor: "coastal_oregano", label: "海岸牛至" },
      { flavor: "coastal_basil", label: "海岸罗勒" },
      { flavor: "coastal_mint", label: "海岸薄荷" },
      { flavor: "coastal_lavender", label: "海岸薰衣草" },
      { flavor: "coastal_marjoram", label: "海岸马郁兰" },
      { flavor: "coastal_tarragon", label: "海岸龙蒿" },
      { flavor: "coastal_chive", label: "海岸香葱" },
      { flavor: "coastal_parsley", label: "海岸欧芹" },
      { flavor: "coastal_cilantro", label: "海岸香菜" },
      { flavor: "coastal_dill", label: "海岸莳萝" },
      { flavor: "coastal_sorrel", label: "海岸酸模" },
      { flavor: "meadow_thyme", label: "草甸百里香" },
      { flavor: "meadow_sage", label: "草甸鼠尾草" },
      { flavor: "meadow_oregano", label: "草甸牛至" },
      { flavor: "meadow_basil", label: "草甸罗勒" },
      { flavor: "meadow_mint", label: "草甸薄荷" },
      { flavor: "meadow_lavender", label: "草甸薰衣草" },
      { flavor: "meadow_marjoram", label: "草甸马郁兰" },
      { flavor: "meadow_tarragon", label: "草甸龙蒿" },
      { flavor: "meadow_chive", label: "草甸香葱" },
      { flavor: "meadow_parsley", label: "草甸欧芹" },
      { flavor: "meadow_cilantro", label: "草甸香菜" },
      { flavor: "meadow_dill", label: "草甸莳萝" },
      { flavor: "meadow_sorrel", label: "草甸酸模" },
      { flavor: "woodland_thyme", label: "林地百里香" },
      { flavor: "woodland_sage", label: "林间鼠尾草" },
      { flavor: "woodland_oregano", label: "林地牛至" },
      { flavor: "woodland_basil", label: "林地罗勒" },
      { flavor: "woodland_mint", label: "林地薄荷" },
      { flavor: "woodland_lavender", label: "林地薰衣草" },
      { flavor: "woodland_marjoram", label: "林地马郁兰" },
      { flavor: "woodland_tarragon", label: "林地龙蒿" },
      { flavor: "woodland_chive", label: "林地香葱" },
      { flavor: "woodland_parsley", label: "林地欧芹" },
      { flavor: "woodland_cilantro", label: "林地香菜" },
      { flavor: "woodland_dill", label: "林地莳萝" },
      { flavor: "woodland_fennel", label: "林地茴香" },
      { flavor: "woodland_lovage", label: "林地独活" },
      { flavor: "woodland_sorrel", label: "林地酸模" },
      { flavor: "garden_thyme", label: "园栽百里香" },
      { flavor: "garden_sage", label: "园栽鼠尾草" },
      { flavor: "garden_oregano", label: "园栽牛至" },
      { flavor: "garden_basil", label: "园栽罗勒" },
      { flavor: "garden_mint", label: "园栽薄荷" },
      { flavor: "garden_lavender", label: "园栽薰衣草" },
      { flavor: "garden_marjoram", label: "园栽马郁兰" },
      { flavor: "garden_tarragon", label: "园栽龙蒿" },
      { flavor: "garden_chive", label: "园栽香葱" },
      { flavor: "garden_parsley", label: "园栽欧芹" },
      { flavor: "garden_cilantro", label: "园栽香菜" },
      { flavor: "garden_dill", label: "园栽莳萝" },
      { flavor: "garden_fennel", label: "园栽茴香" },
      { flavor: "garden_lovage", label: "园栽独活" },
      { flavor: "garden_sorrel", label: "园栽酸模" },
      { flavor: "wild_thyme", label: "野生百里香" },
      { flavor: "wild_sage", label: "野生鼠尾草" },
      { flavor: "wild_oregano", label: "野生牛至" },
      { flavor: "wild_basil", label: "野生罗勒" },
      { flavor: "wild_mint", label: "野生薄荷" },
      { flavor: "wild_lavender", label: "野生薰衣草" },
      { flavor: "wild_rosemary", label: "野生迷迭香" },
      { flavor: "wild_marjoram", label: "野生马郁兰" },
      { flavor: "wild_tarragon", label: "野生龙蒿" },
      { flavor: "wild_chive", label: "野生香葱" },
      { flavor: "wild_parsley", label: "野生欧芹" },
      { flavor: "wild_cilantro", label: "野生香菜" },
      { flavor: "wild_dill", label: "野生莳萝" },
      { flavor: "wild_fennel", label: "野生茴香" },
      { flavor: "wild_lovage", label: "野生独活" },
      { flavor: "wild_sorrel", label: "野生酸模" },
      { flavor: "dwarf_thyme", label: "矮生百里香" },
      { flavor: "dwarf_sage", label: "矮生鼠尾草" },
      { flavor: "dwarf_oregano", label: "矮生牛至" },
      { flavor: "dwarf_basil", label: "矮生罗勒" },
      { flavor: "dwarf_mint", label: "矮生薄荷" },
      { flavor: "dwarf_lavender", label: "矮生薰衣草" },
      { flavor: "dwarf_marjoram", label: "矮生马郁兰" },
      { flavor: "dwarf_chive", label: "矮生香葱" },
      { flavor: "dwarf_parsley", label: "矮生欧芹" },
      { flavor: "dwarf_cilantro", label: "矮生香菜" },
      { flavor: "dwarf_dill", label: "矮生莳萝" },
      { flavor: "dwarf_fennel", label: "矮生茴香" },
      { flavor: "dwarf_lovage", label: "矮生独活" },
      { flavor: "dwarf_sorrel", label: "矮生酸模" },
      { flavor: "giant_oregano", label: "巨生牛至" },
      { flavor: "giant_basil", label: "巨生罗勒" },
      { flavor: "giant_marjoram", label: "巨生马郁兰" },
      { flavor: "giant_tarragon", label: "巨生龙蒿" },
      { flavor: "giant_chive", label: "巨生香葱" },
      { flavor: "giant_parsley", label: "巨生欧芹" },
      { flavor: "giant_cilantro", label: "巨生香菜" },
      { flavor: "giant_dill", label: "巨生莳萝" },
      { flavor: "giant_lovage", label: "巨生独活" },
      { flavor: "giant_sorrel", label: "巨生酸模" },
      { flavor: "variegated_thyme", label: "斑叶百里香" },
      { flavor: "variegated_oregano", label: "斑叶牛至" },
      { flavor: "variegated_basil", label: "斑叶罗勒" },
      { flavor: "variegated_mint", label: "斑叶薄荷" },
      { flavor: "variegated_lavender", label: "斑叶薰衣草" },
      { flavor: "variegated_marjoram", label: "斑叶马郁兰" },
      { flavor: "variegated_chive", label: "斑叶香葱" },
      { flavor: "variegated_parsley", label: "斑叶欧芹" },
      { flavor: "variegated_cilantro", label: "斑叶香菜" },
      { flavor: "variegated_dill", label: "斑叶莳萝" },
      { flavor: "variegated_sorrel", label: "斑叶酸模" },
      { flavor: "golden_thyme", label: "金叶百里香" },
      { flavor: "golden_oregano", label: "金叶牛至" },
      { flavor: "golden_basil", label: "金叶罗勒" },
      { flavor: "golden_mint", label: "金叶薄荷" },
      { flavor: "golden_lavender", label: "金叶薰衣草" },
      { flavor: "golden_marjoram", label: "金叶马郁兰" },
      { flavor: "golden_chive", label: "金叶香葱" },
      { flavor: "golden_parsley", label: "金叶欧芹" },
      { flavor: "golden_cilantro", label: "金叶香菜" },
      { flavor: "golden_dill", label: "金叶莳萝" },
      { flavor: "golden_sorrel", label: "金叶酸模" },
      { flavor: "silver_thyme", label: "银叶百里香" },
      { flavor: "silver_oregano", label: "银叶牛至" },
      { flavor: "silver_basil", label: "银叶罗勒" },
      { flavor: "silver_mint", label: "银叶薄荷" },
      { flavor: "silver_lavender", label: "银叶薰衣草" },
      { flavor: "silver_marjoram", label: "银叶马郁兰" },
      { flavor: "silver_chive", label: "银叶香葱" },
      { flavor: "silver_parsley", label: "银叶欧芹" },
      { flavor: "silver_cilantro", label: "银叶香菜" },
      { flavor: "silver_dill", label: "银叶莳萝" },
      { flavor: "silver_sorrel", label: "银叶酸模" },
      { flavor: "purple_thyme", label: "紫叶百里香" },
      { flavor: "purple_oregano", label: "紫叶牛至" },
      { flavor: "purple_basil", label: "紫叶罗勒" },
      { flavor: "purple_mint", label: "紫叶薄荷" },
      { flavor: "purple_lavender", label: "紫叶薰衣草" },
      { flavor: "purple_marjoram", label: "紫叶马郁兰" },
      { flavor: "purple_chive", label: "紫叶香葱" },
      { flavor: "purple_parsley", label: "紫叶欧芹" },
      { flavor: "purple_cilantro", label: "紫叶香菜" },
      { flavor: "purple_dill", label: "紫叶莳萝" },
      { flavor: "purple_sorrel", label: "紫叶酸模" },
      { flavor: "red_thyme", label: "红叶百里香" },
      { flavor: "red_oregano", label: "红叶牛至" },
      { flavor: "red_basil", label: "红叶罗勒" },
      { flavor: "red_mint", label: "红叶薄荷" },
      { flavor: "red_lavender", label: "红叶薰衣草" },
      { flavor: "red_marjoram", label: "红叶马郁兰" },
      { flavor: "red_chive", label: "红叶香葱" },
      { flavor: "red_parsley", label: "红叶欧芹" },
      { flavor: "red_cilantro", label: "红叶香菜" },
      { flavor: "red_dill", label: "红叶莳萝" },
      { flavor: "red_sorrel", label: "红叶酸模" },
      { flavor: "white_thyme", label: "白花百里香" },
      { flavor: "white_oregano", label: "白花牛至" },
      { flavor: "white_basil", label: "白花罗勒" },
      { flavor: "white_mint", label: "白花薄荷" },
      { flavor: "white_lavender", label: "白花薰衣草" },
      { flavor: "white_marjoram", label: "白花马郁兰" },
      { flavor: "white_chive", label: "白花香葱" },
      { flavor: "white_parsley", label: "白花欧芹" },
      { flavor: "white_cilantro", label: "白花香菜" },
      { flavor: "white_dill", label: "白花莳萝" },
      { flavor: "white_sorrel", label: "白花酸模" },
      { flavor: "pink_thyme", label: "粉花百里香" },
      { flavor: "pink_oregano", label: "粉花牛至" },
      { flavor: "pink_basil", label: "粉花罗勒" },
      { flavor: "pink_mint", label: "粉花薄荷" },
      { flavor: "pink_lavender", label: "粉花薰衣草" },
      { flavor: "pink_marjoram", label: "粉花马郁兰" },
      { flavor: "pink_chive", label: "粉花香葱" },
      { flavor: "pink_parsley", label: "粉花欧芹" },
      { flavor: "pink_cilantro", label: "粉花香菜" },
      { flavor: "pink_dill", label: "粉花莳萝" },
      { flavor: "pink_sorrel", label: "粉花酸模" },
      { flavor: "blue_thyme", label: "蓝花百里香" },
      { flavor: "blue_oregano", label: "蓝花牛至" },
      { flavor: "blue_basil", label: "蓝花罗勒" },
      { flavor: "blue_mint", label: "蓝花薄荷" },
      { flavor: "blue_lavender", label: "蓝花薰衣草" },
      { flavor: "blue_marjoram", label: "蓝花马郁兰" },
      { flavor: "blue_chive", label: "蓝花香葱" },
      { flavor: "blue_parsley", label: "蓝花欧芹" },
      { flavor: "blue_cilantro", label: "蓝花香菜" },
      { flavor: "blue_dill", label: "蓝花莳萝" },
      { flavor: "blue_sorrel", label: "蓝花酸模" },
      { flavor: "yellow_thyme", label: "黄花百里香" },
      { flavor: "yellow_oregano", label: "黄花牛至" },
      { flavor: "yellow_basil", label: "黄花罗勒" },
      { flavor: "yellow_mint", label: "黄花薄荷" },
      { flavor: "yellow_lavender", label: "黄花薰衣草" },
      { flavor: "yellow_marjoram", label: "黄花马郁兰" },
      { flavor: "yellow_chive", label: "黄花香葱" },
      { flavor: "yellow_parsley", label: "黄花欧芹" },
      { flavor: "yellow_cilantro", label: "黄花香菜" },
      { flavor: "yellow_dill", label: "黄花莳萝" },
      { flavor: "yellow_sorrel", label: "黄花酸模" },
      { flavor: "orange_thyme", label: "橙花百里香" },
      { flavor: "orange_oregano", label: "橙花牛至" },
      { flavor: "orange_basil", label: "橙花罗勒" },
      { flavor: "orange_mint", label: "橙花薄荷" },
      { flavor: "orange_lavender", label: "橙花薰衣草" },
      { flavor: "orange_marjoram", label: "橙花马郁兰" },
      { flavor: "orange_chive", label: "橙花香葱" },
      { flavor: "orange_parsley", label: "橙花欧芹" },
      { flavor: "orange_cilantro", label: "橙花香菜" },
      { flavor: "orange_dill", label: "橙花莳萝" },
      { flavor: "orange_sorrel", label: "橙花酸模" },
      { flavor: "fragrant_thyme", label: "香型百里香" },
      { flavor: "fragrant_sage", label: "香型鼠尾草" },
      { flavor: "fragrant_oregano", label: "香型牛至" },
      { flavor: "fragrant_basil", label: "香型罗勒" },
      { flavor: "fragrant_mint", label: "香型薄荷" },
      { flavor: "fragrant_lavender", label: "香型薰衣草" },
      { flavor: "fragrant_rosemary", label: "香型迷迭香" },
      { flavor: "fragrant_marjoram", label: "香型马郁兰" },
      { flavor: "fragrant_tarragon", label: "香型龙蒿" },
      { flavor: "fragrant_chive", label: "香型香葱" },
      { flavor: "fragrant_parsley", label: "香型欧芹" },
      { flavor: "fragrant_cilantro", label: "香型香菜" },
      { flavor: "fragrant_dill", label: "香型莳萝" },
      { flavor: "fragrant_fennel", label: "香型茴香" },
      { flavor: "fragrant_lovage", label: "香型独活" },
      { flavor: "fragrant_sorrel", label: "香型酸模" },
      { flavor: "edible_thyme", label: "可食百里香" },
      { flavor: "edible_sage", label: "可食鼠尾草" },
      { flavor: "edible_oregano", label: "可食牛至" },
      { flavor: "edible_basil", label: "可食罗勒" },
      { flavor: "edible_mint", label: "可食薄荷" },
      { flavor: "edible_lavender", label: "可食薰衣草" },
      { flavor: "edible_rosemary", label: "可食迷迭香" },
      { flavor: "edible_marjoram", label: "可食马郁兰" },
      { flavor: "edible_tarragon", label: "可食龙蒿" },
      { flavor: "edible_chive", label: "可食香葱" },
      { flavor: "edible_parsley", label: "可食欧芹" },
      { flavor: "edible_cilantro", label: "可食香菜" },
      { flavor: "edible_dill", label: "可食莳萝" },
      { flavor: "edible_fennel", label: "可食茴香" },
      { flavor: "edible_lovage", label: "可食独活" },
      { flavor: "edible_sorrel", label: "可食酸模" },
      { flavor: "apple_blossom", label: "苹果花" },
      { flavor: "pear_blossom", label: "梨花" },
      { flavor: "peach_blossom", label: "桃花" },
      { flavor: "plum_blossom_fresh", label: "鲜梅花" },
      { flavor: "cherry_blossom", label: "樱花" },
      { flavor: "apricot_blossom", label: "杏花鲜" },
      { flavor: "quince_blossom", label: "榅桲花" },
      { flavor: "medlar_blossom", label: "欧楂花" },
      { flavor: "mulberry_flower", label: "桑花" },
      { flavor: "fig_leaf", label: "无花果叶" },
      { flavor: "pomegranate_flower", label: "石榴花" },
      { flavor: "persimmon_flower", label: "柿花" },
      { flavor: "walnut_flower", label: "核桃花" },
      { flavor: "hazel_catkin", label: "榛花序" },
      { flavor: "chestnut_catkin", label: "板栗花序" },
      { flavor: "almond_fresh_bl", label: "鲜杏花" },
      { flavor: "pistachio_flower", label: "开心果花" },
      { flavor: "pecan_flower", label: "山核桃花" },
      { flavor: "macadamia_flower", label: "夏威夷果花" },
      { flavor: "cashew_flower", label: "腰果花" },
      { flavor: "brazil_nut_fl", label: "巴西坚果花" },
      { flavor: "coconut_inflo", label: "椰子花序" },
      { flavor: "date_flower", label: "椰枣花" },
      { flavor: "olive_flower", label: "橄榄花" },
      { flavor: "avocado_flower", label: "牛油果花" },
      { flavor: "mango_flower", label: "芒果花" },
      { flavor: "lychee_flower", label: "荔枝花" },
      { flavor: "longan_flower", label: "龙眼花" },
      { flavor: "rambutan_flower", label: "红毛丹花" },
      { flavor: "mangosteen_flower", label: "山竹花" },
      { flavor: "guava_flower", label: "番石榴花" },
      { flavor: "papaya_flower", label: "木瓜花" },
      { flavor: "pineapple_flower", label: "菠萝花" },
      { flavor: "banana_flower", label: "香蕉花" },
      { flavor: "plantain_flower", label: "大蕉花" },
      { flavor: "breadfruit_fl", label: "面包果花" },
      { flavor: "jackfruit_fl", label: "波罗蜜花" },
      { flavor: "durian_fresh_fl", label: "鲜榴莲花" },
      { flavor: "soursop_fl", label: "刺番荔枝花" },
      { flavor: "cherimoya_fl", label: "毛番荔枝花" },
      { flavor: "custard_apple_fl", label: "番荔枝花" },
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
      { flavor: "almond", label: "杏仁" },
      { flavor: "hazelnut", label: "榛子" },
      { flavor: "maple_syrup", label: "枫糖" },
      { flavor: "sesame", label: "芝麻" },
      { flavor: "saffron", label: "藏红花" },
      { flavor: "walnut", label: "核桃" },
      { flavor: "pistachio", label: "开心果" },
      { flavor: "chestnut", label: "板栗" },
      { flavor: "cinnamon", label: "肉桂" },
      { flavor: "clove", label: "丁香" },
      { flavor: "star_anise", label: "八角" },
      { flavor: "nutmeg", label: "肉豆蔻" },
      { flavor: "goji", label: "枸杞" },
      { flavor: "bay_leaf", label: "月桂" },
      { flavor: "tarragon", label: "龙蒿" },
      { flavor: "date_fruit", label: "椰枣" },
      { flavor: "hyssop", label: "神香草" },
      { flavor: "lovage", label: "独活" },
      { flavor: "anise_seed", label: "茴香籽" },
      { flavor: "turmeric", label: "姜黄" },
      { flavor: "allspice", label: "多香果" },
      { flavor: "mace", label: "肉豆蔻衣" },
      { flavor: "caraway", label: "葛缕子" },
      { flavor: "cumin", label: "孜然" },
      { flavor: "fenugreek", label: "胡芦巴" },
      { flavor: "ajwain", label: "香旱芹" },
      { flavor: "myrtle", label: "香桃木" },
      { flavor: "chicory", label: "菊苣" },
      { flavor: "yarrow", label: "蓍草" },
      { flavor: "nettle", label: "荨麻" },
      { flavor: "meadowsweet", label: "绣线菊" },
      { flavor: "woodruff", label: "车叶草" },
      { flavor: "valerian", label: "缬草" },
      { flavor: "angelica", label: "当归" },
      { flavor: "comfrey", label: "聚合草" },
      { flavor: "selfheal", label: "夏枯草" },
      { flavor: "skullcap", label: "黄芩" },
      { flavor: "linden", label: "椴树花" },
      { flavor: "horehound", label: "夏至草" },
      { flavor: "motherwort", label: "益母草" },
      { flavor: "betony", label: "水苏" },
      { flavor: "solomon_seal", label: "黄精" },
      { flavor: "wormwood", label: "苦艾" },
      { flavor: "valerian_root", label: "缬草根" },
      { flavor: "avens", label: "水杨梅" },
      { flavor: "tormentil", label: "直立委陵菜" },
      { flavor: "figwort", label: "玄参" },
      { flavor: "ground_ivy", label: "连钱草" },
      { flavor: "self_heal_spike", label: "夏枯穗" },
      { flavor: "teasel", label: "川续断" },
      { flavor: "burdock", label: "牛蒡" },
      { flavor: "hawthorn_berry", label: "山楂果" },
      { flavor: "rosehip", label: "玫瑰果" },
      { flavor: "sloe", label: "黑刺李" },
      { flavor: "wintercress", label: "山芥" },

      { flavor: "medlar", label: "欧楂" },
      { flavor: "quince", label: "榅桲" },
      { flavor: "aronia", label: "黑果腺肋花楸" },
      { flavor: "flax_seed", label: "亚麻籽" },
      { flavor: "hemp_seed", label: "火麻仁" },
      { flavor: "pumpkin_seed", label: "南瓜籽" },
      { flavor: "sesame_black", label: "黑芝麻" },
      { flavor: "sesame_white", label: "白芝麻" },
      { flavor: "lapacho", label: "拉帕乔" },
      { flavor: "sassafras", label: "檫树" },
      { flavor: "birch_bark", label: "白桦皮" },
      { flavor: "pine_resin", label: "松脂" },
      { flavor: "tuberose", label: "晚香玉" },
      { flavor: "cardamom_green", label: "绿豆蔻" },
      { flavor: "cardamom_black", label: "黑豆蔻" },
      { flavor: "long_pepper", label: "荜拨" },
      { flavor: "grains_of_paradise", label: "天堂椒" },
      { flavor: "cinnamon_leaf", label: "肉桂叶" },
      { flavor: "clove_bud", label: "丁香芽" },
      { flavor: "allspice_leaf", label: "多香果叶" },
      { flavor: "reindeer_moss", label: "驯鹿苔" },
      { flavor: "iceland_moss", label: "冰岛苔" },
      { flavor: "oak_moss", label: "橡苔" },
      { flavor: "usnea", label: "松萝" },
      { flavor: "chaga", label: "白桦茸" },
      { flavor: "reishi", label: "灵芝" },
      { flavor: "lion_mane", label: "猴头菇" },
      { flavor: "maitake", label: "舞茸" },
      { flavor: "jackfruit_seed", label: "波罗蜜籽" },

      { flavor: "rowan_jelly", label: "花楸果冻" },
      { flavor: "quince_paste", label: "榅桲膏" },
      { flavor: "yuzu_fresh", label: "鲜柚子" },
      { flavor: "ponkan", label: "椪柑" },
      { flavor: "dekopon", label: "不知火" },
      { flavor: "hassaku", label: "八朔" },
      { flavor: "yuzu_kosho", label: "柚子胡椒" },
      { flavor: "edelweiss", label: "雪绒花" },
      { flavor: "juniper_berry", label: "杜松果" },
      { flavor: "fir_needle", label: "冷杉针" },
      { flavor: "myrtle_berry", label: "香桃木果" },
      { flavor: "mastic", label: "乳香黄连木" },
      { flavor: "saffron_crocus", label: "番红花" },
      { flavor: "buckwheat_honey", label: "荞麦蜜" },
      { flavor: "chestnut_honey", label: "板栗蜜" },
      { flavor: "propolis", label: "蜂胶" },
      { flavor: "royal_jelly", label: "蜂王浆" },
      { flavor: "mead_herb", label: "蜜酒香草" },
      { flavor: "cacao_nibs", label: "可可碎" },
      { flavor: "cacao_husk", label: "可可壳" },
      { flavor: "carob", label: "角豆" },
      { flavor: "maca", label: "玛卡" },
      { flavor: "schisandra", label: "五味子" },
      { flavor: "hojicha", label: "焙茶" },
      { flavor: "genmaicha", label: "玄米茶" },
      { flavor: "sobacha", label: "荞麦茶" },
      { flavor: "job_tears", label: "薏米茶" },
      { flavor: "rose_hip_tea", label: "玫瑰果茶" },
      { flavor: "camellia_fresh", label: "鲜山茶" },
      { flavor: "lotus_seed_fresh", label: "鲜莲子" },
      { flavor: "plum_blossom", label: "梅花" },
      { flavor: "wintersweet", label: "蜡梅" },
      { flavor: "ginkgo_leaf_fresh", label: "鲜银杏叶" },
      { flavor: "ginkgo_nut_fresh", label: "鲜白果" },
      { flavor: "osmanthus_wine", label: "桂花酿" },

      { flavor: "crocus", label: "番红花球" },
      { flavor: "snowdrop", label: "雪花莲" },
      { flavor: "crocus_yellow", label: "黄番红" },
      { flavor: "hyacinth", label: "风信子" },
      { flavor: "daffodil", label: "水仙" },
      { flavor: "moonflower", label: "月光花" },
      { flavor: "magnolia_bark", label: "厚朴" },
      { flavor: "eucommia", label: "杜仲" },
      { flavor: "astragalus", label: "黄芪" },
      { flavor: "codonopsis", label: "党参" },
      { flavor: "rehmannia", label: "地黄" },
      { flavor: "polygonatum", label: "玉竹" },
      { flavor: "ophiopogon", label: "麦冬" },

      { flavor: "angelica_arch", label: "欧当归" },
      { flavor: "wood_avense", label: "水杨梅根" },
      { flavor: "ephedra", label: "麻黄" },
      { flavor: "boldo", label: "波尔多叶" },
      { flavor: "cupuacu_butter", label: "古布阿苏脂" },
      { flavor: "sutherlandia", label: "南非政府草" },

      { flavor: "citron", label: "香橼" },
      { flavor: "bergamot_peel", label: "佛手柑皮" },
      { flavor: "labrador_tea", label: "拉布拉多茶" },
      { flavor: "arctic_willow", label: "北极柳" },
      { flavor: "kinako", label: "黄豆粉" },
      { flavor: "kuromitsu", label: "黑蜜" },
      { flavor: "yuzu_peel", label: "柚子皮" },
      { flavor: "ume_blossom", label: "梅花花" },
      { flavor: "vanilla_bean", label: "香草荚" },
      { flavor: "tonka_bean", label: "零陵香豆" },
      { flavor: "hazelnut_flower", label: "榛花" },
      { flavor: "omija", label: "五味子韩" },
      { flavor: "yuja", label: "柚子茶果" },
      { flavor: "ssanghwa", label: "双和茶料" },
      { flavor: "jujube_tea", label: "大枣茶" },
      { flavor: "ginger_tea_kr", label: "韩式姜茶" },


      { flavor: "kava", label: "卡瓦" },
      { flavor: "tieguanyin", label: "铁观音" },
      { flavor: "dahongpao", label: "大红袍" },
      { flavor: "puer_ripe", label: "熟普" },
      { flavor: "shoumei", label: "寿眉" },
      { flavor: "burdock_root", label: "牛蒡根" },
      { flavor: "dandelion_root", label: "蒲公英根" },
      { flavor: "chicory_root", label: "菊苣根" },

      { flavor: "holly_leaf", label: "冬青叶" },
      { flavor: "ivy_berry", label: "常春藤果" },
      { flavor: "mistletoe", label: "槲寄生" },
      { flavor: "yew_berry", label: "红豆杉" },



      { flavor: "aconite", label: "附子花" },
      { flavor: "helleborus", label: "铁筷子" },
      { flavor: "christmas_rose", label: "圣诞玫瑰" },
      { flavor: "black_horehound", label: "黑夏至草" },
      { flavor: "white_horehound", label: "白夏至草" },
      { flavor: "skullcap_fresh", label: "鲜黄芩" },
      { flavor: "baikal_skullcap", label: "黄芩根" },
      { flavor: "ground_ivy_fresh", label: "鲜连钱草" },



      { flavor: "savory_winter", label: "冬香薄荷" },








      { flavor: "jerusalem_artichoke", label: "菊芋" },
      { flavor: "topinambur", label: "洋姜" },




      { flavor: "figwort_fresh", label: "鲜玄参" },
      { flavor: "scrophularia", label: "玄参属" },

      { flavor: "cymbidium", label: "建兰" },

      { flavor: "maidenhair", label: "铁线蕨" },
      { flavor: "sword_fern", label: "剑叶蕨" },
      { flavor: "japanese_painted", label: "日本彩叶蕨" },
      { flavor: "royal_fern", label: "王蕨" },
      { flavor: "sensitive_fern", label: "敏感蕨" },
      { flavor: "fiddlehead", label: "拳卷蕨" },
      { flavor: "moonwort", label: "阴地蕨" },
      { flavor: "blue_fescue", label: "蓝羊茅" },
      { flavor: "hakonechloa", label: "箱根草" },
      { flavor: "carex_buch", label: "红铜苔草" },
      { flavor: "juncus", label: "灯心草" },
      { flavor: "bamboo_moso", label: "毛竹" },
      { flavor: "arrow_bamboo", label: "矢竹" },

      { flavor: "aloe_vera_fl", label: "芦荟花" },
      { flavor: "string_pearls", label: "珍珠吊兰" },
      { flavor: "burros_tail", label: "驴尾草" },



      { flavor: "honeysuckle_blue", label: "蓝果忍冬" },
      { flavor: "arctic_berry", label: "北极蜜莓" },
      { flavor: "schisandra_chin", label: "北五味子" },
      { flavor: "schisandra_leaf", label: "五味子叶" },



      { flavor: "yam_leaf", label: "山药叶" },
      { flavor: "chinese_yam", label: "淮山" },

      { flavor: "linseed_oil", label: "亚麻仁油" },
      { flavor: "nettle_root", label: "荨麻根" },
      { flavor: "alpine_thyme", label: "高山百里香" },
      { flavor: "alpine_sage", label: "高山鼠尾草" },
      { flavor: "alpine_oregano", label: "高山牛至" },
      { flavor: "alpine_basil", label: "高山罗勒" },
      { flavor: "alpine_mint", label: "高山薄荷" },
      { flavor: "alpine_lavender", label: "高山薰衣草" },
      { flavor: "alpine_tarragon", label: "高山龙蒿" },
      { flavor: "alpine_parsley", label: "高山欧芹" },
      { flavor: "alpine_fennel", label: "高山茴香" },
      { flavor: "coastal_rosemary", label: "海岸迷迭香" },
      { flavor: "coastal_fennel", label: "海岸茴香" },
      { flavor: "coastal_lovage", label: "海岸独活" },
      { flavor: "meadow_rosemary", label: "草甸迷迭香" },
      { flavor: "meadow_fennel", label: "草甸茴香" },
      { flavor: "meadow_lovage", label: "草甸独活" },
      { flavor: "woodland_rosemary", label: "林地迷迭香" },

      { flavor: "garden_rosemary", label: "园栽迷迭香" },



      { flavor: "dwarf_rosemary", label: "矮生迷迭香" },
      { flavor: "dwarf_tarragon", label: "矮生龙蒿" },
      { flavor: "giant_thyme", label: "巨生百里香" },
      { flavor: "giant_sage", label: "巨生鼠尾草" },
      { flavor: "giant_mint", label: "巨生薄荷" },
      { flavor: "giant_lavender", label: "巨生薰衣草" },
      { flavor: "giant_rosemary", label: "巨生迷迭香" },
      { flavor: "giant_fennel", label: "巨生茴香" },
      { flavor: "variegated_sage", label: "斑叶鼠尾草" },
      { flavor: "variegated_rosemary", label: "斑叶迷迭香" },
      { flavor: "variegated_tarragon", label: "斑叶龙蒿" },
      { flavor: "variegated_fennel", label: "斑叶茴香" },
      { flavor: "variegated_lovage", label: "斑叶独活" },
      { flavor: "golden_sage", label: "金叶鼠尾草" },
      { flavor: "golden_rosemary", label: "金叶迷迭香" },
      { flavor: "golden_tarragon", label: "金叶龙蒿" },
      { flavor: "golden_fennel", label: "金叶茴香" },
      { flavor: "golden_lovage", label: "金叶独活" },
      { flavor: "silver_sage", label: "银叶鼠尾草" },
      { flavor: "silver_rosemary", label: "银叶迷迭香" },
      { flavor: "silver_tarragon", label: "银叶龙蒿" },
      { flavor: "silver_fennel", label: "银叶茴香" },
      { flavor: "silver_lovage", label: "银叶独活" },
      { flavor: "purple_sage", label: "紫叶鼠尾草" },
      { flavor: "purple_rosemary", label: "紫叶迷迭香" },
      { flavor: "purple_tarragon", label: "紫叶龙蒿" },
      { flavor: "purple_fennel", label: "紫叶茴香" },
      { flavor: "purple_lovage", label: "紫叶独活" },
      { flavor: "red_sage", label: "红叶鼠尾草" },
      { flavor: "red_rosemary", label: "红叶迷迭香" },
      { flavor: "red_tarragon", label: "红叶龙蒿" },
      { flavor: "red_fennel", label: "红叶茴香" },
      { flavor: "red_lovage", label: "红叶独活" },
      { flavor: "white_rosemary", label: "白花迷迭香" },
      { flavor: "white_tarragon", label: "白花龙蒿" },
      { flavor: "white_fennel", label: "白花茴香" },
      { flavor: "white_lovage", label: "白花独活" },
      { flavor: "pink_sage", label: "粉花鼠尾草" },
      { flavor: "pink_rosemary", label: "粉花迷迭香" },
      { flavor: "pink_tarragon", label: "粉花龙蒿" },
      { flavor: "pink_fennel", label: "粉花茴香" },
      { flavor: "pink_lovage", label: "粉花独活" },
      { flavor: "blue_sage", label: "蓝花鼠尾草" },
      { flavor: "blue_rosemary", label: "蓝花迷迭香" },
      { flavor: "blue_tarragon", label: "蓝花龙蒿" },
      { flavor: "blue_fennel", label: "蓝花茴香" },
      { flavor: "blue_lovage", label: "蓝花独活" },
      { flavor: "yellow_sage", label: "黄花鼠尾草" },
      { flavor: "yellow_rosemary", label: "黄花迷迭香" },
      { flavor: "yellow_tarragon", label: "黄花龙蒿" },
      { flavor: "yellow_fennel", label: "黄花茴香" },
      { flavor: "yellow_lovage", label: "黄花独活" },
      { flavor: "orange_sage", label: "橙花鼠尾草" },
      { flavor: "orange_rosemary", label: "橙花迷迭香" },
      { flavor: "orange_tarragon", label: "橙花龙蒿" },
      { flavor: "orange_fennel", label: "橙花茴香" },
      { flavor: "orange_lovage", label: "橙花独活" },









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
    { id: "almond_sill", name: "杏仁窗台", desc: "发现杏仁", check: function (s) {
      return !!(s.discovered && s.discovered.almond);
    } },
    { id: "almond_walker", name: "杏仁树径旅人", desc: "走过杏仁树径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.almond_grove);
    } },
    { id: "hazelnut_sill", name: "榛子窗台", desc: "发现榛子", check: function (s) {
      return !!(s.discovered && s.discovered.hazelnut);
    } },
    { id: "hazelnut_walker", name: "榛子径旅人", desc: "走过榛子短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hazel_path);
    } },
    { id: "maple_sill", name: "枫糖窗台", desc: "发现枫糖", check: function (s) {
      return !!(s.discovered && s.discovered.maple_syrup);
    } },
    { id: "maple_walker", name: "枫糖径旅人", desc: "走过枫糖慢径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.maple_sugar_path);
    } },
    { id: "sesame_sill", name: "芝麻窗台", desc: "发现芝麻", check: function (s) {
      return !!(s.discovered && s.discovered.sesame);
    } },
    { id: "sesame_walker", name: "芝麻田旅人", desc: "走过芝麻田径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sesame_field);
    } },
    { id: "saffron_sill", name: "藏红花窗台", desc: "发现藏红花", check: function (s) {
      return !!(s.discovered && s.discovered.saffron);
    } },
    { id: "saffron_walker", name: "藏红花露台旅人", desc: "走过藏红花露台", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.saffron_terrace);
    } },
    { id: "walnut_sill", name: "核桃窗台", desc: "发现核桃", check: function (s) {
      return !!(s.discovered && s.discovered.walnut);
    } },
    { id: "walnut_walker", name: "核桃树径旅人", desc: "走过核桃树径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.walnut_path);
    } },
    { id: "pistachio_sill", name: "开心果窗台", desc: "发现开心果", check: function (s) {
      return !!(s.discovered && s.discovered.pistachio);
    } },
    { id: "pistachio_walker", name: "开心果径旅人", desc: "走过开心果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pistachio_lane);
    } },
    { id: "chestnut_sill", name: "板栗窗台", desc: "发现板栗", check: function (s) {
      return !!(s.discovered && s.discovered.chestnut);
    } },
    { id: "chestnut_walker", name: "板栗林旅人", desc: "走过板栗林径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chestnut_grove);
    } },
    { id: "cinnamon_sill", name: "肉桂窗台", desc: "发现肉桂", check: function (s) {
      return !!(s.discovered && s.discovered.cinnamon);
    } },
    { id: "cinnamon_walker", name: "肉桂径旅人", desc: "走过肉桂短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cinnamon_path);
    } },
    { id: "clove_sill", name: "丁香窗台", desc: "发现丁香香料", check: function (s) {
      return !!(s.discovered && s.discovered.clove);
    } },
    { id: "clove_walker", name: "丁香院旅人", desc: "走过丁香香院", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.clove_courtyard);
    } },
    { id: "cranberry_sill", name: "蔓越莓窗台", desc: "发现蔓越莓", check: function (s) {
      return !!(s.discovered && s.discovered.cranberry);
    } },
    { id: "cranberry_walker", name: "蔓越莓浅滩旅人", desc: "走过蔓越莓浅滩", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cranberry_bog);
    } },
    { id: "elderberry_sill", name: "接骨木果窗台", desc: "发现接骨木果", check: function (s) {
      return !!(s.discovered && s.discovered.elderberry);
    } },
    { id: "elderberry_walker", name: "接骨木果径旅人", desc: "走过接骨木果径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.elder_lane);
    } },
    { id: "anise_sill", name: "八角窗台", desc: "发现八角", check: function (s) {
      return !!(s.discovered && s.discovered.star_anise);
    } },
    { id: "anise_walker", name: "八角径旅人", desc: "走过八角短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.anise_path);
    } },
    { id: "nutmeg_sill", name: "肉豆蔻窗台", desc: "发现肉豆蔻", check: function (s) {
      return !!(s.discovered && s.discovered.nutmeg);
    } },
    { id: "nutmeg_walker", name: "肉豆蔻径旅人", desc: "走过肉豆蔻小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.nutmeg_lane);
    } },
    { id: "honeydew_sill", name: "哈密瓜窗台", desc: "发现哈密瓜", check: function (s) {
      return !!(s.discovered && s.discovered.honeydew);
    } },
    { id: "honeydew_walker", name: "哈密瓜田旅人", desc: "走过哈密瓜田径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.honeydew_field);
    } },
    { id: "watermelon_sill", name: "西瓜窗台", desc: "发现西瓜", check: function (s) {
      return !!(s.discovered && s.discovered.watermelon);
    } },
    { id: "watermelon_walker", name: "西瓜畦旅人", desc: "走过西瓜畦径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.watermelon_patch);
    } },
    { id: "cantaloupe_sill", name: "甜瓜窗台", desc: "发现甜瓜", check: function (s) {
      return !!(s.discovered && s.discovered.cantaloupe);
    } },
    { id: "cantaloupe_walker", name: "甜瓜径旅人", desc: "走过甜瓜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cantaloupe_lane);
    } },
    { id: "papaya_sill", name: "木瓜窗台", desc: "发现木瓜", check: function (s) {
      return !!(s.discovered && s.discovered.papaya);
    } },
    { id: "papaya_walker", name: "木瓜树径旅人", desc: "走过木瓜树径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.papaya_grove);
    } },
    { id: "rambutan_sill", name: "红毛丹窗台", desc: "发现红毛丹", check: function (s) {
      return !!(s.discovered && s.discovered.rambutan);
    } },
    { id: "rambutan_walker", name: "红毛丹径旅人", desc: "走过红毛丹小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rambutan_lane);
    } },
    { id: "jackfruit_sill", name: "菠萝蜜窗台", desc: "发现菠萝蜜", check: function (s) {
      return !!(s.discovered && s.discovered.jackfruit);
    } },
    { id: "jackfruit_walker", name: "菠萝蜜树径旅人", desc: "走过菠萝蜜树径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.jackfruit_grove);
    } },
    { id: "goji_sill", name: "枸杞窗台", desc: "发现枸杞", check: function (s) {
      return !!(s.discovered && s.discovered.goji);
    } },
    { id: "goji_walker", name: "枸杞径旅人", desc: "走过枸杞短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.goji_path);
    } },
    { id: "bay_sill", name: "月桂窗台", desc: "发现月桂", check: function (s) {
      return !!(s.discovered && s.discovered.bay_leaf);
    } },
    { id: "bay_walker", name: "月桂院旅人", desc: "走过月桂小院", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bay_courtyard);
    } },
    { id: "oregano_sill", name: "牛至窗台", desc: "发现牛至", check: function (s) {
      return !!(s.discovered && s.discovered.oregano);
    } },
    { id: "oregano_walker", name: "牛至径旅人", desc: "走过牛至短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.oregano_path);
    } },
    { id: "chive_sill", name: "细香葱窗台", desc: "发现细香葱", check: function (s) {
      return !!(s.discovered && s.discovered.chive);
    } },
    { id: "chive_walker", name: "香葱畦旅人", desc: "走过香葱畦径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chive_patch);
    } },
    { id: "parsley_sill", name: "欧芹窗台", desc: "发现欧芹", check: function (s) {
      return !!(s.discovered && s.discovered.parsley);
    } },
    { id: "parsley_walker", name: "欧芹径旅人", desc: "走过欧芹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.parsley_path);
    } },
    { id: "tarragon_sill", name: "龙蒿窗台", desc: "发现龙蒿", check: function (s) {
      return !!(s.discovered && s.discovered.tarragon);
    } },
    { id: "tarragon_walker", name: "龙蒿径旅人", desc: "走过龙蒿小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.tarragon_lane);
    } },
    { id: "avocado_sill", name: "牛油果窗台", desc: "发现牛油果", check: function (s) {
      return !!(s.discovered && s.discovered.avocado);
    } },
    { id: "avocado_walker", name: "牛油果树径旅人", desc: "走过牛油果树径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.avocado_grove);
    } },
    { id: "date_sill", name: "椰枣窗台", desc: "发现椰枣", check: function (s) {
      return !!(s.discovered && s.discovered.date_fruit);
    } },
    { id: "date_walker", name: "椰枣径旅人", desc: "走过椰枣短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.date_path);
    } },
    { id: "hyssop_sill", name: "神香草窗台", desc: "发现神香草", check: function (s) {
      return !!(s.discovered && s.discovered.hyssop);
    } },
    { id: "hyssop_walker", name: "神香草径旅人", desc: "走过神香草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hyssop_path);
    } },
    { id: "chervil_sill", name: "香芹窗台", desc: "发现香芹", check: function (s) {
      return !!(s.discovered && s.discovered.chervil);
    } },
    { id: "chervil_walker", name: "香芹径旅人", desc: "走过香芹小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chervil_lane);
    } },
    { id: "sorrel_sill", name: "酸模窗台", desc: "发现酸模", check: function (s) {
      return !!(s.discovered && s.discovered.sorrel);
    } },
    { id: "sorrel_walker", name: "酸模径旅人", desc: "走过酸模短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sorrel_path);
    } },
    { id: "lovage_sill", name: "独活窗台", desc: "发现独活", check: function (s) {
      return !!(s.discovered && s.discovered.lovage);
    } },
    { id: "lovage_walker", name: "独活院旅人", desc: "走过独活小院", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lovage_courtyard);
    } },
    
    { id: "verbena_sill", name: "马鞭草窗台", desc: "发现马鞭草", check: function (s) {
      return !!(s.discovered && s.discovered.verbena);
    } },
    { id: "verbena_walker", name: "马鞭草径旅人", desc: "走过马鞭草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.verbena_path);
    } },
    { id: "savory_sill", name: "香薄荷窗台", desc: "发现香薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.savory);
    } },
    { id: "savory_walker", name: "香薄荷径旅人", desc: "走过香薄荷小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.savory_lane);
    } },
    { id: "celery_seed_sill", name: "芹菜籽窗台", desc: "发现芹菜籽", check: function (s) {
      return !!(s.discovered && s.discovered.celery_seed);
    } },
    { id: "celery_seed_walker", name: "芹菜籽径旅人", desc: "走过芹菜籽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.celery_path);
    } },
    { id: "anise_seed_sill", name: "茴香籽窗台", desc: "发现茴香籽", check: function (s) {
      return !!(s.discovered && s.discovered.anise_seed);
    } },
    { id: "anise_seed_walker", name: "茴香籽径旅人", desc: "走过茴香籽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.anise_seed_path);
    } },
    
    { id: "turmeric_sill", name: "姜黄窗台", desc: "发现姜黄", check: function (s) {
      return !!(s.discovered && s.discovered.turmeric);
    } },
    { id: "turmeric_walker", name: "姜黄径旅人", desc: "走过姜黄短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.turmeric_path);
    } },
    { id: "galangal_sill", name: "高良姜窗台", desc: "发现高良姜", check: function (s) {
      return !!(s.discovered && s.discovered.galangal);
    } },
    { id: "galangal_walker", name: "高良姜径旅人", desc: "走过高良姜小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.galangal_lane);
    } },
    { id: "pandan_sill", name: "班兰窗台", desc: "发现班兰", check: function (s) {
      return !!(s.discovered && s.discovered.pandan);
    } },
    { id: "pandan_walker", name: "班兰叶径旅人", desc: "走过班兰叶径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pandan_grove);
    } },
    { id: "kaffir_sill", name: "卡菲尔窗台", desc: "发现卡菲尔青柠", check: function (s) {
      return !!(s.discovered && s.discovered.kaffir_lime);
    } },
    { id: "kaffir_walker", name: "卡菲尔叶径旅人", desc: "走过卡菲尔叶径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.kaffir_path);
    } },
    
    { id: "juniper_sill", name: "杜松窗台", desc: "发现杜松子", check: function (s) {
      return !!(s.discovered && s.discovered.juniper);
    } },
    { id: "juniper_walker", name: "杜松脊旅人", desc: "走过杜松脊径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.juniper_ridge);
    } },
    { id: "allspice_sill", name: "多香果窗台", desc: "发现多香果", check: function (s) {
      return !!(s.discovered && s.discovered.allspice);
    } },
    { id: "allspice_walker", name: "多香果径旅人", desc: "走过多香果小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.allspice_lane);
    } },
    { id: "mace_sill", name: "肉豆蔻衣窗台", desc: "发现肉豆蔻衣", check: function (s) {
      return !!(s.discovered && s.discovered.mace);
    } },
    { id: "mace_walker", name: "肉豆蔻衣径旅人", desc: "走过肉豆蔻衣短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mace_path);
    } },
    { id: "sumac_sill", name: "盐肤木窗台", desc: "发现盐肤木", check: function (s) {
      return !!(s.discovered && s.discovered.sumac);
    } },
    { id: "sumac_walker", name: "盐肤木径旅人", desc: "走过盐肤木短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sumac_path);
    } },
    
    { id: "caraway_sill", name: "葛缕子窗台", desc: "发现葛缕子", check: function (s) {
      return !!(s.discovered && s.discovered.caraway);
    } },
    { id: "caraway_walker", name: "葛缕子径旅人", desc: "走过葛缕子短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.caraway_path);
    } },
    { id: "cumin_sill", name: "孜然窗台", desc: "发现孜然", check: function (s) {
      return !!(s.discovered && s.discovered.cumin);
    } },
    { id: "cumin_walker", name: "孜然径旅人", desc: "走过孜然小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cumin_lane);
    } },
    { id: "fenugreek_sill", name: "胡芦巴窗台", desc: "发现胡芦巴", check: function (s) {
      return !!(s.discovered && s.discovered.fenugreek);
    } },
    { id: "fenugreek_walker", name: "胡芦巴径旅人", desc: "走过胡芦巴短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fenugreek_path);
    } },
    { id: "nigella_sill", name: "黑种草窗台", desc: "发现黑种草", check: function (s) {
      return !!(s.discovered && s.discovered.nigella);
    } },
    { id: "nigella_walker", name: "黑种草径旅人", desc: "走过黑种草小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.nigella_lane);
    } },
    
    { id: "mustard_sill", name: "芥末籽窗台", desc: "发现芥末籽", check: function (s) {
      return !!(s.discovered && s.discovered.mustard_seed);
    } },
    { id: "mustard_walker", name: "芥末籽径旅人", desc: "走过芥末籽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mustard_path);
    } },
    { id: "ajwain_sill", name: "香旱芹窗台", desc: "发现香旱芹", check: function (s) {
      return !!(s.discovered && s.discovered.ajwain);
    } },
    { id: "ajwain_walker", name: "香旱芹径旅人", desc: "走过香旱芹小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ajwain_lane);
    } },
    { id: "wasabi_sill", name: "山葵窗台", desc: "发现山葵", check: function (s) {
      return !!(s.discovered && s.discovered.wasabi);
    } },
    { id: "wasabi_walker", name: "山葵溪旅人", desc: "走过山葵溪径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wasabi_path);
    } },
    { id: "myrtle_sill", name: "香桃木窗台", desc: "发现香桃木", check: function (s) {
      return !!(s.discovered && s.discovered.myrtle);
    } },
    { id: "myrtle_walker", name: "香桃木院旅人", desc: "走过香桃木小院", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.myrtle_courtyard);
    } },
    
    { id: "chicory_sill", name: "菊苣窗台", desc: "发现菊苣", check: function (s) {
      return !!(s.discovered && s.discovered.chicory);
    } },
    { id: "chicory_walker", name: "菊苣径旅人", desc: "走过菊苣短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chicory_path);
    } },
    { id: "dandelion_sill", name: "蒲公英窗台", desc: "发现蒲公英", check: function (s) {
      return !!(s.discovered && s.discovered.dandelion);
    } },
    { id: "dandelion_walker", name: "蒲公英田旅人", desc: "走过蒲公英田径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dandelion_field);
    } },
    { id: "nettle_sill", name: "荨麻窗台", desc: "发现荨麻", check: function (s) {
      return !!(s.discovered && s.discovered.nettle);
    } },
    { id: "nettle_walker", name: "荨麻径旅人", desc: "走过荨麻短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.nettle_path);
    } },
    { id: "yarrow_sill", name: "蓍草窗台", desc: "发现蓍草", check: function (s) {
      return !!(s.discovered && s.discovered.yarrow);
    } },
    { id: "yarrow_walker", name: "蓍草甸旅人", desc: "走过蓍草草甸", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yarrow_meadow);
    } },
    { id: "forage_brewer", name: "野草特调手", desc: "用野草风味出杯 5 次", check: function (s) {
      return (s.stats && s.stats.forageBrews || 0) >= 5;
    } },
    
    { id: "meadowsweet_sill", name: "绣线菊窗台", desc: "发现绣线菊", check: function (s) {
      return !!(s.discovered && s.discovered.meadowsweet);
    } },
    { id: "meadowsweet_walker", name: "绣线菊径旅人", desc: "走过绣线菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.meadowsweet_path);
    } },
    { id: "woodruff_sill", name: "车叶草窗台", desc: "发现车叶草", check: function (s) {
      return !!(s.discovered && s.discovered.woodruff);
    } },
    { id: "woodruff_walker", name: "车叶草径旅人", desc: "走过车叶草小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.woodruff_lane);
    } },
    { id: "borage_sill", name: "琉璃苣窗台", desc: "发现琉璃苣", check: function (s) {
      return !!(s.discovered && s.discovered.borage);
    } },
    { id: "borage_walker", name: "琉璃苣径旅人", desc: "走过琉璃苣短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.borage_path);
    } },
    { id: "valerian_sill", name: "缬草窗台", desc: "发现缬草", check: function (s) {
      return !!(s.discovered && s.discovered.valerian);
    } },
    { id: "valerian_walker", name: "缬草晚径旅人", desc: "走过缬草晚径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.valerian_grove);
    } },
    { id: "hops_sill", name: "啤酒花窗台", desc: "发现啤酒花", check: function (s) {
      return !!(s.discovered && s.discovered.hops);
    } },
    { id: "hops_walker", name: "啤酒花架径旅人", desc: "走过啤酒花架径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hops_trellis);
    } },
    { id: "heather_sill", name: "石楠窗台", desc: "发现石楠", check: function (s) {
      return !!(s.discovered && s.discovered.heather);
    } },
    { id: "heather_walker", name: "石楠坡径旅人", desc: "走过石楠坡径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.heather_hill);
    } },
    { id: "angelica_sill", name: "当归窗台", desc: "发现当归", check: function (s) {
      return !!(s.discovered && s.discovered.angelica);
    } },
    { id: "angelica_walker", name: "当归径旅人", desc: "走过当归短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.angelica_path);
    } },
    { id: "arnica_sill", name: "山金车窗台", desc: "发现山金车", check: function (s) {
      return !!(s.discovered && s.discovered.arnica);
    } },
    { id: "arnica_walker", name: "山金车甸旅人", desc: "走过山金车草甸", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.arnica_meadow);
    } },
    { id: "echinacea_sill", name: "紫锥菊窗台", desc: "发现紫锥菊", check: function (s) {
      return !!(s.discovered && s.discovered.echinacea);
    } },
    { id: "echinacea_walker", name: "紫锥菊甸旅人", desc: "走过紫锥菊草甸", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.echinacea_meadow);
    } },
    { id: "comfrey_sill", name: "聚合草窗台", desc: "发现聚合草", check: function (s) {
      return !!(s.discovered && s.discovered.comfrey);
    } },
    { id: "comfrey_walker", name: "聚合草径旅人", desc: "走过聚合草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.comfrey_path);
    } },
    { id: "feverfew_sill", name: "小白菊窗台", desc: "发现小白菊", check: function (s) {
      return !!(s.discovered && s.discovered.feverfew);
    } },
    { id: "feverfew_walker", name: "小白菊径旅人", desc: "走过小白菊小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.feverfew_lane);
    } },
    { id: "lemon_verbena_sill", name: "柠檬马鞭草窗台", desc: "发现柠檬马鞭草", check: function (s) {
      return !!(s.discovered && s.discovered.lemon_verbena);
    } },
    { id: "lemon_verbena_walker", name: "柠檬马鞭草径旅人", desc: "走过柠檬马鞭草径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lemon_verbena_path);
    } },
    { id: "mullein_sill", name: "毛蕊花窗台", desc: "发现毛蕊花", check: function (s) {
      return !!(s.discovered && s.discovered.mullein);
    } },
    { id: "mullein_walker", name: "毛蕊花径旅人", desc: "走过毛蕊花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mullein_path);
    } },
    { id: "plantain_leaf_sill", name: "车前草窗台", desc: "发现车前草", check: function (s) {
      return !!(s.discovered && s.discovered.plantain_leaf);
    } },
    { id: "plantain_leaf_walker", name: "车前草径旅人", desc: "走过车前草小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.plantain_lane);
    } },
    { id: "selfheal_sill", name: "夏枯草窗台", desc: "发现夏枯草", check: function (s) {
      return !!(s.discovered && s.discovered.selfheal);
    } },
    { id: "selfheal_walker", name: "夏枯草径旅人", desc: "走过夏枯草晚径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.selfheal_grove);
    } },
    { id: "skullcap_sill", name: "黄芩窗台", desc: "发现黄芩", check: function (s) {
      return !!(s.discovered && s.discovered.skullcap);
    } },
    { id: "skullcap_walker", name: "黄芩径旅人", desc: "走过黄芩短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.skullcap_path);
    } },
    { id: "bee_balm_sill", name: "美国薄荷窗台", desc: "发现美国薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.bee_balm);
    } },
    { id: "bee_balm_walker", name: "美国薄荷径旅人", desc: "走过美国薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bee_balm_path);
    } },
    { id: "marshmallow_sill", name: "药蜀葵窗台", desc: "发现药蜀葵", check: function (s) {
      return !!(s.discovered && s.discovered.marshmallow);
    } },
    { id: "marshmallow_walker", name: "药蜀葵径旅人", desc: "走过药蜀葵小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.marshmallow_lane);
    } },
    { id: "linden_sill", name: "椴树花窗台", desc: "发现椴树花", check: function (s) {
      return !!(s.discovered && s.discovered.linden);
    } },
    { id: "linden_walker", name: "椴树花径旅人", desc: "走过椴树花晚径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.linden_grove);
    } },
    { id: "goldenrod_sill", name: "一枝黄花窗台", desc: "发现一枝黄花", check: function (s) {
      return !!(s.discovered && s.discovered.goldenrod);
    } },
    { id: "goldenrod_walker", name: "一枝黄花径旅人", desc: "走过一枝黄花草甸", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.goldenrod_meadow);
    } },
        { id: "red_clover_sill", name: "红车轴草窗台", desc: "发现红车轴草", check: function (s) {
      return !!(s.discovered && s.discovered.red_clover);
    } },
    { id: "red_clover_walker", name: "红车轴草径旅人", desc: "走过红车轴草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.red_clover_path);
    } },
    { id: "white_clover_sill", name: "白车轴草窗台", desc: "发现白车轴草", check: function (s) {
      return !!(s.discovered && s.discovered.white_clover);
    } },
    { id: "white_clover_walker", name: "白车轴草径旅人", desc: "走过白车轴草小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.white_clover_lane);
    } },
    { id: "catnip_sill", name: "猫薄荷窗台", desc: "发现猫薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.catnip);
    } },
    { id: "catnip_walker", name: "猫薄荷径旅人", desc: "走过猫薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.catnip_path);
    } },
    { id: "horehound_sill", name: "夏至草窗台", desc: "发现夏至草", check: function (s) {
      return !!(s.discovered && s.discovered.horehound);
    } },
    { id: "horehound_walker", name: "夏至草径旅人", desc: "走过夏至草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.horehound_path);
    } },
    { id: "motherwort_sill", name: "益母草窗台", desc: "发现益母草", check: function (s) {
      return !!(s.discovered && s.discovered.motherwort);
    } },
    { id: "motherwort_walker", name: "益母草径旅人", desc: "走过益母草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.motherwort_path);
    } },
    { id: "tansy_sill", name: "艾菊窗台", desc: "发现艾菊", check: function (s) {
      return !!(s.discovered && s.discovered.tansy);
    } },
    { id: "tansy_walker", name: "艾菊径旅人", desc: "走过艾菊草甸", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.tansy_meadow);
    } },
    { id: "agrimony_sill", name: "龙芽草窗台", desc: "发现龙芽草", check: function (s) {
      return !!(s.discovered && s.discovered.agrimony);
    } },
    { id: "agrimony_walker", name: "龙芽草径旅人", desc: "走过龙芽草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.agrimony_path);
    } },
    { id: "betony_sill", name: "水苏窗台", desc: "发现水苏", check: function (s) {
      return !!(s.discovered && s.discovered.betony);
    } },
    { id: "betony_walker", name: "水苏径旅人", desc: "走过水苏晚径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.betony_grove);
    } },
    { id: "solomon_seal_sill", name: "黄精窗台", desc: "发现黄精", check: function (s) {
      return !!(s.discovered && s.discovered.solomon_seal);
    } },
    { id: "solomon_seal_walker", name: "黄精径旅人", desc: "走过黄精短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.solomon_seal_path);
    } },
    { id: "rue_sill", name: "芸香窗台", desc: "发现芸香", check: function (s) {
      return !!(s.discovered && s.discovered.rue);
    } },
    { id: "rue_walker", name: "芸香径旅人", desc: "走过芸香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rue_path);
    } },
    { id: "wormwood_sill", name: "苦艾窗台", desc: "发现苦艾", check: function (s) {
      return !!(s.discovered && s.discovered.wormwood);
    } },
    { id: "wormwood_walker", name: "苦艾径旅人", desc: "走过苦艾短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wormwood_path);
    } },
    { id: "costmary_sill", name: "艾菊薄荷窗台", desc: "发现艾菊薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.costmary);
    } },
    { id: "costmary_walker", name: "艾菊薄荷径旅人", desc: "走过艾菊薄荷小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.costmary_lane);
    } },
    { id: "elecampane_sill", name: "土木香窗台", desc: "发现土木香", check: function (s) {
      return !!(s.discovered && s.discovered.elecampane);
    } },
    { id: "elecampane_walker", name: "土木香径旅人", desc: "走过土木香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.elecampane_path);
    } },
    { id: "valerian_root_sill", name: "缬草根窗台", desc: "发现缬草根", check: function (s) {
      return !!(s.discovered && s.discovered.valerian_root);
    } },
    { id: "valerian_root_walker", name: "缬草根径旅人", desc: "走过缬草根晚径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.valerian_root_path);
    } },
    { id: "meadow_clary_sill", name: "草地鼠尾草窗台", desc: "发现草地鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.meadow_clary);
    } },
    { id: "meadow_clary_walker", name: "草地鼠尾草径旅人", desc: "走过草地鼠尾草径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.meadow_clary_path);
    } },
    { id: "soapwort_sill", name: "皂草窗台", desc: "发现皂草", check: function (s) {
      return !!(s.discovered && s.discovered.soapwort);
    } },
    { id: "soapwort_walker", name: "皂草径旅人", desc: "走过皂草小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.soapwort_lane);
    } },
    { id: "milfoil_sill", name: "洋蓍草窗台", desc: "发现洋蓍草", check: function (s) {
      return !!(s.discovered && s.discovered.milfoil);
    } },
    { id: "milfoil_walker", name: "洋蓍草径旅人", desc: "走过洋蓍草草甸", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.milfoil_meadow);
    } },
    { id: "lady_mantle_sill", name: "羽衣草窗台", desc: "发现羽衣草", check: function (s) {
      return !!(s.discovered && s.discovered.lady_mantle);
    } },
    { id: "lady_mantle_walker", name: "羽衣草径旅人", desc: "走过羽衣草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lady_mantle_path);
    } },
    { id: "speedwell_sill", name: "婆婆纳窗台", desc: "发现婆婆纳", check: function (s) {
      return !!(s.discovered && s.discovered.speedwell);
    } },
    { id: "speedwell_walker", name: "婆婆纳径旅人", desc: "走过婆婆纳小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.speedwell_lane);
    } },
    { id: "stitchwort_sill", name: "繁缕窗台", desc: "发现繁缕", check: function (s) {
      return !!(s.discovered && s.discovered.stitchwort);
    } },
    { id: "stitchwort_walker", name: "繁缕径旅人", desc: "走过繁缕短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.stitchwort_path);
    } },
    { id: "campion_sill", name: "剪秋罗窗台", desc: "发现剪秋罗", check: function (s) {
      return !!(s.discovered && s.discovered.campion);
    } },
    { id: "campion_walker", name: "剪秋罗径旅人", desc: "走过剪秋罗短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.campion_path);
    } },
    { id: "avens_sill", name: "水杨梅窗台", desc: "发现水杨梅", check: function (s) {
      return !!(s.discovered && s.discovered.avens);
    } },
    { id: "avens_walker", name: "水杨梅径旅人", desc: "走过水杨梅短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.avens_path);
    } },
    { id: "tormentil_sill", name: "直立委陵菜窗台", desc: "发现直立委陵菜", check: function (s) {
      return !!(s.discovered && s.discovered.tormentil);
    } },
    { id: "tormentil_walker", name: "直立委陵菜径旅人", desc: "走过直立委陵菜径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.tormentil_path);
    } },
    { id: "silverweed_sill", name: "鹅绒委陵菜窗台", desc: "发现鹅绒委陵菜", check: function (s) {
      return !!(s.discovered && s.discovered.silverweed);
    } },
    { id: "silverweed_walker", name: "鹅绒委陵菜径旅人", desc: "走过鹅绒委陵菜径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.silverweed_path);
    } },
    { id: "figwort_sill", name: "玄参窗台", desc: "发现玄参", check: function (s) {
      return !!(s.discovered && s.discovered.figwort);
    } },
    { id: "figwort_walker", name: "玄参径旅人", desc: "走过玄参短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.figwort_path);
    } },
    { id: "loosestrife_sill", name: "千屈菜窗台", desc: "发现千屈菜", check: function (s) {
      return !!(s.discovered && s.discovered.loosestrife);
    } },
    { id: "loosestrife_walker", name: "千屈菜径旅人", desc: "走过千屈菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.loosestrife_path);
    } },
    { id: "willowherb_sill", name: "柳兰窗台", desc: "发现柳兰", check: function (s) {
      return !!(s.discovered && s.discovered.willowherb);
    } },
    { id: "willowherb_walker", name: "柳兰径旅人", desc: "走过柳兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.willowherb_path);
    } },
    { id: "bedstraw_sill", name: "猪殃殃窗台", desc: "发现猪殃殃", check: function (s) {
      return !!(s.discovered && s.discovered.bedstraw);
    } },
    { id: "bedstraw_walker", name: "猪殃殃径旅人", desc: "走过猪殃殃小径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bedstraw_lane);
    } },
    { id: "cleavers_sill", name: "拉拉藤窗台", desc: "发现拉拉藤", check: function (s) {
      return !!(s.discovered && s.discovered.cleavers);
    } },
    { id: "cleavers_walker", name: "拉拉藤径旅人", desc: "走过拉拉藤短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cleavers_path);
    } },
    { id: "ground_ivy_sill", name: "连钱草窗台", desc: "发现连钱草", check: function (s) {
      return !!(s.discovered && s.discovered.ground_ivy);
    } },
    { id: "ground_ivy_walker", name: "连钱草径旅人", desc: "走过连钱草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ground_ivy_path);
    } },
    { id: "self_heal_spike_sill", name: "夏枯穗窗台", desc: "发现夏枯穗", check: function (s) {
      return !!(s.discovered && s.discovered.self_heal_spike);
    } },
    { id: "self_heal_spike_walker", name: "夏枯穗径旅人", desc: "走过夏枯穗晚径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.self_heal_spike_path);
    } },
    { id: "bugle_sill", name: "筋骨草窗台", desc: "发现筋骨草", check: function (s) {
      return !!(s.discovered && s.discovered.bugle);
    } },
    { id: "bugle_walker", name: "筋骨草径旅人", desc: "走过筋骨草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bugle_path);
    } },
    { id: "primrose_sill", name: "报春花窗台", desc: "发现报春花", check: function (s) {
      return !!(s.discovered && s.discovered.primrose);
    } },
    { id: "primrose_walker", name: "报春花径旅人", desc: "走过报春花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.primrose_path);
    } },
    { id: "cowslip_sill", name: "黄花九轮草窗台", desc: "发现黄花九轮草", check: function (s) {
      return !!(s.discovered && s.discovered.cowslip);
    } },
    { id: "cowslip_walker", name: "黄花九轮草径旅人", desc: "走过黄花九轮草径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cowslip_lane);
    } },
    { id: "oxeye_sill", name: "滨菊窗台", desc: "发现滨菊", check: function (s) {
      return !!(s.discovered && s.discovered.oxeye);
    } },
    { id: "oxeye_walker", name: "滨菊径旅人", desc: "走过滨菊草甸", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.oxeye_meadow);
    } },
    { id: "knapweed_sill", name: "矢车菊窗台", desc: "发现矢车菊", check: function (s) {
      return !!(s.discovered && s.discovered.knapweed);
    } },
    { id: "knapweed_walker", name: "矢车菊径旅人", desc: "走过矢车菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.knapweed_path);
    } },
    { id: "scabious_sill", name: "山萝卜窗台", desc: "发现山萝卜", check: function (s) {
      return !!(s.discovered && s.discovered.scabious);
    } },
    { id: "scabious_walker", name: "山萝卜径旅人", desc: "走过山萝卜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.scabious_path);
    } },
    { id: "teasel_sill", name: "川续断窗台", desc: "发现川续断", check: function (s) {
      return !!(s.discovered && s.discovered.teasel);
    } },
    { id: "teasel_walker", name: "川续断径旅人", desc: "走过川续断短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.teasel_path);
    } },
    { id: "burdock_sill", name: "牛蒡窗台", desc: "发现牛蒡", check: function (s) {
      return !!(s.discovered && s.discovered.burdock);
    } },
    { id: "burdock_walker", name: "牛蒡径旅人", desc: "走过牛蒡短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.burdock_path);
    } },
    { id: "nettle_seed_sill", name: "荨麻籽窗台", desc: "发现荨麻籽", check: function (s) {
      return !!(s.discovered && s.discovered.nettle_seed);
    } },
    { id: "nettle_seed_walker", name: "荨麻籽径旅人", desc: "走过荨麻籽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.nettle_seed_path);
    } },
    { id: "hawthorn_berry_sill", name: "山楂果窗台", desc: "发现山楂果", check: function (s) {
      return !!(s.discovered && s.discovered.hawthorn_berry);
    } },
    { id: "hawthorn_berry_walker", name: "山楂果径旅人", desc: "走过山楂果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hawthorn_berry_path);
    } },
    { id: "rosehip_sill", name: "玫瑰果窗台", desc: "发现玫瑰果", check: function (s) {
      return !!(s.discovered && s.discovered.rosehip);
    } },
    { id: "rosehip_walker", name: "玫瑰果径旅人", desc: "走过玫瑰果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rosehip_path);
    } },
    { id: "sloe_sill", name: "黑刺李窗台", desc: "发现黑刺李", check: function (s) {
      return !!(s.discovered && s.discovered.sloe);
    } },
    { id: "sloe_walker", name: "黑刺李径旅人", desc: "走过黑刺李短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sloe_path);
    } },
    { id: "rowan_sill", name: "花楸果窗台", desc: "发现花楸果", check: function (s) {
      return !!(s.discovered && s.discovered.rowan);
    } },
    { id: "rowan_walker", name: "花楸果径旅人", desc: "走过花楸果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rowan_path);
    } },
    { id: "crabapple_sill", name: "海棠果窗台", desc: "发现海棠果", check: function (s) {
      return !!(s.discovered && s.discovered.crabapple);
    } },
    { id: "crabapple_walker", name: "海棠果径旅人", desc: "走过海棠果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.crabapple_path);
    } },
    { id: "serviceberry_sill", name: "唐棣窗台", desc: "发现唐棣", check: function (s) {
      return !!(s.discovered && s.discovered.serviceberry);
    } },
    { id: "serviceberry_walker", name: "唐棣径旅人", desc: "走过唐棣短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.serviceberry_path);
    } },
    { id: "elderflower_fresh_sill", name: "接骨木花鲜窗台", desc: "发现接骨木花鲜", check: function (s) {
      return !!(s.discovered && s.discovered.elderflower_fresh);
    } },
    { id: "elderflower_fresh_walker", name: "接骨木花鲜径旅人", desc: "走过接骨木花鲜径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.elderflower_fresh_path);
    } },
    { id: "meadowsweet_fresh_sill", name: "绣线菊鲜窗台", desc: "发现绣线菊鲜", check: function (s) {
      return !!(s.discovered && s.discovered.meadowsweet_fresh);
    } },
    { id: "meadowsweet_fresh_walker", name: "绣线菊鲜径旅人", desc: "走过绣线菊鲜径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.meadowsweet_fresh_path);
    } },
    { id: "wood_sorrel_sill", name: "酢浆草窗台", desc: "发现酢浆草", check: function (s) {
      return !!(s.discovered && s.discovered.wood_sorrel);
    } },
    { id: "wood_sorrel_walker", name: "酢浆草径旅人", desc: "走过酢浆草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wood_sorrel_path);
    } },
    { id: "wild_garlic_sill", name: "熊葱窗台", desc: "发现熊葱", check: function (s) {
      return !!(s.discovered && s.discovered.wild_garlic);
    } },
    { id: "wild_garlic_walker", name: "熊葱径旅人", desc: "走过熊葱短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wild_garlic_path);
    } },
    { id: "ramsons_sill", name: "熊蒜窗台", desc: "发现熊蒜", check: function (s) {
      return !!(s.discovered && s.discovered.ramsons);
    } },
    { id: "ramsons_walker", name: "熊蒜径旅人", desc: "走过熊蒜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ramsons_path);
    } },
    { id: "jack_by_hedge_sill", name: "蒜芥窗台", desc: "发现蒜芥", check: function (s) {
      return !!(s.discovered && s.discovered.jack_by_hedge);
    } },
    { id: "jack_by_hedge_walker", name: "蒜芥径旅人", desc: "走过蒜芥短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.jack_by_hedge_path);
    } },
    { id: "hedge_mustard_sill", name: "蒜芥菜窗台", desc: "发现蒜芥菜", check: function (s) {
      return !!(s.discovered && s.discovered.hedge_mustard);
    } },
    { id: "hedge_mustard_walker", name: "蒜芥菜径旅人", desc: "走过蒜芥菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hedge_mustard_path);
    } },
    { id: "wintercress_sill", name: "山芥窗台", desc: "发现山芥", check: function (s) {
      return !!(s.discovered && s.discovered.wintercress);
    } },
    { id: "wintercress_walker", name: "山芥径旅人", desc: "走过山芥短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wintercress_path);
    } },
    { id: "watercress_sill", name: "豆瓣菜窗台", desc: "发现豆瓣菜", check: function (s) {
      return !!(s.discovered && s.discovered.watercress);
    } },
    { id: "watercress_walker", name: "豆瓣菜径旅人", desc: "走过豆瓣菜溪径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.watercress_path);
    } },
    { id: "brooklime_sill", name: "有柄水苦荬窗台", desc: "发现有柄水苦荬", check: function (s) {
      return !!(s.discovered && s.discovered.brooklime);
    } },
    { id: "brooklime_walker", name: "有柄水苦荬径旅人", desc: "走过水苦荬溪径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.brooklime_path);
    } },
    { id: "cloudberry_sill", name: "云莓窗台", desc: "发现云莓", check: function (s) {
      return !!(s.discovered && s.discovered.cloudberry);
    } },
    { id: "cloudberry_walker", name: "云莓径旅人", desc: "走过云莓短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cloudberry_path);
    } },
    { id: "lingonberry_sill", name: "越橘窗台", desc: "发现越橘", check: function (s) {
      return !!(s.discovered && s.discovered.lingonberry);
    } },
    { id: "lingonberry_walker", name: "越橘径旅人", desc: "走过越橘短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lingonberry_path);
    } },
    { id: "bilberry_sill", name: "欧洲越橘窗台", desc: "发现欧洲越橘", check: function (s) {
      return !!(s.discovered && s.discovered.bilberry);
    } },
    { id: "bilberry_walker", name: "欧洲越橘径旅人", desc: "走过欧洲越橘短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bilberry_path);
    } },
    { id: "gooseberry_sill", name: "醋栗窗台", desc: "发现醋栗", check: function (s) {
      return !!(s.discovered && s.discovered.gooseberry);
    } },
    { id: "gooseberry_walker", name: "醋栗径旅人", desc: "走过醋栗短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.gooseberry_path);
    } },
    { id: "currant_red_sill", name: "红醋栗窗台", desc: "发现红醋栗", check: function (s) {
      return !!(s.discovered && s.discovered.currant_red);
    } },
    { id: "currant_red_walker", name: "红醋栗径旅人", desc: "走过红醋栗短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.currant_red_path);
    } },
    { id: "currant_black_sill", name: "黑醋栗窗台", desc: "发现黑醋栗", check: function (s) {
      return !!(s.discovered && s.discovered.currant_black);
    } },
    { id: "currant_black_walker", name: "黑醋栗径旅人", desc: "走过黑醋栗短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.currant_black_path);
    } },
    { id: "whitecurrant_sill", name: "白醋栗窗台", desc: "发现白醋栗", check: function (s) {
      return !!(s.discovered && s.discovered.whitecurrant);
    } },
    { id: "whitecurrant_walker", name: "白醋栗径旅人", desc: "走过白醋栗短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.whitecurrant_path);
    } },
    { id: "sea_buckthorn_sill", name: "沙棘窗台", desc: "发现沙棘", check: function (s) {
      return !!(s.discovered && s.discovered.sea_buckthorn);
    } },
    { id: "sea_buckthorn_walker", name: "沙棘径旅人", desc: "走过沙棘短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sea_buckthorn_path);
    } },
    { id: "medlar_sill", name: "欧楂窗台", desc: "发现欧楂", check: function (s) {
      return !!(s.discovered && s.discovered.medlar);
    } },
    { id: "medlar_walker", name: "欧楂径旅人", desc: "走过欧楂短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.medlar_path);
    } },
    { id: "quince_sill", name: "榅桲窗台", desc: "发现榅桲", check: function (s) {
      return !!(s.discovered && s.discovered.quince);
    } },
    { id: "quince_walker", name: "榅桲径旅人", desc: "走过榅桲短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.quince_path);
    } },
    { id: "damson_sill", name: "西洋李窗台", desc: "发现西洋李", check: function (s) {
      return !!(s.discovered && s.discovered.damson);
    } },
    { id: "damson_walker", name: "西洋李径旅人", desc: "走过西洋李短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.damson_path);
    } },
    { id: "greengage_sill", name: "青李窗台", desc: "发现青李", check: function (s) {
      return !!(s.discovered && s.discovered.greengage);
    } },
    { id: "greengage_walker", name: "青李径旅人", desc: "走过青李短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.greengage_path);
    } },
    { id: "mirabelle_sill", name: "黄香李窗台", desc: "发现黄香李", check: function (s) {
      return !!(s.discovered && s.discovered.mirabelle);
    } },
    { id: "mirabelle_walker", name: "黄香李径旅人", desc: "走过黄香李短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mirabelle_path);
    } },
    { id: "saskatoon_sill", name: "萨斯卡通莓窗台", desc: "发现萨斯卡通莓", check: function (s) {
      return !!(s.discovered && s.discovered.saskatoon);
    } },
    { id: "saskatoon_walker", name: "萨斯卡通莓径旅人", desc: "走过萨斯卡通莓径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.saskatoon_path);
    } },
    { id: "chokeberry_sill", name: "野樱莓窗台", desc: "发现野樱莓", check: function (s) {
      return !!(s.discovered && s.discovered.chokeberry);
    } },
    { id: "chokeberry_walker", name: "野樱莓径旅人", desc: "走过野樱莓短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chokeberry_path);
    } },
    { id: "aronia_sill", name: "黑果腺肋花楸窗台", desc: "发现黑果腺肋花楸", check: function (s) {
      return !!(s.discovered && s.discovered.aronia);
    } },
    { id: "aronia_walker", name: "黑果腺肋花楸径旅人", desc: "走过黑果腺肋花楸径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.aronia_path);
    } },
    { id: "yarrow_white_sill", name: "白蓍窗台", desc: "发现白蓍", check: function (s) {
      return !!(s.discovered && s.discovered.yarrow_white);
    } },
    { id: "yarrow_white_walker", name: "白蓍径旅人", desc: "走过白蓍短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yarrow_white_path);
    } },
    { id: "achillea_pink_sill", name: "粉蓍窗台", desc: "发现粉蓍", check: function (s) {
      return !!(s.discovered && s.discovered.achillea_pink);
    } },
    { id: "achillea_pink_walker", name: "粉蓍径旅人", desc: "走过粉蓍短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.achillea_pink_path);
    } },
    { id: "cornflower_sill", name: "矢车菊蓝窗台", desc: "发现矢车菊蓝", check: function (s) {
      return !!(s.discovered && s.discovered.cornflower);
    } },
    { id: "cornflower_walker", name: "矢车菊蓝径旅人", desc: "走过矢车菊蓝径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cornflower_path);
    } },
    { id: "poppy_seed_sill", name: "罂粟籽窗台", desc: "发现罂粟籽", check: function (s) {
      return !!(s.discovered && s.discovered.poppy_seed);
    } },
    { id: "poppy_seed_walker", name: "罂粟籽径旅人", desc: "走过罂粟籽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.poppy_seed_path);
    } },
    { id: "flax_flower_sill", name: "亚麻花窗台", desc: "发现亚麻花", check: function (s) {
      return !!(s.discovered && s.discovered.flax_flower);
    } },
    { id: "flax_flower_walker", name: "亚麻花径旅人", desc: "走过亚麻花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.flax_flower_path);
    } },
    { id: "flax_seed_sill", name: "亚麻籽窗台", desc: "发现亚麻籽", check: function (s) {
      return !!(s.discovered && s.discovered.flax_seed);
    } },
    { id: "flax_seed_walker", name: "亚麻籽径旅人", desc: "走过亚麻籽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.flax_seed_path);
    } },
    { id: "hemp_seed_sill", name: "火麻仁窗台", desc: "发现火麻仁", check: function (s) {
      return !!(s.discovered && s.discovered.hemp_seed);
    } },
    { id: "hemp_seed_walker", name: "火麻仁径旅人", desc: "走过火麻仁短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hemp_seed_path);
    } },
    { id: "chia_seed_sill", name: "奇亚籽窗台", desc: "发现奇亚籽", check: function (s) {
      return !!(s.discovered && s.discovered.chia_seed);
    } },
    { id: "chia_seed_walker", name: "奇亚籽径旅人", desc: "走过奇亚籽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chia_seed_path);
    } },
    { id: "pumpkin_seed_sill", name: "南瓜籽窗台", desc: "发现南瓜籽", check: function (s) {
      return !!(s.discovered && s.discovered.pumpkin_seed);
    } },
    { id: "pumpkin_seed_walker", name: "南瓜籽径旅人", desc: "走过南瓜籽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pumpkin_seed_path);
    } },
    { id: "sunflower_seed_sill", name: "葵花籽窗台", desc: "发现葵花籽", check: function (s) {
      return !!(s.discovered && s.discovered.sunflower_seed);
    } },
    { id: "sunflower_seed_walker", name: "葵花籽径旅人", desc: "走过葵花籽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sunflower_seed_path);
    } },
    { id: "sesame_black_sill", name: "黑芝麻窗台", desc: "发现黑芝麻", check: function (s) {
      return !!(s.discovered && s.discovered.sesame_black);
    } },
    { id: "sesame_black_walker", name: "黑芝麻径旅人", desc: "走过黑芝麻短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sesame_black_path);
    } },
    { id: "sesame_white_sill", name: "白芝麻窗台", desc: "发现白芝麻", check: function (s) {
      return !!(s.discovered && s.discovered.sesame_white);
    } },
    { id: "sesame_white_walker", name: "白芝麻径旅人", desc: "走过白芝麻短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sesame_white_path);
    } },
    { id: "fennel_pollen_sill", name: "茴香花粉窗台", desc: "发现茴香花粉", check: function (s) {
      return !!(s.discovered && s.discovered.fennel_pollen);
    } },
    { id: "fennel_pollen_walker", name: "茴香花粉径旅人", desc: "走过茴香花粉径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fennel_pollen_path);
    } },
    { id: "fennel_frond_sill", name: "茴香叶窗台", desc: "发现茴香叶", check: function (s) {
      return !!(s.discovered && s.discovered.fennel_frond);
    } },
    { id: "fennel_frond_walker", name: "茴香叶径旅人", desc: "走过茴香叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fennel_frond_path);
    } },
    { id: "dill_pollen_sill", name: "莳萝花粉窗台", desc: "发现莳萝花粉", check: function (s) {
      return !!(s.discovered && s.discovered.dill_pollen);
    } },
    { id: "dill_pollen_walker", name: "莳萝花粉径旅人", desc: "走过莳萝花粉径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dill_pollen_path);
    } },
    { id: "celery_leaf_sill", name: "芹菜叶窗台", desc: "发现芹菜叶", check: function (s) {
      return !!(s.discovered && s.discovered.celery_leaf);
    } },
    { id: "celery_leaf_walker", name: "芹菜叶径旅人", desc: "走过芹菜叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.celery_leaf_path);
    } },
    { id: "rooibos_sill", name: "路易波士窗台", desc: "发现路易波士", check: function (s) {
      return !!(s.discovered && s.discovered.rooibos);
    } },
    { id: "rooibos_walker", name: "路易波士径旅人", desc: "走过路易波士短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rooibos_path);
    } },
    { id: "honeybush_sill", name: "蜜树茶窗台", desc: "发现蜜树茶", check: function (s) {
      return !!(s.discovered && s.discovered.honeybush);
    } },
    { id: "honeybush_walker", name: "蜜树茶径旅人", desc: "走过蜜树茶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.honeybush_path);
    } },
    { id: "yerba_mate_sill", name: "马黛茶窗台", desc: "发现马黛茶", check: function (s) {
      return !!(s.discovered && s.discovered.yerba_mate);
    } },
    { id: "yerba_mate_walker", name: "马黛茶径旅人", desc: "走过马黛茶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yerba_mate_path);
    } },
    { id: "guayusa_sill", name: "瓜尤萨窗台", desc: "发现瓜尤萨", check: function (s) {
      return !!(s.discovered && s.discovered.guayusa);
    } },
    { id: "guayusa_walker", name: "瓜尤萨径旅人", desc: "走过瓜尤萨短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.guayusa_path);
    } },
    { id: "lapacho_sill", name: "拉帕乔窗台", desc: "发现拉帕乔", check: function (s) {
      return !!(s.discovered && s.discovered.lapacho);
    } },
    { id: "lapacho_walker", name: "拉帕乔径旅人", desc: "走过拉帕乔树径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lapacho_path);
    } },
    { id: "sassafras_sill", name: "檫树窗台", desc: "发现檫树", check: function (s) {
      return !!(s.discovered && s.discovered.sassafras);
    } },
    { id: "sassafras_walker", name: "檫树径旅人", desc: "走过檫树短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sassafras_path);
    } },
    { id: "birch_bark_sill", name: "白桦皮窗台", desc: "发现白桦皮", check: function (s) {
      return !!(s.discovered && s.discovered.birch_bark);
    } },
    { id: "birch_bark_walker", name: "白桦皮径旅人", desc: "走过白桦皮短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.birch_bark_path);
    } },
    { id: "pine_resin_sill", name: "松脂窗台", desc: "发现松脂", check: function (s) {
      return !!(s.discovered && s.discovered.pine_resin);
    } },
    { id: "pine_resin_walker", name: "松脂径旅人", desc: "走过松脂短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pine_resin_path);
    } },
    { id: "gardenia_sill", name: "栀子花窗台", desc: "发现栀子花", check: function (s) {
      return !!(s.discovered && s.discovered.gardenia);
    } },
    { id: "gardenia_walker", name: "栀子花径旅人", desc: "走过栀子花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.gardenia_path);
    } },
    { id: "magnolia_sill", name: "玉兰花窗台", desc: "发现玉兰花", check: function (s) {
      return !!(s.discovered && s.discovered.magnolia);
    } },
    { id: "magnolia_walker", name: "玉兰花径旅人", desc: "走过玉兰花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.magnolia_path);
    } },
    { id: "frangipani_sill", name: "鸡蛋花窗台", desc: "发现鸡蛋花", check: function (s) {
      return !!(s.discovered && s.discovered.frangipani);
    } },
    { id: "frangipani_walker", name: "鸡蛋花径旅人", desc: "走过鸡蛋花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.frangipani_path);
    } },
    { id: "plumeria_sill", name: "缅栀窗台", desc: "发现缅栀", check: function (s) {
      return !!(s.discovered && s.discovered.plumeria);
    } },
    { id: "plumeria_walker", name: "缅栀径旅人", desc: "走过缅栀短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.plumeria_path);
    } },
    { id: "tuberose_sill", name: "晚香玉窗台", desc: "发现晚香玉", check: function (s) {
      return !!(s.discovered && s.discovered.tuberose);
    } },
    { id: "tuberose_walker", name: "晚香玉径旅人", desc: "走过晚香玉晚径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.tuberose_path);
    } },
    { id: "stephanotis_sill", name: "马达加斯加茉莉窗台", desc: "发现马达加斯加茉莉", check: function (s) {
      return !!(s.discovered && s.discovered.stephanotis);
    } },
    { id: "stephanotis_walker", name: "马达加斯加茉莉径旅人", desc: "走过马达加斯加茉莉径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.stephanotis_path);
    } },
    { id: "garden_phlox_sill", name: "福禄考窗台", desc: "发现福禄考", check: function (s) {
      return !!(s.discovered && s.discovered.garden_phlox);
    } },
    { id: "garden_phlox_walker", name: "福禄考径旅人", desc: "走过福禄考短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.garden_phlox_path);
    } },
    { id: "osmanthus_fresh_sill", name: "桂花鲜瓣窗台", desc: "发现桂花鲜瓣", check: function (s) {
      return !!(s.discovered && s.discovered.osmanthus_fresh);
    } },
    { id: "osmanthus_fresh_walker", name: "桂花鲜瓣径旅人", desc: "走过桂花鲜瓣短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.osmanthus_fresh_path);
    } },
    { id: "galangal_fresh_sill", name: "鲜高良姜窗台", desc: "发现鲜高良姜", check: function (s) {
      return !!(s.discovered && s.discovered.galangal_fresh);
    } },
    { id: "galangal_fresh_walker", name: "鲜高良姜径旅人", desc: "走过鲜高良姜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.galangal_fresh_path);
    } },
    { id: "ginger_flower_sill", name: "姜花窗台", desc: "发现姜花", check: function (s) {
      return !!(s.discovered && s.discovered.ginger_flower);
    } },
    { id: "ginger_flower_walker", name: "姜花径旅人", desc: "走过姜花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ginger_flower_path);
    } },
    { id: "turmeric_fresh_sill", name: "鲜姜黄窗台", desc: "发现鲜姜黄", check: function (s) {
      return !!(s.discovered && s.discovered.turmeric_fresh);
    } },
    { id: "turmeric_fresh_walker", name: "鲜姜黄径旅人", desc: "走过鲜姜黄短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.turmeric_fresh_path);
    } },
    { id: "cardamom_green_sill", name: "绿豆蔻窗台", desc: "发现绿豆蔻", check: function (s) {
      return !!(s.discovered && s.discovered.cardamom_green);
    } },
    { id: "cardamom_green_walker", name: "绿豆蔻径旅人", desc: "走过绿豆蔻短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cardamom_green_path);
    } },
    { id: "cardamom_black_sill", name: "黑豆蔻窗台", desc: "发现黑豆蔻", check: function (s) {
      return !!(s.discovered && s.discovered.cardamom_black);
    } },
    { id: "cardamom_black_walker", name: "黑豆蔻径旅人", desc: "走过黑豆蔻短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cardamom_black_path);
    } },
    { id: "long_pepper_sill", name: "荜拨窗台", desc: "发现荜拨", check: function (s) {
      return !!(s.discovered && s.discovered.long_pepper);
    } },
    { id: "long_pepper_walker", name: "荜拨径旅人", desc: "走过荜拨短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.long_pepper_path);
    } },
    { id: "grains_of_paradise_sill", name: "天堂椒窗台", desc: "发现天堂椒", check: function (s) {
      return !!(s.discovered && s.discovered.grains_of_paradise);
    } },
    { id: "grains_of_paradise_walker", name: "天堂椒径旅人", desc: "走过天堂椒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.grains_paradise_path);
    } },
    { id: "cubeb_sill", name: "毕澄茄窗台", desc: "发现毕澄茄", check: function (s) {
      return !!(s.discovered && s.discovered.cubeb);
    } },
    { id: "cubeb_walker", name: "毕澄茄径旅人", desc: "走过毕澄茄短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cubeb_path);
    } },
    { id: "makrut_leaf_sill", name: "青柠叶窗台", desc: "发现青柠叶", check: function (s) {
      return !!(s.discovered && s.discovered.makrut_leaf);
    } },
    { id: "makrut_leaf_walker", name: "青柠叶径旅人", desc: "走过青柠叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.makrut_leaf_path);
    } },
    { id: "curry_leaf_sill", name: "咖喱叶窗台", desc: "发现咖喱叶", check: function (s) {
      return !!(s.discovered && s.discovered.curry_leaf);
    } },
    { id: "curry_leaf_walker", name: "咖喱叶径旅人", desc: "走过咖喱叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.curry_leaf_path);
    } },
    { id: "holy_basil_sill", name: "圣罗勒窗台", desc: "发现圣罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.holy_basil);
    } },
    { id: "holy_basil_walker", name: "圣罗勒径旅人", desc: "走过圣罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.holy_basil_path);
    } },
    { id: "thai_basil_sill", name: "泰罗勒窗台", desc: "发现泰罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.thai_basil);
    } },
    { id: "thai_basil_walker", name: "泰罗勒径旅人", desc: "走过泰罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.thai_basil_path);
    } },
    { id: "lemon_basil_sill", name: "柠檬罗勒窗台", desc: "发现柠檬罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.lemon_basil);
    } },
    { id: "lemon_basil_walker", name: "柠檬罗勒径旅人", desc: "走过柠檬罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lemon_basil_path);
    } },
    { id: "cinnamon_leaf_sill", name: "肉桂叶窗台", desc: "发现肉桂叶", check: function (s) {
      return !!(s.discovered && s.discovered.cinnamon_leaf);
    } },
    { id: "cinnamon_leaf_walker", name: "肉桂叶径旅人", desc: "走过肉桂叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cinnamon_leaf_path);
    } },
    { id: "clove_bud_sill", name: "丁香芽窗台", desc: "发现丁香芽", check: function (s) {
      return !!(s.discovered && s.discovered.clove_bud);
    } },
    { id: "clove_bud_walker", name: "丁香芽径旅人", desc: "走过丁香芽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.clove_bud_path);
    } },
    { id: "allspice_leaf_sill", name: "多香果叶窗台", desc: "发现多香果叶", check: function (s) {
      return !!(s.discovered && s.discovered.allspice_leaf);
    } },
    { id: "allspice_leaf_walker", name: "多香果叶径旅人", desc: "走过多香果叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.allspice_leaf_path);
    } },
    { id: "reindeer_moss_sill", name: "驯鹿苔窗台", desc: "发现驯鹿苔", check: function (s) {
      return !!(s.discovered && s.discovered.reindeer_moss);
    } },
    { id: "reindeer_moss_walker", name: "驯鹿苔径旅人", desc: "走过驯鹿苔短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.reindeer_moss_path);
    } },
    { id: "iceland_moss_sill", name: "冰岛苔窗台", desc: "发现冰岛苔", check: function (s) {
      return !!(s.discovered && s.discovered.iceland_moss);
    } },
    { id: "iceland_moss_walker", name: "冰岛苔径旅人", desc: "走过冰岛苔短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.iceland_moss_path);
    } },
    { id: "oak_moss_sill", name: "橡苔窗台", desc: "发现橡苔", check: function (s) {
      return !!(s.discovered && s.discovered.oak_moss);
    } },
    { id: "oak_moss_walker", name: "橡苔径旅人", desc: "走过橡苔短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.oak_moss_path);
    } },
    { id: "usnea_sill", name: "松萝窗台", desc: "发现松萝", check: function (s) {
      return !!(s.discovered && s.discovered.usnea);
    } },
    { id: "usnea_walker", name: "松萝径旅人", desc: "走过松萝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.usnea_path);
    } },
    { id: "chaga_sill", name: "白桦茸窗台", desc: "发现白桦茸", check: function (s) {
      return !!(s.discovered && s.discovered.chaga);
    } },
    { id: "chaga_walker", name: "白桦茸径旅人", desc: "走过白桦茸短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chaga_path);
    } },
    { id: "reishi_sill", name: "灵芝窗台", desc: "发现灵芝", check: function (s) {
      return !!(s.discovered && s.discovered.reishi);
    } },
    { id: "reishi_walker", name: "灵芝径旅人", desc: "走过灵芝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.reishi_path);
    } },
    { id: "lion_mane_sill", name: "猴头菇窗台", desc: "发现猴头菇", check: function (s) {
      return !!(s.discovered && s.discovered.lion_mane);
    } },
    { id: "lion_mane_walker", name: "猴头菇径旅人", desc: "走过猴头菇短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lion_mane_path);
    } },
    { id: "maitake_sill", name: "舞茸窗台", desc: "发现舞茸", check: function (s) {
      return !!(s.discovered && s.discovered.maitake);
    } },
    { id: "maitake_walker", name: "舞茸径旅人", desc: "走过舞茸短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.maitake_path);
    } },
    { id: "rambutan_fresh_sill", name: "鲜红毛丹窗台", desc: "发现鲜红毛丹", check: function (s) {
      return !!(s.discovered && s.discovered.rambutan_fresh);
    } },
    { id: "rambutan_fresh_walker", name: "鲜红毛丹径旅人", desc: "走过鲜红毛丹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rambutan_fresh_path);
    } },
    { id: "lychee_fresh_sill", name: "鲜荔枝窗台", desc: "发现鲜荔枝", check: function (s) {
      return !!(s.discovered && s.discovered.lychee_fresh);
    } },
    { id: "lychee_fresh_walker", name: "鲜荔枝径旅人", desc: "走过鲜荔枝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lychee_fresh_path);
    } },
    { id: "mangosteen_sill", name: "山竹窗台", desc: "发现山竹", check: function (s) {
      return !!(s.discovered && s.discovered.mangosteen);
    } },
    { id: "mangosteen_walker", name: "山竹径旅人", desc: "走过山竹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mangosteen_path);
    } },
    { id: "durian_flower_sill", name: "榴莲花窗台", desc: "发现榴莲花", check: function (s) {
      return !!(s.discovered && s.discovered.durian_flower);
    } },
    { id: "durian_flower_walker", name: "榴莲花径旅人", desc: "走过榴莲花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.durian_flower_path);
    } },
    { id: "jackfruit_seed_sill", name: "波罗蜜籽窗台", desc: "发现波罗蜜籽", check: function (s) {
      return !!(s.discovered && s.discovered.jackfruit_seed);
    } },
    { id: "jackfruit_seed_walker", name: "波罗蜜籽径旅人", desc: "走过波罗蜜籽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.jackfruit_seed_path);
    } },
    { id: "tamarind_sill", name: "罗望子窗台", desc: "发现罗望子", check: function (s) {
      return !!(s.discovered && s.discovered.tamarind);
    } },
    { id: "tamarind_walker", name: "罗望子径旅人", desc: "走过罗望子短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.tamarind_path);
    } },
    { id: "calamansi_sill", name: "四季桔窗台", desc: "发现四季桔", check: function (s) {
      return !!(s.discovered && s.discovered.calamansi);
    } },
    { id: "calamansi_walker", name: "四季桔径旅人", desc: "走过四季桔短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.calamansi_path);
    } },
    { id: "fig_fresh_sill", name: "无花果鲜窗台", desc: "发现无花果鲜", check: function (s) {
      return !!(s.discovered && s.discovered.fig_fresh);
    } },
    { id: "fig_fresh_walker", name: "无花果鲜径旅人", desc: "走过无花果鲜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fig_fresh_path);
    } },
    { id: "pomegranate_seed_sill", name: "石榴籽窗台", desc: "发现石榴籽", check: function (s) {
      return !!(s.discovered && s.discovered.pomegranate_seed);
    } },
    { id: "pomegranate_seed_walker", name: "石榴籽径旅人", desc: "走过石榴籽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pomegranate_seed_path);
    } },
    { id: "cactus_pear_sill", name: "仙人掌果窗台", desc: "发现仙人掌果", check: function (s) {
      return !!(s.discovered && s.discovered.cactus_pear);
    } },
    { id: "cactus_pear_walker", name: "仙人掌果径旅人", desc: "走过仙人掌果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cactus_pear_path);
    } },
    { id: "prickly_pear_sill", name: "霸王树果窗台", desc: "发现霸王树果", check: function (s) {
      return !!(s.discovered && s.discovered.prickly_pear);
    } },
    { id: "prickly_pear_walker", name: "霸王树果径旅人", desc: "走过霸王树果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.prickly_pear_path);
    } },
    { id: "sapodilla_sill", name: "人心果窗台", desc: "发现人心果", check: function (s) {
      return !!(s.discovered && s.discovered.sapodilla);
    } },
    { id: "sapodilla_walker", name: "人心果径旅人", desc: "走过人心果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sapodilla_path);
    } },
    { id: "soursop_sill", name: "刺果番荔枝窗台", desc: "发现刺果番荔枝", check: function (s) {
      return !!(s.discovered && s.discovered.soursop);
    } },
    { id: "soursop_walker", name: "刺果番荔枝径旅人", desc: "走过刺果番荔枝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.soursop_path);
    } },
    { id: "cherimoya_sill", name: "毛叶番荔枝窗台", desc: "发现毛叶番荔枝", check: function (s) {
      return !!(s.discovered && s.discovered.cherimoya);
    } },
    { id: "cherimoya_walker", name: "毛叶番荔枝径旅人", desc: "走过毛叶番荔枝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cherimoya_path);
    } },
    { id: "feijoa_sill", name: "费约果窗台", desc: "发现费约果", check: function (s) {
      return !!(s.discovered && s.discovered.feijoa);
    } },
    { id: "feijoa_walker", name: "费约果径旅人", desc: "走过费约果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.feijoa_path);
    } },
    { id: "loquat_fresh_sill", name: "鲜枇杷窗台", desc: "发现鲜枇杷", check: function (s) {
      return !!(s.discovered && s.discovered.loquat_fresh);
    } },
    { id: "loquat_fresh_walker", name: "鲜枇杷径旅人", desc: "走过鲜枇杷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.loquat_fresh_path);
    } },
    { id: "jujube_fresh_sill", name: "鲜枣窗台", desc: "发现鲜枣", check: function (s) {
      return !!(s.discovered && s.discovered.jujube_fresh);
    } },
    { id: "jujube_fresh_walker", name: "鲜枣径旅人", desc: "走过鲜枣短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.jujube_fresh_path);
    } },
    { id: "mulberry_white_sill", name: "白桑窗台", desc: "发现白桑", check: function (s) {
      return !!(s.discovered && s.discovered.mulberry_white);
    } },
    { id: "mulberry_white_walker", name: "白桑径旅人", desc: "走过白桑短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mulberry_white_path);
    } },
    { id: "mulberry_black_sill", name: "黑桑窗台", desc: "发现黑桑", check: function (s) {
      return !!(s.discovered && s.discovered.mulberry_black);
    } },
    { id: "mulberry_black_walker", name: "黑桑径旅人", desc: "走过黑桑短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mulberry_black_path);
    } },
    { id: "elderberry_fresh_sill", name: "鲜接骨木果窗台", desc: "发现鲜接骨木果", check: function (s) {
      return !!(s.discovered && s.discovered.elderberry_fresh);
    } },
    { id: "elderberry_fresh_walker", name: "鲜接骨木果径旅人", desc: "走过鲜接骨木果径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.elderberry_fresh_path);
    } },
    { id: "rowan_jelly_sill", name: "花楸果冻窗台", desc: "发现花楸果冻", check: function (s) {
      return !!(s.discovered && s.discovered.rowan_jelly);
    } },
    { id: "rowan_jelly_walker", name: "花楸果冻径旅人", desc: "走过花楸果冻短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rowan_jelly_path);
    } },
    { id: "quince_paste_sill", name: "榅桲膏窗台", desc: "发现榅桲膏", check: function (s) {
      return !!(s.discovered && s.discovered.quince_paste);
    } },
    { id: "quince_paste_walker", name: "榅桲膏径旅人", desc: "走过榅桲膏短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.quince_paste_path);
    } },
    { id: "bergamot_fresh_sill", name: "鲜佛手柑窗台", desc: "发现鲜佛手柑", check: function (s) {
      return !!(s.discovered && s.discovered.bergamot_fresh);
    } },
    { id: "bergamot_fresh_walker", name: "鲜佛手柑径旅人", desc: "走过鲜佛手柑短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bergamot_fresh_path);
    } },
    { id: "yuzu_fresh_sill", name: "鲜柚子窗台", desc: "发现鲜柚子", check: function (s) {
      return !!(s.discovered && s.discovered.yuzu_fresh);
    } },
    { id: "yuzu_fresh_walker", name: "鲜柚子径旅人", desc: "走过鲜柚子短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yuzu_fresh_path);
    } },
    { id: "sudachi_sill", name: "酢橘窗台", desc: "发现酢橘", check: function (s) {
      return !!(s.discovered && s.discovered.sudachi);
    } },
    { id: "sudachi_walker", name: "酢橘径旅人", desc: "走过酢橘短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sudachi_path);
    } },
    { id: "kabosu_sill", name: "香酸柑窗台", desc: "发现香酸柑", check: function (s) {
      return !!(s.discovered && s.discovered.kabosu);
    } },
    { id: "kabosu_walker", name: "香酸柑径旅人", desc: "走过香酸柑短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.kabosu_path);
    } },
    { id: "ponkan_sill", name: "椪柑窗台", desc: "发现椪柑", check: function (s) {
      return !!(s.discovered && s.discovered.ponkan);
    } },
    { id: "ponkan_walker", name: "椪柑径旅人", desc: "走过椪柑短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ponkan_path);
    } },
    { id: "dekopon_sill", name: "不知火窗台", desc: "发现不知火", check: function (s) {
      return !!(s.discovered && s.discovered.dekopon);
    } },
    { id: "dekopon_walker", name: "不知火径旅人", desc: "走过不知火短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dekopon_path);
    } },
    { id: "hassaku_sill", name: "八朔窗台", desc: "发现八朔", check: function (s) {
      return !!(s.discovered && s.discovered.hassaku);
    } },
    { id: "hassaku_walker", name: "八朔径旅人", desc: "走过八朔短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hassaku_path);
    } },
    { id: "amanatsu_sill", name: "甘夏窗台", desc: "发现甘夏", check: function (s) {
      return !!(s.discovered && s.discovered.amanatsu);
    } },
    { id: "amanatsu_walker", name: "甘夏径旅人", desc: "走过甘夏短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.amanatsu_path);
    } },
    { id: "shiso_green_sill", name: "青紫苏窗台", desc: "发现青紫苏", check: function (s) {
      return !!(s.discovered && s.discovered.shiso_green);
    } },
    { id: "shiso_green_walker", name: "青紫苏径旅人", desc: "走过青紫苏短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.shiso_green_path);
    } },
    { id: "shiso_red_sill", name: "赤紫苏窗台", desc: "发现赤紫苏", check: function (s) {
      return !!(s.discovered && s.discovered.shiso_red);
    } },
    { id: "shiso_red_walker", name: "赤紫苏径旅人", desc: "走过赤紫苏短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.shiso_red_path);
    } },
    { id: "mitsuba_sill", name: "三叶窗台", desc: "发现三叶", check: function (s) {
      return !!(s.discovered && s.discovered.mitsuba);
    } },
    { id: "mitsuba_walker", name: "三叶径旅人", desc: "走过三叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mitsuba_path);
    } },
    { id: "myoga_sill", name: "茗荷窗台", desc: "发现茗荷", check: function (s) {
      return !!(s.discovered && s.discovered.myoga);
    } },
    { id: "myoga_walker", name: "茗荷径旅人", desc: "走过茗荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.myoga_path);
    } },
    { id: "wasabi_leaf_sill", name: "山葵叶窗台", desc: "发现山葵叶", check: function (s) {
      return !!(s.discovered && s.discovered.wasabi_leaf);
    } },
    { id: "wasabi_leaf_walker", name: "山葵叶径旅人", desc: "走过山葵叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wasabi_leaf_path);
    } },
    { id: "sansho_sill", name: "山椒窗台", desc: "发现山椒", check: function (s) {
      return !!(s.discovered && s.discovered.sansho);
    } },
    { id: "sansho_walker", name: "山椒径旅人", desc: "走过山椒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sansho_path);
    } },
    { id: "kinome_sill", name: "木芽窗台", desc: "发现木芽", check: function (s) {
      return !!(s.discovered && s.discovered.kinome);
    } },
    { id: "kinome_walker", name: "木芽径旅人", desc: "走过木芽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.kinome_path);
    } },
    { id: "yuzu_kosho_sill", name: "柚子胡椒窗台", desc: "发现柚子胡椒", check: function (s) {
      return !!(s.discovered && s.discovered.yuzu_kosho);
    } },
    { id: "yuzu_kosho_walker", name: "柚子胡椒径旅人", desc: "走过柚子胡椒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yuzu_kosho_path);
    } },
    { id: "edelweiss_sill", name: "雪绒花窗台", desc: "发现雪绒花", check: function (s) {
      return !!(s.discovered && s.discovered.edelweiss);
    } },
    { id: "edelweiss_walker", name: "雪绒花径旅人", desc: "走过雪绒花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.edelweiss_path);
    } },
    { id: "gentian_sill", name: "龙胆窗台", desc: "发现龙胆", check: function (s) {
      return !!(s.discovered && s.discovered.gentian);
    } },
    { id: "gentian_walker", name: "龙胆径旅人", desc: "走过龙胆短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.gentian_path);
    } },
    { id: "arnica_montana_sill", name: "山地金车窗台", desc: "发现山地金车", check: function (s) {
      return !!(s.discovered && s.discovered.arnica_montana);
    } },
    { id: "arnica_montana_walker", name: "山地金车径旅人", desc: "走过山地金车径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.arnica_montana_path);
    } },
    { id: "alpine_strawberry_sill", name: "野草莓窗台", desc: "发现野草莓", check: function (s) {
      return !!(s.discovered && s.discovered.alpine_strawberry);
    } },
    { id: "alpine_strawberry_walker", name: "野草莓径旅人", desc: "走过野草莓短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.alpine_strawberry_path);
    } },
    { id: "bilberry_leaf_sill", name: "越橘叶窗台", desc: "发现越橘叶", check: function (s) {
      return !!(s.discovered && s.discovered.bilberry_leaf);
    } },
    { id: "bilberry_leaf_walker", name: "越橘叶径旅人", desc: "走过越橘叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bilberry_leaf_path);
    } },
    { id: "juniper_berry_sill", name: "杜松果窗台", desc: "发现杜松果", check: function (s) {
      return !!(s.discovered && s.discovered.juniper_berry);
    } },
    { id: "juniper_berry_walker", name: "杜松果径旅人", desc: "走过杜松果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.juniper_berry_path);
    } },
    { id: "fir_needle_sill", name: "冷杉针窗台", desc: "发现冷杉针", check: function (s) {
      return !!(s.discovered && s.discovered.fir_needle);
    } },
    { id: "fir_needle_walker", name: "冷杉针径旅人", desc: "走过冷杉针短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fir_needle_path);
    } },
    { id: "spruce_tip_sill", name: "云杉芽窗台", desc: "发现云杉芽", check: function (s) {
      return !!(s.discovered && s.discovered.spruce_tip);
    } },
    { id: "spruce_tip_walker", name: "云杉芽径旅人", desc: "走过云杉芽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.spruce_tip_path);
    } },
    { id: "olive_leaf_sill", name: "橄榄叶窗台", desc: "发现橄榄叶", check: function (s) {
      return !!(s.discovered && s.discovered.olive_leaf);
    } },
    { id: "olive_leaf_walker", name: "橄榄叶径旅人", desc: "走过橄榄叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.olive_leaf_path);
    } },
    { id: "myrtle_berry_sill", name: "香桃木果窗台", desc: "发现香桃木果", check: function (s) {
      return !!(s.discovered && s.discovered.myrtle_berry);
    } },
    { id: "myrtle_berry_walker", name: "香桃木果径旅人", desc: "走过香桃木果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.myrtle_berry_path);
    } },
    { id: "mastic_sill", name: "乳香黄连木窗台", desc: "发现乳香黄连木", check: function (s) {
      return !!(s.discovered && s.discovered.mastic);
    } },
    { id: "mastic_walker", name: "乳香黄连木径旅人", desc: "走过乳香黄连木径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mastic_path);
    } },
    { id: "caper_sill", name: "续随子花蕾窗台", desc: "发现续随子花蕾", check: function (s) {
      return !!(s.discovered && s.discovered.caper);
    } },
    { id: "caper_walker", name: "续随子花蕾径旅人", desc: "走过续随子花蕾径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.caper_path);
    } },
    { id: "zaatar_sill", name: "扎塔香草窗台", desc: "发现扎塔香草", check: function (s) {
      return !!(s.discovered && s.discovered.zaatar);
    } },
    { id: "zaatar_walker", name: "扎塔香草径旅人", desc: "走过扎塔香草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.zaatar_path);
    } },
    { id: "sumac_berry_sill", name: "盐肤木果窗台", desc: "发现盐肤木果", check: function (s) {
      return !!(s.discovered && s.discovered.sumac_berry);
    } },
    { id: "sumac_berry_walker", name: "盐肤木果径旅人", desc: "走过盐肤木果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sumac_berry_path);
    } },
    { id: "saffron_crocus_sill", name: "番红花窗台", desc: "发现番红花", check: function (s) {
      return !!(s.discovered && s.discovered.saffron_crocus);
    } },
    { id: "saffron_crocus_walker", name: "番红花径旅人", desc: "走过番红花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.saffron_crocus_path);
    } },
    { id: "orange_blossom_sill", name: "橙花窗台", desc: "发现橙花", check: function (s) {
      return !!(s.discovered && s.discovered.orange_blossom);
    } },
    { id: "orange_blossom_walker", name: "橙花径旅人", desc: "走过橙花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.orange_blossom_path);
    } },
    { id: "lavender_honey_sill", name: "薰衣草蜜窗台", desc: "发现薰衣草蜜", check: function (s) {
      return !!(s.discovered && s.discovered.lavender_honey);
    } },
    { id: "lavender_honey_walker", name: "薰衣草蜜径旅人", desc: "走过薰衣草蜜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lavender_honey_path);
    } },
    { id: "thyme_honey_sill", name: "百里香蜜窗台", desc: "发现百里香蜜", check: function (s) {
      return !!(s.discovered && s.discovered.thyme_honey);
    } },
    { id: "thyme_honey_walker", name: "百里香蜜径旅人", desc: "走过百里香蜜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.thyme_honey_path);
    } },
    { id: "acacia_honey_sill", name: "洋槐蜜窗台", desc: "发现洋槐蜜", check: function (s) {
      return !!(s.discovered && s.discovered.acacia_honey);
    } },
    { id: "acacia_honey_walker", name: "洋槐蜜径旅人", desc: "走过洋槐蜜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.acacia_honey_path);
    } },
    { id: "buckwheat_honey_sill", name: "荞麦蜜窗台", desc: "发现荞麦蜜", check: function (s) {
      return !!(s.discovered && s.discovered.buckwheat_honey);
    } },
    { id: "buckwheat_honey_walker", name: "荞麦蜜径旅人", desc: "走过荞麦蜜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.buckwheat_honey_path);
    } },
    { id: "chestnut_honey_sill", name: "板栗蜜窗台", desc: "发现板栗蜜", check: function (s) {
      return !!(s.discovered && s.discovered.chestnut_honey);
    } },
    { id: "chestnut_honey_walker", name: "板栗蜜径旅人", desc: "走过板栗蜜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chestnut_honey_path);
    } },
    { id: "manuka_sill", name: "麦卢卡窗台", desc: "发现麦卢卡", check: function (s) {
      return !!(s.discovered && s.discovered.manuka);
    } },
    { id: "manuka_walker", name: "麦卢卡径旅人", desc: "走过麦卢卡短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.manuka_path);
    } },
    { id: "propolis_sill", name: "蜂胶窗台", desc: "发现蜂胶", check: function (s) {
      return !!(s.discovered && s.discovered.propolis);
    } },
    { id: "propolis_walker", name: "蜂胶径旅人", desc: "走过蜂胶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.propolis_path);
    } },
    { id: "bee_pollen_sill", name: "蜂花粉窗台", desc: "发现蜂花粉", check: function (s) {
      return !!(s.discovered && s.discovered.bee_pollen);
    } },
    { id: "bee_pollen_walker", name: "蜂花粉径旅人", desc: "走过蜂花粉短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bee_pollen_path);
    } },
    { id: "royal_jelly_sill", name: "蜂王浆窗台", desc: "发现蜂王浆", check: function (s) {
      return !!(s.discovered && s.discovered.royal_jelly);
    } },
    { id: "royal_jelly_walker", name: "蜂王浆径旅人", desc: "走过蜂王浆短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.royal_jelly_path);
    } },
    { id: "comb_honey_sill", name: "巢蜜窗台", desc: "发现巢蜜", check: function (s) {
      return !!(s.discovered && s.discovered.comb_honey);
    } },
    { id: "comb_honey_walker", name: "巢蜜径旅人", desc: "走过巢蜜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.comb_honey_path);
    } },
    { id: "mead_herb_sill", name: "蜜酒香草窗台", desc: "发现蜜酒香草", check: function (s) {
      return !!(s.discovered && s.discovered.mead_herb);
    } },
    { id: "mead_herb_walker", name: "蜜酒香草径旅人", desc: "走过蜜酒香草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mead_herb_path);
    } },
    { id: "linden_honey_sill", name: "椴树蜜窗台", desc: "发现椴树蜜", check: function (s) {
      return !!(s.discovered && s.discovered.linden_honey);
    } },
    { id: "linden_honey_walker", name: "椴树蜜径旅人", desc: "走过椴树蜜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.linden_honey_path);
    } },
    { id: "heather_honey_wild_sill", name: "石楠野蜜窗台", desc: "发现石楠野蜜", check: function (s) {
      return !!(s.discovered && s.discovered.heather_honey_wild);
    } },
    { id: "heather_honey_wild_walker", name: "石楠野蜜径旅人", desc: "走过石楠野蜜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.heather_honey_wild_path);
    } },
    { id: "wildflower_honey_sill", name: "野花蜜窗台", desc: "发现野花蜜", check: function (s) {
      return !!(s.discovered && s.discovered.wildflower_honey);
    } },
    { id: "wildflower_honey_walker", name: "野花蜜径旅人", desc: "走过野花蜜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wildflower_honey_path);
    } },
    { id: "clover_honey_sill", name: "车轴草蜜窗台", desc: "发现车轴草蜜", check: function (s) {
      return !!(s.discovered && s.discovered.clover_honey);
    } },
    { id: "clover_honey_walker", name: "车轴草蜜径旅人", desc: "走过车轴草蜜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.clover_honey_path);
    } },
    { id: "eucalyptus_honey_sill", name: "桉树蜜窗台", desc: "发现桉树蜜", check: function (s) {
      return !!(s.discovered && s.discovered.eucalyptus_honey);
    } },
    { id: "eucalyptus_honey_walker", name: "桉树蜜径旅人", desc: "走过桉树蜜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.eucalyptus_honey_path);
    } },
    { id: "cacao_nibs_sill", name: "可可碎窗台", desc: "发现可可碎", check: function (s) {
      return !!(s.discovered && s.discovered.cacao_nibs);
    } },
    { id: "cacao_nibs_walker", name: "可可碎径旅人", desc: "走过可可碎短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cacao_nibs_path);
    } },
    { id: "cacao_husk_sill", name: "可可壳窗台", desc: "发现可可壳", check: function (s) {
      return !!(s.discovered && s.discovered.cacao_husk);
    } },
    { id: "cacao_husk_walker", name: "可可壳径旅人", desc: "走过可可壳短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cacao_husk_path);
    } },
    { id: "carob_sill", name: "角豆窗台", desc: "发现角豆", check: function (s) {
      return !!(s.discovered && s.discovered.carob);
    } },
    { id: "carob_walker", name: "角豆径旅人", desc: "走过角豆短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.carob_path);
    } },
    { id: "mesquite_sill", name: "牧豆窗台", desc: "发现牧豆", check: function (s) {
      return !!(s.discovered && s.discovered.mesquite);
    } },
    { id: "mesquite_walker", name: "牧豆径旅人", desc: "走过牧豆短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mesquite_path);
    } },
    { id: "lucuma_sill", name: "蛋黄果粉窗台", desc: "发现蛋黄果粉", check: function (s) {
      return !!(s.discovered && s.discovered.lucuma);
    } },
    { id: "lucuma_walker", name: "蛋黄果粉径旅人", desc: "走过蛋黄果粉短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lucuma_path);
    } },
    { id: "maca_sill", name: "玛卡窗台", desc: "发现玛卡", check: function (s) {
      return !!(s.discovered && s.discovered.maca);
    } },
    { id: "maca_walker", name: "玛卡径旅人", desc: "走过玛卡短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.maca_path);
    } },
    { id: "camu_camu_sill", name: "卡姆果窗台", desc: "发现卡姆果", check: function (s) {
      return !!(s.discovered && s.discovered.camu_camu);
    } },
    { id: "camu_camu_walker", name: "卡姆果径旅人", desc: "走过卡姆果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.camu_camu_path);
    } },
    { id: "acai_sill", name: "阿萨伊窗台", desc: "发现阿萨伊", check: function (s) {
      return !!(s.discovered && s.discovered.acai);
    } },
    { id: "acai_walker", name: "阿萨伊径旅人", desc: "走过阿萨伊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.acai_path);
    } },
    { id: "maqui_sill", name: "智利酒果窗台", desc: "发现智利酒果", check: function (s) {
      return !!(s.discovered && s.discovered.maqui);
    } },
    { id: "maqui_walker", name: "智利酒果径旅人", desc: "走过智利酒果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.maqui_path);
    } },
    { id: "goji_fresh_sill", name: "鲜枸杞窗台", desc: "发现鲜枸杞", check: function (s) {
      return !!(s.discovered && s.discovered.goji_fresh);
    } },
    { id: "goji_fresh_walker", name: "鲜枸杞径旅人", desc: "走过鲜枸杞短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.goji_fresh_path);
    } },
    { id: "schisandra_sill", name: "五味子窗台", desc: "发现五味子", check: function (s) {
      return !!(s.discovered && s.discovered.schisandra);
    } },
    { id: "schisandra_walker", name: "五味子径旅人", desc: "走过五味子短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.schisandra_path);
    } },
    { id: "amla_sill", name: "余甘子窗台", desc: "发现余甘子", check: function (s) {
      return !!(s.discovered && s.discovered.amla);
    } },
    { id: "amla_walker", name: "余甘子径旅人", desc: "走过余甘子短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.amla_path);
    } },
    { id: "baobab_sill", name: "猴面包果窗台", desc: "发现猴面包果", check: function (s) {
      return !!(s.discovered && s.discovered.baobab);
    } },
    { id: "baobab_walker", name: "猴面包果径旅人", desc: "走过猴面包果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.baobab_path);
    } },
    { id: "morinda_sill", name: "诺丽窗台", desc: "发现诺丽", check: function (s) {
      return !!(s.discovered && s.discovered.morinda);
    } },
    { id: "morinda_walker", name: "诺丽径旅人", desc: "走过诺丽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.morinda_path);
    } },
    { id: "noni_sill", name: "海巴戟窗台", desc: "发现海巴戟", check: function (s) {
      return !!(s.discovered && s.discovered.noni);
    } },
    { id: "noni_walker", name: "海巴戟径旅人", desc: "走过海巴戟短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.noni_path);
    } },
    { id: "cupuacu_sill", name: "古布阿苏窗台", desc: "发现古布阿苏", check: function (s) {
      return !!(s.discovered && s.discovered.cupuacu);
    } },
    { id: "cupuacu_walker", name: "古布阿苏径旅人", desc: "走过古布阿苏短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cupuacu_path);
    } },
    { id: "matcha_ceremonial_sill", name: "抹茶礼窗台", desc: "发现抹茶礼", check: function (s) {
      return !!(s.discovered && s.discovered.matcha_ceremonial);
    } },
    { id: "matcha_ceremonial_walker", name: "抹茶礼径旅人", desc: "走过抹茶礼短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.matcha_ceremonial_path);
    } },
    { id: "hojicha_sill", name: "焙茶窗台", desc: "发现焙茶", check: function (s) {
      return !!(s.discovered && s.discovered.hojicha);
    } },
    { id: "hojicha_walker", name: "焙茶径旅人", desc: "走过焙茶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hojicha_path);
    } },
    { id: "genmaicha_sill", name: "玄米茶窗台", desc: "发现玄米茶", check: function (s) {
      return !!(s.discovered && s.discovered.genmaicha);
    } },
    { id: "genmaicha_walker", name: "玄米茶径旅人", desc: "走过玄米茶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.genmaicha_path);
    } },
    { id: "sencha_sill", name: "煎茶窗台", desc: "发现煎茶", check: function (s) {
      return !!(s.discovered && s.discovered.sencha);
    } },
    { id: "sencha_walker", name: "煎茶径旅人", desc: "走过煎茶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sencha_path);
    } },
    { id: "gyokuro_sill", name: "玉露窗台", desc: "发现玉露", check: function (s) {
      return !!(s.discovered && s.discovered.gyokuro);
    } },
    { id: "gyokuro_walker", name: "玉露径旅人", desc: "走过玉露短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.gyokuro_path);
    } },
    { id: "bancha_sill", name: "番茶窗台", desc: "发现番茶", check: function (s) {
      return !!(s.discovered && s.discovered.bancha);
    } },
    { id: "bancha_walker", name: "番茶径旅人", desc: "走过番茶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bancha_path);
    } },
    { id: "kukicha_sill", name: "茎茶窗台", desc: "发现茎茶", check: function (s) {
      return !!(s.discovered && s.discovered.kukicha);
    } },
    { id: "kukicha_walker", name: "茎茶径旅人", desc: "走过茎茶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.kukicha_path);
    } },
    { id: "mugicha_sill", name: "麦茶窗台", desc: "发现麦茶", check: function (s) {
      return !!(s.discovered && s.discovered.mugicha);
    } },
    { id: "mugicha_walker", name: "麦茶径旅人", desc: "走过麦茶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mugicha_path);
    } },
    { id: "sobacha_sill", name: "荞麦茶窗台", desc: "发现荞麦茶", check: function (s) {
      return !!(s.discovered && s.discovered.sobacha);
    } },
    { id: "sobacha_walker", name: "荞麦茶径旅人", desc: "走过荞麦茶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sobacha_path);
    } },
    { id: "job_tears_sill", name: "薏米茶窗台", desc: "发现薏米茶", check: function (s) {
      return !!(s.discovered && s.discovered.job_tears);
    } },
    { id: "job_tears_walker", name: "薏米茶径旅人", desc: "走过薏米茶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.job_tears_path);
    } },
    { id: "barley_grass_sill", name: "大麦若叶窗台", desc: "发现大麦若叶", check: function (s) {
      return !!(s.discovered && s.discovered.barley_grass);
    } },
    { id: "barley_grass_walker", name: "大麦若叶径旅人", desc: "走过大麦若叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.barley_grass_path);
    } },
    { id: "wheatgrass_sill", name: "小麦草窗台", desc: "发现小麦草", check: function (s) {
      return !!(s.discovered && s.discovered.wheatgrass);
    } },
    { id: "wheatgrass_walker", name: "小麦草径旅人", desc: "走过小麦草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wheatgrass_path);
    } },
    { id: "spirulina_sill", name: "螺旋藻窗台", desc: "发现螺旋藻", check: function (s) {
      return !!(s.discovered && s.discovered.spirulina);
    } },
    { id: "spirulina_walker", name: "螺旋藻径旅人", desc: "走过螺旋藻短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.spirulina_path);
    } },
    { id: "chlorella_sill", name: "小球藻窗台", desc: "发现小球藻", check: function (s) {
      return !!(s.discovered && s.discovered.chlorella);
    } },
    { id: "chlorella_walker", name: "小球藻径旅人", desc: "走过小球藻短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chlorella_path);
    } },
    { id: "kelp_sill", name: "海带窗台", desc: "发现海带", check: function (s) {
      return !!(s.discovered && s.discovered.kelp);
    } },
    { id: "kelp_walker", name: "海带径旅人", desc: "走过海带短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.kelp_path);
    } },
    { id: "nori_sill", name: "紫菜窗台", desc: "发现紫菜", check: function (s) {
      return !!(s.discovered && s.discovered.nori);
    } },
    { id: "nori_walker", name: "紫菜径旅人", desc: "走过紫菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.nori_path);
    } },
    { id: "rose_hip_tea_sill", name: "玫瑰果茶窗台", desc: "发现玫瑰果茶", check: function (s) {
      return !!(s.discovered && s.discovered.rose_hip_tea);
    } },
    { id: "rose_hip_tea_walker", name: "玫瑰果茶径旅人", desc: "走过玫瑰果茶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rose_hip_tea_path);
    } },
    { id: "hibiscus_fresh_sill", name: "鲜洛神窗台", desc: "发现鲜洛神", check: function (s) {
      return !!(s.discovered && s.discovered.hibiscus_fresh);
    } },
    { id: "hibiscus_fresh_walker", name: "鲜洛神径旅人", desc: "走过鲜洛神短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hibiscus_fresh_path);
    } },
    { id: "chrysanthemum_fresh_sill", name: "鲜菊花窗台", desc: "发现鲜菊花", check: function (s) {
      return !!(s.discovered && s.discovered.chrysanthemum_fresh);
    } },
    { id: "chrysanthemum_fresh_walker", name: "鲜菊花径旅人", desc: "走过鲜菊花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chrysanthemum_fresh_path);
    } },
    { id: "peony_sill", name: "牡丹窗台", desc: "发现牡丹", check: function (s) {
      return !!(s.discovered && s.discovered.peony);
    } },
    { id: "peony_walker", name: "牡丹径旅人", desc: "走过牡丹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.peony_path);
    } },
    { id: "camellia_fresh_sill", name: "鲜山茶窗台", desc: "发现鲜山茶", check: function (s) {
      return !!(s.discovered && s.discovered.camellia_fresh);
    } },
    { id: "camellia_fresh_walker", name: "鲜山茶径旅人", desc: "走过鲜山茶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.camellia_fresh_path);
    } },
    { id: "lotus_seed_fresh_sill", name: "鲜莲子窗台", desc: "发现鲜莲子", check: function (s) {
      return !!(s.discovered && s.discovered.lotus_seed_fresh);
    } },
    { id: "lotus_seed_fresh_walker", name: "鲜莲子径旅人", desc: "走过鲜莲子短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lotus_seed_fresh_path);
    } },
    { id: "lotus_leaf_fresh_sill", name: "鲜荷叶窗台", desc: "发现鲜荷叶", check: function (s) {
      return !!(s.discovered && s.discovered.lotus_leaf_fresh);
    } },
    { id: "lotus_leaf_fresh_walker", name: "鲜荷叶径旅人", desc: "走过鲜荷叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lotus_leaf_fresh_path);
    } },
    { id: "osmanthus_sugar_sill", name: "桂花糖窗台", desc: "发现桂花糖", check: function (s) {
      return !!(s.discovered && s.discovered.osmanthus_sugar);
    } },
    { id: "osmanthus_sugar_walker", name: "桂花糖径旅人", desc: "走过桂花糖短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.osmanthus_sugar_path);
    } },
    { id: "plum_blossom_sill", name: "梅花窗台", desc: "发现梅花", check: function (s) {
      return !!(s.discovered && s.discovered.plum_blossom);
    } },
    { id: "plum_blossom_walker", name: "梅花径旅人", desc: "走过梅花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.plum_blossom_path);
    } },
    { id: "wintersweet_sill", name: "蜡梅窗台", desc: "发现蜡梅", check: function (s) {
      return !!(s.discovered && s.discovered.wintersweet);
    } },
    { id: "wintersweet_walker", name: "蜡梅径旅人", desc: "走过蜡梅短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wintersweet_path);
    } },
    { id: "orchid_petal_sill", name: "兰花瓣窗台", desc: "发现兰花瓣", check: function (s) {
      return !!(s.discovered && s.discovered.orchid_petal);
    } },
    { id: "orchid_petal_walker", name: "兰花瓣径旅人", desc: "走过兰花瓣短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.orchid_petal_path);
    } },
    { id: "bamboo_leaf_fresh_sill", name: "鲜竹叶窗台", desc: "发现鲜竹叶", check: function (s) {
      return !!(s.discovered && s.discovered.bamboo_leaf_fresh);
    } },
    { id: "bamboo_leaf_fresh_walker", name: "鲜竹叶径旅人", desc: "走过鲜竹叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bamboo_leaf_fresh_path);
    } },
    { id: "bamboo_shoot_fresh_sill", name: "鲜竹笋窗台", desc: "发现鲜竹笋", check: function (s) {
      return !!(s.discovered && s.discovered.bamboo_shoot_fresh);
    } },
    { id: "bamboo_shoot_fresh_walker", name: "鲜竹笋径旅人", desc: "走过鲜竹笋短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bamboo_shoot_fresh_path);
    } },
    { id: "ginkgo_leaf_fresh_sill", name: "鲜银杏叶窗台", desc: "发现鲜银杏叶", check: function (s) {
      return !!(s.discovered && s.discovered.ginkgo_leaf_fresh);
    } },
    { id: "ginkgo_leaf_fresh_walker", name: "鲜银杏叶径旅人", desc: "走过鲜银杏叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ginkgo_leaf_fresh_path);
    } },
    { id: "ginkgo_nut_fresh_sill", name: "鲜白果窗台", desc: "发现鲜白果", check: function (s) {
      return !!(s.discovered && s.discovered.ginkgo_nut_fresh);
    } },
    { id: "ginkgo_nut_fresh_walker", name: "鲜白果径旅人", desc: "走过鲜白果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ginkgo_nut_fresh_path);
    } },
    { id: "osmanthus_wine_sill", name: "桂花酿窗台", desc: "发现桂花酿", check: function (s) {
      return !!(s.discovered && s.discovered.osmanthus_wine);
    } },
    { id: "osmanthus_wine_walker", name: "桂花酿径旅人", desc: "走过桂花酿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.osmanthus_wine_path);
    } },
    { id: "safflower_sill", name: "红花窗台", desc: "发现红花", check: function (s) {
      return !!(s.discovered && s.discovered.safflower);
    } },
    { id: "safflower_walker", name: "红花径旅人", desc: "走过红花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.safflower_path);
    } },
    { id: "calendula_fresh_sill", name: "鲜金盏窗台", desc: "发现鲜金盏", check: function (s) {
      return !!(s.discovered && s.discovered.calendula_fresh);
    } },
    { id: "calendula_fresh_walker", name: "鲜金盏径旅人", desc: "走过鲜金盏短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.calendula_fresh_path);
    } },
    { id: "pot_marigold_sill", name: "金盏菊窗台", desc: "发现金盏菊", check: function (s) {
      return !!(s.discovered && s.discovered.pot_marigold);
    } },
    { id: "pot_marigold_walker", name: "金盏菊径旅人", desc: "走过金盏菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pot_marigold_path);
    } },
    { id: "coreopsis_sill", name: "金鸡菊窗台", desc: "发现金鸡菊", check: function (s) {
      return !!(s.discovered && s.discovered.coreopsis);
    } },
    { id: "coreopsis_walker", name: "金鸡菊径旅人", desc: "走过金鸡菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.coreopsis_path);
    } },
    { id: "cosmos_sill", name: "波斯菊窗台", desc: "发现波斯菊", check: function (s) {
      return !!(s.discovered && s.discovered.cosmos);
    } },
    { id: "cosmos_walker", name: "波斯菊径旅人", desc: "走过波斯菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cosmos_path);
    } },
    { id: "zinnia_sill", name: "百日草窗台", desc: "发现百日草", check: function (s) {
      return !!(s.discovered && s.discovered.zinnia);
    } },
    { id: "zinnia_walker", name: "百日草径旅人", desc: "走过百日草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.zinnia_path);
    } },
    { id: "dahlia_sill", name: "大丽花窗台", desc: "发现大丽花", check: function (s) {
      return !!(s.discovered && s.discovered.dahlia);
    } },
    { id: "dahlia_walker", name: "大丽花径旅人", desc: "走过大丽花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dahlia_path);
    } },
    { id: "gladiolus_sill", name: "剑兰窗台", desc: "发现剑兰", check: function (s) {
      return !!(s.discovered && s.discovered.gladiolus);
    } },
    { id: "gladiolus_walker", name: "剑兰径旅人", desc: "走过剑兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.gladiolus_path);
    } },
    { id: "iris_sill", name: "鸢尾窗台", desc: "发现鸢尾", check: function (s) {
      return !!(s.discovered && s.discovered.iris);
    } },
    { id: "iris_walker", name: "鸢尾径旅人", desc: "走过鸢尾短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.iris_path);
    } },
    { id: "crocus_sill", name: "番红花球窗台", desc: "发现番红花球", check: function (s) {
      return !!(s.discovered && s.discovered.crocus);
    } },
    { id: "crocus_walker", name: "番红花球径旅人", desc: "走过番红花球短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.crocus_path);
    } },
    { id: "snowdrop_sill", name: "雪花莲窗台", desc: "发现雪花莲", check: function (s) {
      return !!(s.discovered && s.discovered.snowdrop);
    } },
    { id: "snowdrop_walker", name: "雪花莲径旅人", desc: "走过雪花莲短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.snowdrop_path);
    } },
    { id: "crocus_yellow_sill", name: "黄番红窗台", desc: "发现黄番红", check: function (s) {
      return !!(s.discovered && s.discovered.crocus_yellow);
    } },
    { id: "crocus_yellow_walker", name: "黄番红径旅人", desc: "走过黄番红短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.crocus_yellow_path);
    } },
    { id: "hyacinth_sill", name: "风信子窗台", desc: "发现风信子", check: function (s) {
      return !!(s.discovered && s.discovered.hyacinth);
    } },
    { id: "hyacinth_walker", name: "风信子径旅人", desc: "走过风信子短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hyacinth_path);
    } },
    { id: "daffodil_sill", name: "水仙窗台", desc: "发现水仙", check: function (s) {
      return !!(s.discovered && s.discovered.daffodil);
    } },
    { id: "daffodil_walker", name: "水仙径旅人", desc: "走过水仙短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.daffodil_path);
    } },
    { id: "tulip_sill", name: "郁金香窗台", desc: "发现郁金香", check: function (s) {
      return !!(s.discovered && s.discovered.tulip);
    } },
    { id: "tulip_walker", name: "郁金香径旅人", desc: "走过郁金香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.tulip_path);
    } },
    { id: "ranunculus_sill", name: "花毛茛窗台", desc: "发现花毛茛", check: function (s) {
      return !!(s.discovered && s.discovered.ranunculus);
    } },
    { id: "ranunculus_walker", name: "花毛茛径旅人", desc: "走过花毛茛短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ranunculus_path);
    } },
    { id: "sweet_pea_sill", name: "香豌豆窗台", desc: "发现香豌豆", check: function (s) {
      return !!(s.discovered && s.discovered.sweet_pea);
    } },
    { id: "sweet_pea_walker", name: "香豌豆径旅人", desc: "走过香豌豆短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sweet_pea_path);
    } },
    { id: "nasturtium_sill", name: "旱金莲窗台", desc: "发现旱金莲", check: function (s) {
      return !!(s.discovered && s.discovered.nasturtium);
    } },
    { id: "nasturtium_walker", name: "旱金莲径旅人", desc: "走过旱金莲短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.nasturtium_path);
    } },
    { id: "morning_glory_sill", name: "牵牛花窗台", desc: "发现牵牛花", check: function (s) {
      return !!(s.discovered && s.discovered.morning_glory);
    } },
    { id: "morning_glory_walker", name: "牵牛花径旅人", desc: "走过牵牛花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.morning_glory_path);
    } },
    { id: "moonflower_sill", name: "月光花窗台", desc: "发现月光花", check: function (s) {
      return !!(s.discovered && s.discovered.moonflower);
    } },
    { id: "moonflower_walker", name: "月光花径旅人", desc: "走过月光花晚径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.moonflower_path);
    } },
    { id: "clematis_sill", name: "铁线莲窗台", desc: "发现铁线莲", check: function (s) {
      return !!(s.discovered && s.discovered.clematis);
    } },
    { id: "clematis_walker", name: "铁线莲径旅人", desc: "走过铁线莲短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.clematis_path);
    } },
    { id: "wisteria_fresh_sill", name: "鲜紫藤窗台", desc: "发现鲜紫藤", check: function (s) {
      return !!(s.discovered && s.discovered.wisteria_fresh);
    } },
    { id: "wisteria_fresh_walker", name: "鲜紫藤径旅人", desc: "走过鲜紫藤短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wisteria_fresh_path);
    } },
    { id: "jasmine_sambac_sill", name: "双瓣茉莉窗台", desc: "发现双瓣茉莉", check: function (s) {
      return !!(s.discovered && s.discovered.jasmine_sambac);
    } },
    { id: "jasmine_sambac_walker", name: "双瓣茉莉径旅人", desc: "走过双瓣茉莉短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.jasmine_sambac_path);
    } },
    { id: "gardenia_tea_sill", name: "栀子花茶窗台", desc: "发现栀子花茶", check: function (s) {
      return !!(s.discovered && s.discovered.gardenia_tea);
    } },
    { id: "gardenia_tea_walker", name: "栀子花茶径旅人", desc: "走过栀子花茶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.gardenia_tea_path);
    } },
    { id: "magnolia_bark_sill", name: "厚朴窗台", desc: "发现厚朴", check: function (s) {
      return !!(s.discovered && s.discovered.magnolia_bark);
    } },
    { id: "magnolia_bark_walker", name: "厚朴径旅人", desc: "走过厚朴短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.magnolia_bark_path);
    } },
    { id: "eucommia_sill", name: "杜仲窗台", desc: "发现杜仲", check: function (s) {
      return !!(s.discovered && s.discovered.eucommia);
    } },
    { id: "eucommia_walker", name: "杜仲径旅人", desc: "走过杜仲短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.eucommia_path);
    } },
    { id: "astragalus_sill", name: "黄芪窗台", desc: "发现黄芪", check: function (s) {
      return !!(s.discovered && s.discovered.astragalus);
    } },
    { id: "astragalus_walker", name: "黄芪径旅人", desc: "走过黄芪短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.astragalus_path);
    } },
    { id: "codonopsis_sill", name: "党参窗台", desc: "发现党参", check: function (s) {
      return !!(s.discovered && s.discovered.codonopsis);
    } },
    { id: "codonopsis_walker", name: "党参径旅人", desc: "走过党参短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.codonopsis_path);
    } },
    { id: "rehmannia_sill", name: "地黄窗台", desc: "发现地黄", check: function (s) {
      return !!(s.discovered && s.discovered.rehmannia);
    } },
    { id: "rehmannia_walker", name: "地黄径旅人", desc: "走过地黄短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rehmannia_path);
    } },
    { id: "polygonatum_sill", name: "玉竹窗台", desc: "发现玉竹", check: function (s) {
      return !!(s.discovered && s.discovered.polygonatum);
    } },
    { id: "polygonatum_walker", name: "玉竹径旅人", desc: "走过玉竹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.polygonatum_path);
    } },
    { id: "ophiopogon_sill", name: "麦冬窗台", desc: "发现麦冬", check: function (s) {
      return !!(s.discovered && s.discovered.ophiopogon);
    } },
    { id: "ophiopogon_walker", name: "麦冬径旅人", desc: "走过麦冬短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ophiopogon_path);
    } },
    { id: "boysenberry_sill", name: "波森莓窗台", desc: "发现波森莓", check: function (s) {
      return !!(s.discovered && s.discovered.boysenberry);
    } },
    { id: "boysenberry_walker", name: "波森莓径旅人", desc: "走过波森莓短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.boysenberry_path);
    } },
    { id: "loganberry_sill", name: "罗甘莓窗台", desc: "发现罗甘莓", check: function (s) {
      return !!(s.discovered && s.discovered.loganberry);
    } },
    { id: "loganberry_walker", name: "罗甘莓径旅人", desc: "走过罗甘莓短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.loganberry_path);
    } },
    { id: "tayberry_sill", name: "泰莓窗台", desc: "发现泰莓", check: function (s) {
      return !!(s.discovered && s.discovered.tayberry);
    } },
    { id: "tayberry_walker", name: "泰莓径旅人", desc: "走过泰莓短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.tayberry_path);
    } },
    { id: "marionberry_sill", name: "马里恩莓窗台", desc: "发现马里恩莓", check: function (s) {
      return !!(s.discovered && s.discovered.marionberry);
    } },
    { id: "marionberry_walker", name: "马里恩莓径旅人", desc: "走过马里恩莓短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.marionberry_path);
    } },
    { id: "wineberry_sill", name: "酒莓窗台", desc: "发现酒莓", check: function (s) {
      return !!(s.discovered && s.discovered.wineberry);
    } },
    { id: "wineberry_walker", name: "酒莓径旅人", desc: "走过酒莓短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wineberry_path);
    } },
    { id: "salmonberry_sill", name: "鲑莓窗台", desc: "发现鲑莓", check: function (s) {
      return !!(s.discovered && s.discovered.salmonberry);
    } },
    { id: "salmonberry_walker", name: "鲑莓径旅人", desc: "走过鲑莓短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.salmonberry_path);
    } },
    { id: "thimbleberry_sill", name: "糙莓窗台", desc: "发现糙莓", check: function (s) {
      return !!(s.discovered && s.discovered.thimbleberry);
    } },
    { id: "thimbleberry_walker", name: "糙莓径旅人", desc: "走过糙莓短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.thimbleberry_path);
    } },
    { id: "cloudberry_leaf_sill", name: "云莓叶窗台", desc: "发现云莓叶", check: function (s) {
      return !!(s.discovered && s.discovered.cloudberry_leaf);
    } },
    { id: "cloudberry_leaf_walker", name: "云莓叶径旅人", desc: "走过云莓叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cloudberry_leaf_path);
    } },
    { id: "angelica_arch_sill", name: "欧当归窗台", desc: "发现欧当归", check: function (s) {
      return !!(s.discovered && s.discovered.angelica_arch);
    } },
    { id: "angelica_arch_walker", name: "欧当归径旅人", desc: "走过欧当归短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.angelica_arch_path);
    } },
    { id: "lovage_fresh_sill", name: "鲜独活窗台", desc: "发现鲜独活", check: function (s) {
      return !!(s.discovered && s.discovered.lovage_fresh);
    } },
    { id: "lovage_fresh_walker", name: "鲜独活径旅人", desc: "走过鲜独活短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lovage_fresh_path);
    } },
    { id: "sweet_cicely_sill", name: "欧洲没药窗台", desc: "发现欧洲没药", check: function (s) {
      return !!(s.discovered && s.discovered.sweet_cicely);
    } },
    { id: "sweet_cicely_walker", name: "欧洲没药径旅人", desc: "走过欧洲没药短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sweet_cicely_path);
    } },
    { id: "wood_avense_sill", name: "水杨梅根窗台", desc: "发现水杨梅根", check: function (s) {
      return !!(s.discovered && s.discovered.wood_avense);
    } },
    { id: "wood_avense_walker", name: "水杨梅根径旅人", desc: "走过水杨梅根短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wood_avense_path);
    } },
    { id: "ramsons_flower_sill", name: "熊葱花窗台", desc: "发现熊葱花", check: function (s) {
      return !!(s.discovered && s.discovered.ramsons_flower);
    } },
    { id: "ramsons_flower_walker", name: "熊葱花径旅人", desc: "走过熊葱花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ramsons_flower_path);
    } },
    { id: "sea_kale_sill", name: "海甘蓝窗台", desc: "发现海甘蓝", check: function (s) {
      return !!(s.discovered && s.discovered.sea_kale);
    } },
    { id: "sea_kale_walker", name: "海甘蓝径旅人", desc: "走过海甘蓝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sea_kale_path);
    } },
    { id: "scurvygrass_sill", name: "坏血病草窗台", desc: "发现坏血病草", check: function (s) {
      return !!(s.discovered && s.discovered.scurvygrass);
    } },
    { id: "scurvygrass_walker", name: "坏血病草径旅人", desc: "走过坏血病草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.scurvygrass_path);
    } },
    { id: "marsh_samphire_sill", name: "海蓬子窗台", desc: "发现海蓬子", check: function (s) {
      return !!(s.discovered && s.discovered.marsh_samphire);
    } },
    { id: "marsh_samphire_walker", name: "海蓬子径旅人", desc: "走过海蓬子短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.marsh_samphire_path);
    } },
    { id: "agave_nectar_sill", name: "龙舌兰蜜窗台", desc: "发现龙舌兰蜜", check: function (s) {
      return !!(s.discovered && s.discovered.agave_nectar);
    } },
    { id: "agave_nectar_walker", name: "龙舌兰蜜径旅人", desc: "走过龙舌兰蜜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.agave_nectar_path);
    } },
    { id: "prickly_pear_pad_sill", name: "仙人掌叶窗台", desc: "发现仙人掌叶", check: function (s) {
      return !!(s.discovered && s.discovered.prickly_pear_pad);
    } },
    { id: "prickly_pear_pad_walker", name: "仙人掌叶径旅人", desc: "走过仙人掌叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.prickly_pear_pad_path);
    } },
    { id: "jojoba_sill", name: "霍霍巴窗台", desc: "发现霍霍巴", check: function (s) {
      return !!(s.discovered && s.discovered.jojoba);
    } },
    { id: "jojoba_walker", name: "霍霍巴径旅人", desc: "走过霍霍巴短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.jojoba_path);
    } },
    { id: "mesquite_pod_sill", name: "牧豆荚窗台", desc: "发现牧豆荚", check: function (s) {
      return !!(s.discovered && s.discovered.mesquite_pod);
    } },
    { id: "mesquite_pod_walker", name: "牧豆荚径旅人", desc: "走过牧豆荚短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mesquite_pod_path);
    } },
    { id: "creosote_sill", name: "三齿拉瑞阿窗台", desc: "发现三齿拉瑞阿", check: function (s) {
      return !!(s.discovered && s.discovered.creosote);
    } },
    { id: "creosote_walker", name: "三齿拉瑞阿径旅人", desc: "走过三齿拉瑞阿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.creosote_path);
    } },
    { id: "desert_sage_sill", name: "沙漠鼠尾草窗台", desc: "发现沙漠鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.desert_sage);
    } },
    { id: "desert_sage_walker", name: "沙漠鼠尾草径旅人", desc: "走过沙漠鼠尾草径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.desert_sage_path);
    } },
    { id: "ephedra_sill", name: "麻黄窗台", desc: "发现麻黄", check: function (s) {
      return !!(s.discovered && s.discovered.ephedra);
    } },
    { id: "ephedra_walker", name: "麻黄径旅人", desc: "走过麻黄短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ephedra_path);
    } },
    { id: "yucca_flower_sill", name: "丝兰花窗台", desc: "发现丝兰花", check: function (s) {
      return !!(s.discovered && s.discovered.yucca_flower);
    } },
    { id: "yucca_flower_walker", name: "丝兰花径旅人", desc: "走过丝兰花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yucca_flower_path);
    } },
    { id: "yerba_santa_sill", name: "圣草窗台", desc: "发现圣草", check: function (s) {
      return !!(s.discovered && s.discovered.yerba_santa);
    } },
    { id: "yerba_santa_walker", name: "圣草径旅人", desc: "走过圣草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yerba_santa_path);
    } },
    { id: "boldo_sill", name: "波尔多叶窗台", desc: "发现波尔多叶", check: function (s) {
      return !!(s.discovered && s.discovered.boldo);
    } },
    { id: "boldo_walker", name: "波尔多叶径旅人", desc: "走过波尔多叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.boldo_path);
    } },
    { id: "cedron_sill", name: "南美柠檬马鞭草窗台", desc: "发现南美柠檬马鞭草", check: function (s) {
      return !!(s.discovered && s.discovered.cedron);
    } },
    { id: "cedron_walker", name: "南美柠檬马鞭草径旅人", desc: "走过南美柠檬马鞭草径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cedron_path);
    } },
    { id: "muña_sill", name: "木纳草窗台", desc: "发现木纳草", check: function (s) {
      return !!(s.discovered && s.discovered.muña);
    } },
    { id: "muña_walker", name: "木纳草径旅人", desc: "走过木纳草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.muna_path);
    } },
    { id: "coca_leaf_tea_sill", name: "古柯叶茶窗台", desc: "发现古柯叶茶", check: function (s) {
      return !!(s.discovered && s.discovered.coca_leaf_tea);
    } },
    { id: "coca_leaf_tea_walker", name: "古柯叶茶径旅人", desc: "走过古柯叶茶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.coca_leaf_tea_path);
    } },
    { id: "guarana_sill", name: "瓜拉纳窗台", desc: "发现瓜拉纳", check: function (s) {
      return !!(s.discovered && s.discovered.guarana);
    } },
    { id: "guarana_walker", name: "瓜拉纳径旅人", desc: "走过瓜拉纳短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.guarana_path);
    } },
    { id: "cupuacu_butter_sill", name: "古布阿苏脂窗台", desc: "发现古布阿苏脂", check: function (s) {
      return !!(s.discovered && s.discovered.cupuacu_butter);
    } },
    { id: "cupuacu_butter_walker", name: "古布阿苏脂径旅人", desc: "走过古布阿苏脂短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cupuacu_butter_path);
    } },
    { id: "stevia_leaf_sill", name: "甜叶菊窗台", desc: "发现甜叶菊", check: function (s) {
      return !!(s.discovered && s.discovered.stevia_leaf);
    } },
    { id: "stevia_leaf_walker", name: "甜叶菊径旅人", desc: "走过甜叶菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.stevia_leaf_path);
    } },
    { id: "rooibos_green_sill", name: "绿路易波士窗台", desc: "发现绿路易波士", check: function (s) {
      return !!(s.discovered && s.discovered.rooibos_green);
    } },
    { id: "rooibos_green_walker", name: "绿路易波士径旅人", desc: "走过绿路易波士短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rooibos_green_path);
    } },
    { id: "honeybush_fresh_sill", name: "鲜蜜树窗台", desc: "发现鲜蜜树", check: function (s) {
      return !!(s.discovered && s.discovered.honeybush_fresh);
    } },
    { id: "honeybush_fresh_walker", name: "鲜蜜树径旅人", desc: "走过鲜蜜树短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.honeybush_fresh_path);
    } },
    { id: "buchu_sill", name: "布枯窗台", desc: "发现布枯", check: function (s) {
      return !!(s.discovered && s.discovered.buchu);
    } },
    { id: "buchu_walker", name: "布枯径旅人", desc: "走过布枯短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.buchu_path);
    } },
    { id: "sutherlandia_sill", name: "南非政府草窗台", desc: "发现南非政府草", check: function (s) {
      return !!(s.discovered && s.discovered.sutherlandia);
    } },
    { id: "sutherlandia_walker", name: "南非政府草径旅人", desc: "走过南非政府草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sutherlandia_path);
    } },
    { id: "baobab_leaf_sill", name: "猴面包叶窗台", desc: "发现猴面包叶", check: function (s) {
      return !!(s.discovered && s.discovered.baobab_leaf);
    } },
    { id: "baobab_leaf_walker", name: "猴面包叶径旅人", desc: "走过猴面包叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.baobab_leaf_path);
    } },
    { id: "marula_sill", name: "马鲁拉窗台", desc: "发现马鲁拉", check: function (s) {
      return !!(s.discovered && s.discovered.marula);
    } },
    { id: "marula_walker", name: "马鲁拉径旅人", desc: "走过马鲁拉短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.marula_path);
    } },
    { id: "kinkeliba_sill", name: "金凯利巴窗台", desc: "发现金凯利巴", check: function (s) {
      return !!(s.discovered && s.discovered.kinkeliba);
    } },
    { id: "kinkeliba_walker", name: "金凯利巴径旅人", desc: "走过金凯利巴短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.kinkeliba_path);
    } },
    { id: "hibiscus_sab_sill", name: "玫瑰茄窗台", desc: "发现玫瑰茄", check: function (s) {
      return !!(s.discovered && s.discovered.hibiscus_sab);
    } },
    { id: "hibiscus_sab_walker", name: "玫瑰茄径旅人", desc: "走过玫瑰茄短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hibiscus_sab_path);
    } },
    { id: "pandan_fresh_sill", name: "鲜班兰窗台", desc: "发现鲜班兰", check: function (s) {
      return !!(s.discovered && s.discovered.pandan_fresh);
    } },
    { id: "pandan_fresh_walker", name: "鲜班兰径旅人", desc: "走过鲜班兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pandan_fresh_path);
    } },
    { id: "lemongrass_fresh_sill", name: "鲜香茅窗台", desc: "发现鲜香茅", check: function (s) {
      return !!(s.discovered && s.discovered.lemongrass_fresh);
    } },
    { id: "lemongrass_fresh_walker", name: "鲜香茅径旅人", desc: "走过鲜香茅短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lemongrass_fresh_path);
    } },
    { id: "galangal_leaf_sill", name: "高良姜叶窗台", desc: "发现高良姜叶", check: function (s) {
      return !!(s.discovered && s.discovered.galangal_leaf);
    } },
    { id: "galangal_leaf_walker", name: "高良姜叶径旅人", desc: "走过高良姜叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.galangal_leaf_path);
    } },
    { id: "torch_ginger_sill", name: "火炬姜窗台", desc: "发现火炬姜", check: function (s) {
      return !!(s.discovered && s.discovered.torch_ginger);
    } },
    { id: "torch_ginger_walker", name: "火炬姜径旅人", desc: "走过火炬姜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.torch_ginger_path);
    } },
    { id: "butterfly_pea_sill", name: "蝶豆花窗台", desc: "发现蝶豆花", check: function (s) {
      return !!(s.discovered && s.discovered.butterfly_pea);
    } },
    { id: "butterfly_pea_walker", name: "蝶豆花径旅人", desc: "走过蝶豆花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.butterfly_pea_path);
    } },
    { id: "chrysanthemum_ind_sill", name: "印尼菊窗台", desc: "发现印尼菊", check: function (s) {
      return !!(s.discovered && s.discovered.chrysanthemum_ind);
    } },
    { id: "chrysanthemum_ind_walker", name: "印尼菊径旅人", desc: "走过印尼菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chrysanthemum_ind_path);
    } },
    { id: "tamarind_leaf_sill", name: "罗望子叶窗台", desc: "发现罗望子叶", check: function (s) {
      return !!(s.discovered && s.discovered.tamarind_leaf);
    } },
    { id: "tamarind_leaf_walker", name: "罗望子叶径旅人", desc: "走过罗望子叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.tamarind_leaf_path);
    } },
    { id: "coconut_flower_sill", name: "椰花窗台", desc: "发现椰花", check: function (s) {
      return !!(s.discovered && s.discovered.coconut_flower);
    } },
    { id: "coconut_flower_walker", name: "椰花径旅人", desc: "走过椰花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.coconut_flower_path);
    } },
    { id: "bergamot_leaf_sill", name: "佛手柑叶窗台", desc: "发现佛手柑叶", check: function (s) {
      return !!(s.discovered && s.discovered.bergamot_leaf);
    } },
    { id: "bergamot_leaf_walker", name: "佛手柑叶径旅人", desc: "走过佛手柑叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bergamot_leaf_path);
    } },
    { id: "citron_sill", name: "香橼窗台", desc: "发现香橼", check: function (s) {
      return !!(s.discovered && s.discovered.citron);
    } },
    { id: "citron_walker", name: "香橼径旅人", desc: "走过香橼短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.citron_path);
    } },
    { id: "bergamot_peel_sill", name: "佛手柑皮窗台", desc: "发现佛手柑皮", check: function (s) {
      return !!(s.discovered && s.discovered.bergamot_peel);
    } },
    { id: "bergamot_peel_walker", name: "佛手柑皮径旅人", desc: "走过佛手柑皮短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bergamot_peel_path);
    } },
    { id: "neroli_sill", name: "橙花精窗台", desc: "发现橙花精", check: function (s) {
      return !!(s.discovered && s.discovered.neroli);
    } },
    { id: "neroli_walker", name: "橙花精径旅人", desc: "走过橙花精短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.neroli_path);
    } },
    { id: "petitgrain_sill", name: "苦橙叶窗台", desc: "发现苦橙叶", check: function (s) {
      return !!(s.discovered && s.discovered.petitgrain);
    } },
    { id: "petitgrain_walker", name: "苦橙叶径旅人", desc: "走过苦橙叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.petitgrain_path);
    } },
    { id: "immortelle_sill", name: "蜡菊窗台", desc: "发现蜡菊", check: function (s) {
      return !!(s.discovered && s.discovered.immortelle);
    } },
    { id: "immortelle_walker", name: "蜡菊径旅人", desc: "走过蜡菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.immortelle_path);
    } },
    { id: "helichrysum_sill", name: "蜡菊花窗台", desc: "发现蜡菊花", check: function (s) {
      return !!(s.discovered && s.discovered.helichrysum);
    } },
    { id: "helichrysum_walker", name: "蜡菊花径旅人", desc: "走过蜡菊花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.helichrysum_path);
    } },
    { id: "cistus_sill", name: "岩蔷薇窗台", desc: "发现岩蔷薇", check: function (s) {
      return !!(s.discovered && s.discovered.cistus);
    } },
    { id: "cistus_walker", name: "岩蔷薇径旅人", desc: "走过岩蔷薇短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cistus_path);
    } },
    { id: "spruce_beer_sill", name: "云杉芽酒香窗台", desc: "发现云杉芽酒香", check: function (s) {
      return !!(s.discovered && s.discovered.spruce_beer);
    } },
    { id: "spruce_beer_walker", name: "云杉芽酒香径旅人", desc: "走过云杉芽酒香径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.spruce_beer_path);
    } },
    { id: "labrador_tea_sill", name: "拉布拉多茶窗台", desc: "发现拉布拉多茶", check: function (s) {
      return !!(s.discovered && s.discovered.labrador_tea);
    } },
    { id: "labrador_tea_walker", name: "拉布拉多茶径旅人", desc: "走过拉布拉多茶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.labrador_tea_path);
    } },
    { id: "fireweed_sill", name: "火草窗台", desc: "发现火草", check: function (s) {
      return !!(s.discovered && s.discovered.fireweed);
    } },
    { id: "fireweed_walker", name: "火草径旅人", desc: "走过火草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fireweed_path);
    } },
    { id: "fireweed_honey_sill", name: "火草蜜窗台", desc: "发现火草蜜", check: function (s) {
      return !!(s.discovered && s.discovered.fireweed_honey);
    } },
    { id: "fireweed_honey_walker", name: "火草蜜径旅人", desc: "走过火草蜜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fireweed_honey_path);
    } },
    { id: "arctic_willow_sill", name: "北极柳窗台", desc: "发现北极柳", check: function (s) {
      return !!(s.discovered && s.discovered.arctic_willow);
    } },
    { id: "arctic_willow_walker", name: "北极柳径旅人", desc: "走过北极柳短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.arctic_willow_path);
    } },
    { id: "crowberry_sill", name: "岩高兰窗台", desc: "发现岩高兰", check: function (s) {
      return !!(s.discovered && s.discovered.crowberry);
    } },
    { id: "crowberry_walker", name: "岩高兰径旅人", desc: "走过岩高兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.crowberry_path);
    } },
    { id: "bearberry_sill", name: "熊果窗台", desc: "发现熊果", check: function (s) {
      return !!(s.discovered && s.discovered.bearberry);
    } },
    { id: "bearberry_walker", name: "熊果径旅人", desc: "走过熊果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bearberry_path);
    } },
    { id: "labrador_violet_sill", name: "拉布拉多堇窗台", desc: "发现拉布拉多堇", check: function (s) {
      return !!(s.discovered && s.discovered.labrador_violet);
    } },
    { id: "labrador_violet_walker", name: "拉布拉多堇径旅人", desc: "走过拉布拉多堇短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.labrador_violet_path);
    } },
    { id: "kinako_sill", name: "黄豆粉窗台", desc: "发现黄豆粉", check: function (s) {
      return !!(s.discovered && s.discovered.kinako);
    } },
    { id: "kinako_walker", name: "黄豆粉径旅人", desc: "走过黄豆粉短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.kinako_path);
    } },
    { id: "kuromitsu_sill", name: "黑蜜窗台", desc: "发现黑蜜", check: function (s) {
      return !!(s.discovered && s.discovered.kuromitsu);
    } },
    { id: "kuromitsu_walker", name: "黑蜜径旅人", desc: "走过黑蜜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.kuromitsu_path);
    } },
    { id: "matcha_salt_sill", name: "抹茶盐窗台", desc: "发现抹茶盐", check: function (s) {
      return !!(s.discovered && s.discovered.matcha_salt);
    } },
    { id: "matcha_salt_walker", name: "抹茶盐径旅人", desc: "走过抹茶盐短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.matcha_salt_path);
    } },
    { id: "yuzu_peel_sill", name: "柚子皮窗台", desc: "发现柚子皮", check: function (s) {
      return !!(s.discovered && s.discovered.yuzu_peel);
    } },
    { id: "yuzu_peel_walker", name: "柚子皮径旅人", desc: "走过柚子皮短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yuzu_peel_path);
    } },
    { id: "sansho_leaf_sill", name: "山椒叶窗台", desc: "发现山椒叶", check: function (s) {
      return !!(s.discovered && s.discovered.sansho_leaf);
    } },
    { id: "sansho_leaf_walker", name: "山椒叶径旅人", desc: "走过山椒叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sansho_leaf_path);
    } },
    { id: "shiso_flower_sill", name: "紫苏穗窗台", desc: "发现紫苏穗", check: function (s) {
      return !!(s.discovered && s.discovered.shiso_flower);
    } },
    { id: "shiso_flower_walker", name: "紫苏穗径旅人", desc: "走过紫苏穗短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.shiso_flower_path);
    } },
    { id: "ume_blossom_sill", name: "梅花花窗台", desc: "发现梅花花", check: function (s) {
      return !!(s.discovered && s.discovered.ume_blossom);
    } },
    { id: "ume_blossom_walker", name: "梅花花径旅人", desc: "走过梅花花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ume_blossom_path);
    } },
    { id: "sakura_leaf_sill", name: "樱叶窗台", desc: "发现樱叶", check: function (s) {
      return !!(s.discovered && s.discovered.sakura_leaf);
    } },
    { id: "sakura_leaf_walker", name: "樱叶径旅人", desc: "走过樱叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sakura_leaf_path);
    } },
    { id: "vanilla_bean_sill", name: "香草荚窗台", desc: "发现香草荚", check: function (s) {
      return !!(s.discovered && s.discovered.vanilla_bean);
    } },
    { id: "vanilla_bean_walker", name: "香草荚径旅人", desc: "走过香草荚短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.vanilla_bean_path);
    } },
    { id: "tonka_bean_sill", name: "零陵香豆窗台", desc: "发现零陵香豆", check: function (s) {
      return !!(s.discovered && s.discovered.tonka_bean);
    } },
    { id: "tonka_bean_walker", name: "零陵香豆径旅人", desc: "走过零陵香豆短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.tonka_bean_path);
    } },
    { id: "lavender_sugar_sill", name: "薰衣草糖窗台", desc: "发现薰衣草糖", check: function (s) {
      return !!(s.discovered && s.discovered.lavender_sugar);
    } },
    { id: "lavender_sugar_walker", name: "薰衣草糖径旅人", desc: "走过薰衣草糖短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lavender_sugar_path);
    } },
    { id: "rose_water_sill", name: "玫瑰水窗台", desc: "发现玫瑰水", check: function (s) {
      return !!(s.discovered && s.discovered.rose_water);
    } },
    { id: "rose_water_walker", name: "玫瑰水径旅人", desc: "走过玫瑰水短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rose_water_path);
    } },
    { id: "orange_flower_water_sill", name: "橙花水窗台", desc: "发现橙花水", check: function (s) {
      return !!(s.discovered && s.discovered.orange_flower_water);
    } },
    { id: "orange_flower_water_walker", name: "橙花水径旅人", desc: "走过橙花水短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.orange_flower_water_path);
    } },
    { id: "almond_blossom_sill", name: "杏花窗台", desc: "发现杏花", check: function (s) {
      return !!(s.discovered && s.discovered.almond_blossom);
    } },
    { id: "almond_blossom_walker", name: "杏花径旅人", desc: "走过杏花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.almond_blossom_path);
    } },
    { id: "hazelnut_flower_sill", name: "榛花窗台", desc: "发现榛花", check: function (s) {
      return !!(s.discovered && s.discovered.hazelnut_flower);
    } },
    { id: "hazelnut_flower_walker", name: "榛花径旅人", desc: "走过榛花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hazelnut_flower_path);
    } },
    { id: "chestnut_flower_sill", name: "板栗花窗台", desc: "发现板栗花", check: function (s) {
      return !!(s.discovered && s.discovered.chestnut_flower);
    } },
    { id: "chestnut_flower_walker", name: "板栗花径旅人", desc: "走过板栗花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chestnut_flower_path);
    } },
    { id: "omija_sill", name: "五味子韩窗台", desc: "发现五味子韩", check: function (s) {
      return !!(s.discovered && s.discovered.omija);
    } },
    { id: "omija_walker", name: "五味子韩径旅人", desc: "走过五味子韩短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.omija_path);
    } },
    { id: "yuja_sill", name: "柚子茶果窗台", desc: "发现柚子茶果", check: function (s) {
      return !!(s.discovered && s.discovered.yuja);
    } },
    { id: "yuja_walker", name: "柚子茶果径旅人", desc: "走过柚子茶果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yuja_path);
    } },
    { id: "ssanghwa_sill", name: "双和茶料窗台", desc: "发现双和茶料", check: function (s) {
      return !!(s.discovered && s.discovered.ssanghwa);
    } },
    { id: "ssanghwa_walker", name: "双和茶料径旅人", desc: "走过双和茶料短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ssanghwa_path);
    } },
    { id: "maesil_sill", name: "梅实窗台", desc: "发现梅实", check: function (s) {
      return !!(s.discovered && s.discovered.maesil);
    } },
    { id: "maesil_walker", name: "梅实径旅人", desc: "走过梅实短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.maesil_path);
    } },
    { id: "jujube_tea_sill", name: "大枣茶窗台", desc: "发现大枣茶", check: function (s) {
      return !!(s.discovered && s.discovered.jujube_tea);
    } },
    { id: "jujube_tea_walker", name: "大枣茶径旅人", desc: "走过大枣茶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.jujube_tea_path);
    } },
    { id: "ginger_tea_kr_sill", name: "韩式姜茶窗台", desc: "发现韩式姜茶", check: function (s) {
      return !!(s.discovered && s.discovered.ginger_tea_kr);
    } },
    { id: "ginger_tea_kr_walker", name: "韩式姜茶径旅人", desc: "走过韩式姜茶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ginger_tea_kr_path);
    } },
    { id: "persimmon_leaf_sill", name: "柿叶窗台", desc: "发现柿叶", check: function (s) {
      return !!(s.discovered && s.discovered.persimmon_leaf);
    } },
    { id: "persimmon_leaf_walker", name: "柿叶径旅人", desc: "走过柿叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.persimmon_leaf_path);
    } },
    { id: "pine_flower_sill", name: "松花窗台", desc: "发现松花", check: function (s) {
      return !!(s.discovered && s.discovered.pine_flower);
    } },
    { id: "pine_flower_walker", name: "松花径旅人", desc: "走过松花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pine_flower_path);
    } },
    { id: "tulsi_sill", name: "圣罗勒印窗台", desc: "发现圣罗勒印", check: function (s) {
      return !!(s.discovered && s.discovered.tulsi);
    } },
    { id: "tulsi_walker", name: "圣罗勒印径旅人", desc: "走过圣罗勒印短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.tulsi_path);
    } },
    { id: "neem_flower_sill", name: "苦楝花窗台", desc: "发现苦楝花", check: function (s) {
      return !!(s.discovered && s.discovered.neem_flower);
    } },
    { id: "neem_flower_walker", name: "苦楝花径旅人", desc: "走过苦楝花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.neem_flower_path);
    } },
    { id: "curry_blossom_sill", name: "咖喱花窗台", desc: "发现咖喱花", check: function (s) {
      return !!(s.discovered && s.discovered.curry_blossom);
    } },
    { id: "curry_blossom_walker", name: "咖喱花径旅人", desc: "走过咖喱花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.curry_blossom_path);
    } },
    { id: "ajwain_leaf_sill", name: "香旱芹叶窗台", desc: "发现香旱芹叶", check: function (s) {
      return !!(s.discovered && s.discovered.ajwain_leaf);
    } },
    { id: "ajwain_leaf_walker", name: "香旱芹叶径旅人", desc: "走过香旱芹叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ajwain_leaf_path);
    } },
    { id: "fenugreek_leaf_sill", name: "胡芦巴叶窗台", desc: "发现胡芦巴叶", check: function (s) {
      return !!(s.discovered && s.discovered.fenugreek_leaf);
    } },
    { id: "fenugreek_leaf_walker", name: "胡芦巴叶径旅人", desc: "走过胡芦巴叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fenugreek_leaf_path);
    } },
    { id: "moringa_sill", name: "辣木窗台", desc: "发现辣木", check: function (s) {
      return !!(s.discovered && s.discovered.moringa);
    } },
    { id: "moringa_walker", name: "辣木径旅人", desc: "走过辣木短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.moringa_path);
    } },
    { id: "gotu_kola_sill", name: "积雪草窗台", desc: "发现积雪草", check: function (s) {
      return !!(s.discovered && s.discovered.gotu_kola);
    } },
    { id: "gotu_kola_walker", name: "积雪草径旅人", desc: "走过积雪草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.gotu_kola_path);
    } },
    { id: "brahmi_sill", name: "假马齿苋窗台", desc: "发现假马齿苋", check: function (s) {
      return !!(s.discovered && s.discovered.brahmi);
    } },
    { id: "brahmi_walker", name: "假马齿苋径旅人", desc: "走过假马齿苋短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.brahmi_path);
    } },
    { id: "hibiscus_rosa_sill", name: "朱槿窗台", desc: "发现朱槿", check: function (s) {
      return !!(s.discovered && s.discovered.hibiscus_rosa);
    } },
    { id: "hibiscus_rosa_walker", name: "朱槿径旅人", desc: "走过朱槿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hibiscus_rosa_path);
    } },
    { id: "allspice_berry_sill", name: "多香果鲜窗台", desc: "发现多香果鲜", check: function (s) {
      return !!(s.discovered && s.discovered.allspice_berry);
    } },
    { id: "allspice_berry_walker", name: "多香果鲜径旅人", desc: "走过多香果鲜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.allspice_berry_path);
    } },
    { id: "annatto_sill", name: "胭脂树窗台", desc: "发现胭脂树", check: function (s) {
      return !!(s.discovered && s.discovered.annatto);
    } },
    { id: "annatto_walker", name: "胭脂树径旅人", desc: "走过胭脂树短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.annatto_path);
    } },
    { id: "epazote_sill", name: "土荆芥窗台", desc: "发现土荆芥", check: function (s) {
      return !!(s.discovered && s.discovered.epazote);
    } },
    { id: "epazote_walker", name: "土荆芥径旅人", desc: "走过土荆芥短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.epazote_path);
    } },
    { id: "papalo_sill", name: "帕帕洛窗台", desc: "发现帕帕洛", check: function (s) {
      return !!(s.discovered && s.discovered.papalo);
    } },
    { id: "papalo_walker", name: "帕帕洛径旅人", desc: "走过帕帕洛短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.papalo_path);
    } },
    { id: "hoja_santa_sill", name: "圣叶窗台", desc: "发现圣叶", check: function (s) {
      return !!(s.discovered && s.discovered.hoja_santa);
    } },
    { id: "hoja_santa_walker", name: "圣叶径旅人", desc: "走过圣叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hoja_santa_path);
    } },
    { id: "mexican_oregano_sill", name: "墨西哥牛至窗台", desc: "发现墨西哥牛至", check: function (s) {
      return !!(s.discovered && s.discovered.mexican_oregano);
    } },
    { id: "mexican_oregano_walker", name: "墨西哥牛至径旅人", desc: "走过墨西哥牛至径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mexican_oregano_path);
    } },
    { id: "chile_flower_sill", name: "辣椒花窗台", desc: "发现辣椒花", check: function (s) {
      return !!(s.discovered && s.discovered.chile_flower);
    } },
    { id: "chile_flower_walker", name: "辣椒花径旅人", desc: "走过辣椒花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chile_flower_path);
    } },
    { id: "noni_leaf_sill", name: "诺丽叶窗台", desc: "发现诺丽叶", check: function (s) {
      return !!(s.discovered && s.discovered.noni_leaf);
    } },
    { id: "noni_leaf_walker", name: "诺丽叶径旅人", desc: "走过诺丽叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.noni_leaf_path);
    } },
    { id: "kava_sill", name: "卡瓦窗台", desc: "发现卡瓦", check: function (s) {
      return !!(s.discovered && s.discovered.kava);
    } },
    { id: "kava_walker", name: "卡瓦径旅人", desc: "走过卡瓦短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.kava_path);
    } },
    { id: "ti_leaf_sill", name: "铁树叶窗台", desc: "发现铁树叶", check: function (s) {
      return !!(s.discovered && s.discovered.ti_leaf);
    } },
    { id: "ti_leaf_walker", name: "铁树叶径旅人", desc: "走过铁树叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ti_leaf_path);
    } },
    { id: "frangipani_tea_sill", name: "鸡蛋花茶窗台", desc: "发现鸡蛋花茶", check: function (s) {
      return !!(s.discovered && s.discovered.frangipani_tea);
    } },
    { id: "frangipani_tea_walker", name: "鸡蛋花茶径旅人", desc: "走过鸡蛋花茶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.frangipani_tea_path);
    } },
    { id: "soursop_leaf_sill", name: "刺果番荔枝叶窗台", desc: "发现刺果番荔枝叶", check: function (s) {
      return !!(s.discovered && s.discovered.soursop_leaf);
    } },
    { id: "soursop_leaf_walker", name: "刺果番荔枝叶径旅人", desc: "走过刺果番荔枝叶径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.soursop_leaf_path);
    } },
    { id: "guava_leaf_sill", name: "番石榴叶窗台", desc: "发现番石榴叶", check: function (s) {
      return !!(s.discovered && s.discovered.guava_leaf);
    } },
    { id: "guava_leaf_walker", name: "番石榴叶径旅人", desc: "走过番石榴叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.guava_leaf_path);
    } },
    { id: "passion_leaf_sill", name: "百香果叶窗台", desc: "发现百香果叶", check: function (s) {
      return !!(s.discovered && s.discovered.passion_leaf);
    } },
    { id: "passion_leaf_walker", name: "百香果叶径旅人", desc: "走过百香果叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.passion_leaf_path);
    } },
    { id: "vanilla_orchid_sill", name: "香荚兰窗台", desc: "发现香荚兰", check: function (s) {
      return !!(s.discovered && s.discovered.vanilla_orchid);
    } },
    { id: "vanilla_orchid_walker", name: "香荚兰径旅人", desc: "走过香荚兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.vanilla_orchid_path);
    } },
    { id: "longjing_sill", name: "龙井窗台", desc: "发现龙井", check: function (s) {
      return !!(s.discovered && s.discovered.longjing);
    } },
    { id: "longjing_walker", name: "龙井径旅人", desc: "走过龙井短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.longjing_path);
    } },
    { id: "biluochun_sill", name: "碧螺春窗台", desc: "发现碧螺春", check: function (s) {
      return !!(s.discovered && s.discovered.biluochun);
    } },
    { id: "biluochun_walker", name: "碧螺春径旅人", desc: "走过碧螺春短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.biluochun_path);
    } },
    { id: "tieguanyin_sill", name: "铁观音窗台", desc: "发现铁观音", check: function (s) {
      return !!(s.discovered && s.discovered.tieguanyin);
    } },
    { id: "tieguanyin_walker", name: "铁观音径旅人", desc: "走过铁观音短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.tieguanyin_path);
    } },
    { id: "dahongpao_sill", name: "大红袍窗台", desc: "发现大红袍", check: function (s) {
      return !!(s.discovered && s.discovered.dahongpao);
    } },
    { id: "dahongpao_walker", name: "大红袍径旅人", desc: "走过大红袍短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dahongpao_path);
    } },
    { id: "puer_raw_sill", name: "生普窗台", desc: "发现生普", check: function (s) {
      return !!(s.discovered && s.discovered.puer_raw);
    } },
    { id: "puer_raw_walker", name: "生普径旅人", desc: "走过生普短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.puer_raw_path);
    } },
    { id: "puer_ripe_sill", name: "熟普窗台", desc: "发现熟普", check: function (s) {
      return !!(s.discovered && s.discovered.puer_ripe);
    } },
    { id: "puer_ripe_walker", name: "熟普径旅人", desc: "走过熟普短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.puer_ripe_path);
    } },
    { id: "white_peony_tea_sill", name: "白牡丹茶窗台", desc: "发现白牡丹茶", check: function (s) {
      return !!(s.discovered && s.discovered.white_peony_tea);
    } },
    { id: "white_peony_tea_walker", name: "白牡丹茶径旅人", desc: "走过白牡丹茶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.white_peony_tea_path);
    } },
    { id: "shoumei_sill", name: "寿眉窗台", desc: "发现寿眉", check: function (s) {
      return !!(s.discovered && s.discovered.shoumei);
    } },
    { id: "shoumei_walker", name: "寿眉径旅人", desc: "走过寿眉短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.shoumei_path);
    } },
    { id: "burdock_root_sill", name: "牛蒡根窗台", desc: "发现牛蒡根", check: function (s) {
      return !!(s.discovered && s.discovered.burdock_root);
    } },
    { id: "burdock_root_walker", name: "牛蒡根径旅人", desc: "走过牛蒡根短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.burdock_root_path);
    } },
    { id: "dandelion_root_sill", name: "蒲公英根窗台", desc: "发现蒲公英根", check: function (s) {
      return !!(s.discovered && s.discovered.dandelion_root);
    } },
    { id: "dandelion_root_walker", name: "蒲公英根径旅人", desc: "走过蒲公英根短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dandelion_root_path);
    } },
    { id: "chicory_root_sill", name: "菊苣根窗台", desc: "发现菊苣根", check: function (s) {
      return !!(s.discovered && s.discovered.chicory_root);
    } },
    { id: "chicory_root_walker", name: "菊苣根径旅人", desc: "走过菊苣根短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chicory_root_path);
    } },
    { id: "valerian_flower_sill", name: "缬草花窗台", desc: "发现缬草花", check: function (s) {
      return !!(s.discovered && s.discovered.valerian_flower);
    } },
    { id: "valerian_flower_walker", name: "缬草花径旅人", desc: "走过缬草花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.valerian_flower_path);
    } },
    { id: "hops_flower_sill", name: "啤酒花花窗台", desc: "发现啤酒花花", check: function (s) {
      return !!(s.discovered && s.discovered.hops_flower);
    } },
    { id: "hops_flower_walker", name: "啤酒花花径旅人", desc: "走过啤酒花花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hops_flower_path);
    } },
    { id: "meadowsweet_flower_sill", name: "绣线菊花窗台", desc: "发现绣线菊花", check: function (s) {
      return !!(s.discovered && s.discovered.meadowsweet_flower);
    } },
    { id: "meadowsweet_flower_walker", name: "绣线菊花径旅人", desc: "走过绣线菊花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.meadowsweet_flower_path);
    } },
    { id: "yarrow_flower_sill", name: "蓍草花窗台", desc: "发现蓍草花", check: function (s) {
      return !!(s.discovered && s.discovered.yarrow_flower);
    } },
    { id: "yarrow_flower_walker", name: "蓍草花径旅人", desc: "走过蓍草花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yarrow_flower_path);
    } },
    { id: "nettle_seed_tea_sill", name: "荨麻籽茶窗台", desc: "发现荨麻籽茶", check: function (s) {
      return !!(s.discovered && s.discovered.nettle_seed_tea);
    } },
    { id: "nettle_seed_tea_walker", name: "荨麻籽茶径旅人", desc: "走过荨麻籽茶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.nettle_seed_tea_path);
    } },
    { id: "silver_birch_sill", name: "银白桦窗台", desc: "发现银白桦", check: function (s) {
      return !!(s.discovered && s.discovered.silver_birch);
    } },
    { id: "silver_birch_walker", name: "银白桦径旅人", desc: "走过银白桦短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.silver_birch_path);
    } },
    { id: "copper_beech_sill", name: "紫叶山毛榉窗台", desc: "发现紫叶山毛榉", check: function (s) {
      return !!(s.discovered && s.discovered.copper_beech);
    } },
    { id: "copper_beech_walker", name: "紫叶山毛榉径旅人", desc: "走过紫叶山毛榉短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.copper_beech_path);
    } },
    { id: "hornbeam_sill", name: "鹅耳枥窗台", desc: "发现鹅耳枥", check: function (s) {
      return !!(s.discovered && s.discovered.hornbeam);
    } },
    { id: "hornbeam_walker", name: "鹅耳枥径旅人", desc: "走过鹅耳枥短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hornbeam_path);
    } },
    { id: "field_maple_sill", name: "田野槭窗台", desc: "发现田野槭", check: function (s) {
      return !!(s.discovered && s.discovered.field_maple);
    } },
    { id: "field_maple_walker", name: "田野槭径旅人", desc: "走过田野槭短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.field_maple_path);
    } },
    { id: "wild_service_sill", name: "野花楸窗台", desc: "发现野花楸", check: function (s) {
      return !!(s.discovered && s.discovered.wild_service);
    } },
    { id: "wild_service_walker", name: "野花楸径旅人", desc: "走过野花楸短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wild_service_path);
    } },
    { id: "guelder_rose_sill", name: "欧洲荚蒾窗台", desc: "发现欧洲荚蒾", check: function (s) {
      return !!(s.discovered && s.discovered.guelder_rose);
    } },
    { id: "guelder_rose_walker", name: "欧洲荚蒾径旅人", desc: "走过欧洲荚蒾短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.guelder_rose_path);
    } },
    { id: "wayfaring_sill", name: "绵毛荚蒾窗台", desc: "发现绵毛荚蒾", check: function (s) {
      return !!(s.discovered && s.discovered.wayfaring);
    } },
    { id: "wayfaring_walker", name: "绵毛荚蒾径旅人", desc: "走过绵毛荚蒾短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wayfaring_path);
    } },
    { id: "dogwood_sill", name: "山茱萸窗台", desc: "发现山茱萸", check: function (s) {
      return !!(s.discovered && s.discovered.dogwood);
    } },
    { id: "dogwood_walker", name: "山茱萸径旅人", desc: "走过山茱萸短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dogwood_path);
    } },
    { id: "spindle_sill", name: "卫矛窗台", desc: "发现卫矛", check: function (s) {
      return !!(s.discovered && s.discovered.spindle);
    } },
    { id: "spindle_walker", name: "卫矛径旅人", desc: "走过卫矛短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.spindle_path);
    } },
    { id: "buckthorn_sill", name: "鼠李窗台", desc: "发现鼠李", check: function (s) {
      return !!(s.discovered && s.discovered.buckthorn);
    } },
    { id: "buckthorn_walker", name: "鼠李径旅人", desc: "走过鼠李短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.buckthorn_path);
    } },
    { id: "privet_sill", name: "女贞窗台", desc: "发现女贞", check: function (s) {
      return !!(s.discovered && s.discovered.privet);
    } },
    { id: "privet_walker", name: "女贞径旅人", desc: "走过女贞短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.privet_path);
    } },
    { id: "boxwood_sill", name: "黄杨窗台", desc: "发现黄杨", check: function (s) {
      return !!(s.discovered && s.discovered.boxwood);
    } },
    { id: "boxwood_walker", name: "黄杨径旅人", desc: "走过黄杨短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.boxwood_path);
    } },
    { id: "holly_leaf_sill", name: "冬青叶窗台", desc: "发现冬青叶", check: function (s) {
      return !!(s.discovered && s.discovered.holly_leaf);
    } },
    { id: "holly_leaf_walker", name: "冬青叶径旅人", desc: "走过冬青叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.holly_leaf_path);
    } },
    { id: "ivy_berry_sill", name: "常春藤果窗台", desc: "发现常春藤果", check: function (s) {
      return !!(s.discovered && s.discovered.ivy_berry);
    } },
    { id: "ivy_berry_walker", name: "常春藤果径旅人", desc: "走过常春藤果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ivy_berry_path);
    } },
    { id: "mistletoe_sill", name: "槲寄生窗台", desc: "发现槲寄生", check: function (s) {
      return !!(s.discovered && s.discovered.mistletoe);
    } },
    { id: "mistletoe_walker", name: "槲寄生径旅人", desc: "走过槲寄生短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mistletoe_path);
    } },
    { id: "yew_berry_sill", name: "红豆杉窗台", desc: "发现红豆杉", check: function (s) {
      return !!(s.discovered && s.discovered.yew_berry);
    } },
    { id: "yew_berry_walker", name: "红豆杉径旅人", desc: "走过红豆杉短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yew_berry_path);
    } },
    { id: "bluebell_fresh_sill", name: "鲜风铃草窗台", desc: "发现鲜风铃草", check: function (s) {
      return !!(s.discovered && s.discovered.bluebell_fresh);
    } },
    { id: "bluebell_fresh_walker", name: "鲜风铃草径旅人", desc: "走过鲜风铃草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bluebell_fresh_path);
    } },
    { id: "primula_veris_sill", name: "黄花九轮窗台", desc: "发现黄花九轮", check: function (s) {
      return !!(s.discovered && s.discovered.primula_veris);
    } },
    { id: "primula_veris_walker", name: "黄花九轮径旅人", desc: "走过黄花九轮短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.primula_veris_path);
    } },
    { id: "oxlip_sill", name: "高报春窗台", desc: "发现高报春", check: function (s) {
      return !!(s.discovered && s.discovered.oxlip);
    } },
    { id: "oxlip_walker", name: "高报春径旅人", desc: "走过高报春短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.oxlip_path);
    } },
    { id: "cowslip_fresh_sill", name: "鲜九轮草窗台", desc: "发现鲜九轮草", check: function (s) {
      return !!(s.discovered && s.discovered.cowslip_fresh);
    } },
    { id: "cowslip_fresh_walker", name: "鲜九轮草径旅人", desc: "走过鲜九轮草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cowslip_fresh_path);
    } },
    { id: "wood_anemone_sill", name: "林银莲窗台", desc: "发现林银莲", check: function (s) {
      return !!(s.discovered && s.discovered.wood_anemone);
    } },
    { id: "wood_anemone_walker", name: "林银莲径旅人", desc: "走过林银莲短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wood_anemone_path);
    } },
    { id: "wood_sorrel_pink_sill", name: "粉酢浆草窗台", desc: "发现粉酢浆草", check: function (s) {
      return !!(s.discovered && s.discovered.wood_sorrel_pink);
    } },
    { id: "wood_sorrel_pink_walker", name: "粉酢浆草径旅人", desc: "走过粉酢浆草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wood_sorrel_pink_path);
    } },
    { id: "greater_stitchwort_sill", name: "大繁缕窗台", desc: "发现大繁缕", check: function (s) {
      return !!(s.discovered && s.discovered.greater_stitchwort);
    } },
    { id: "greater_stitchwort_walker", name: "大繁缕径旅人", desc: "走过大繁缕短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.greater_stitchwort_path);
    } },
    { id: "red_campion_sill", name: "红剪秋罗窗台", desc: "发现红剪秋罗", check: function (s) {
      return !!(s.discovered && s.discovered.red_campion);
    } },
    { id: "red_campion_walker", name: "红剪秋罗径旅人", desc: "走过红剪秋罗短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.red_campion_path);
    } },
    { id: "white_campion_sill", name: "白剪秋罗窗台", desc: "发现白剪秋罗", check: function (s) {
      return !!(s.discovered && s.discovered.white_campion);
    } },
    { id: "white_campion_walker", name: "白剪秋罗径旅人", desc: "走过白剪秋罗短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.white_campion_path);
    } },
    { id: "ragged_robin_sill", name: "剪秋罗羽窗台", desc: "发现剪秋罗羽", check: function (s) {
      return !!(s.discovered && s.discovered.ragged_robin);
    } },
    { id: "ragged_robin_walker", name: "剪秋罗羽径旅人", desc: "走过剪秋罗羽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ragged_robin_path);
    } },
    { id: "cuckooflower_sill", name: "布谷鸟剪窗台", desc: "发现布谷鸟剪", check: function (s) {
      return !!(s.discovered && s.discovered.cuckooflower);
    } },
    { id: "cuckooflower_walker", name: "布谷鸟剪径旅人", desc: "走过布谷鸟剪短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cuckooflower_path);
    } },
    { id: "lady_smock_sill", name: "水田芥花窗台", desc: "发现水田芥花", check: function (s) {
      return !!(s.discovered && s.discovered.lady_smock);
    } },
    { id: "lady_smock_walker", name: "水田芥花径旅人", desc: "走过水田芥花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lady_smock_path);
    } },
    { id: "garlic_mustard_fl_sill", name: "蒜芥花窗台", desc: "发现蒜芥花", check: function (s) {
      return !!(s.discovered && s.discovered.garlic_mustard_fl);
    } },
    { id: "garlic_mustard_fl_walker", name: "蒜芥花径旅人", desc: "走过蒜芥花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.garlic_mustard_fl_path);
    } },
    { id: "hedge_garlic_seed_sill", name: "蒜芥籽窗台", desc: "发现蒜芥籽", check: function (s) {
      return !!(s.discovered && s.discovered.hedge_garlic_seed);
    } },
    { id: "hedge_garlic_seed_walker", name: "蒜芥籽径旅人", desc: "走过蒜芥籽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hedge_garlic_seed_path);
    } },
    { id: "jack_hedge_leaf_sill", name: "篱蒜芥叶窗台", desc: "发现篱蒜芥叶", check: function (s) {
      return !!(s.discovered && s.discovered.jack_hedge_leaf);
    } },
    { id: "jack_hedge_leaf_walker", name: "篱蒜芥叶径旅人", desc: "走过篱蒜芥叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.jack_hedge_leaf_path);
    } },
    { id: "wild_mustard_sill", name: "野芥窗台", desc: "发现野芥", check: function (s) {
      return !!(s.discovered && s.discovered.wild_mustard);
    } },
    { id: "wild_mustard_walker", name: "野芥径旅人", desc: "走过野芥短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wild_mustard_path);
    } },
    { id: "meadow_buttercup_sill", name: "草地毛茛窗台", desc: "发现草地毛茛", check: function (s) {
      return !!(s.discovered && s.discovered.meadow_buttercup);
    } },
    { id: "meadow_buttercup_walker", name: "草地毛茛径旅人", desc: "走过草地毛茛短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.meadow_buttercup_path);
    } },
    { id: "creeping_buttercup_sill", name: "匍匐毛茛窗台", desc: "发现匍匐毛茛", check: function (s) {
      return !!(s.discovered && s.discovered.creeping_buttercup);
    } },
    { id: "creeping_buttercup_walker", name: "匍匐毛茛径旅人", desc: "走过匍匐毛茛短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.creeping_buttercup_path);
    } },
    { id: "lesser_celandine_sill", name: "小白屈菜窗台", desc: "发现小白屈菜", check: function (s) {
      return !!(s.discovered && s.discovered.lesser_celandine);
    } },
    { id: "lesser_celandine_walker", name: "小白屈菜径旅人", desc: "走过小白屈菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lesser_celandine_path);
    } },
    { id: "marsh_marigold_sill", name: "驴蹄草窗台", desc: "发现驴蹄草", check: function (s) {
      return !!(s.discovered && s.discovered.marsh_marigold);
    } },
    { id: "marsh_marigold_walker", name: "驴蹄草径旅人", desc: "走过驴蹄草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.marsh_marigold_path);
    } },
    { id: "globe_flower_sill", name: "金莲花窗台", desc: "发现金莲花", check: function (s) {
      return !!(s.discovered && s.discovered.globe_flower);
    } },
    { id: "globe_flower_walker", name: "金莲花径旅人", desc: "走过金莲花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.globe_flower_path);
    } },
    { id: "columbine_sill", name: "耧斗菜窗台", desc: "发现耧斗菜", check: function (s) {
      return !!(s.discovered && s.discovered.columbine);
    } },
    { id: "columbine_walker", name: "耧斗菜径旅人", desc: "走过耧斗菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.columbine_path);
    } },
    { id: "monkshood_sill", name: "乌头窗台", desc: "发现乌头", check: function (s) {
      return !!(s.discovered && s.discovered.monkshood);
    } },
    { id: "monkshood_walker", name: "乌头径旅人", desc: "走过乌头短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.monkshood_path);
    } },
    { id: "larkspur_sill", name: "飞燕草窗台", desc: "发现飞燕草", check: function (s) {
      return !!(s.discovered && s.discovered.larkspur);
    } },
    { id: "larkspur_walker", name: "飞燕草径旅人", desc: "走过飞燕草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.larkspur_path);
    } },
    { id: "delphinium_sill", name: "翠雀窗台", desc: "发现翠雀", check: function (s) {
      return !!(s.discovered && s.discovered.delphinium);
    } },
    { id: "delphinium_walker", name: "翠雀径旅人", desc: "走过翠雀短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.delphinium_path);
    } },
    { id: "aconite_sill", name: "附子花窗台", desc: "发现附子花", check: function (s) {
      return !!(s.discovered && s.discovered.aconite);
    } },
    { id: "aconite_walker", name: "附子花径旅人", desc: "走过附子花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.aconite_path);
    } },
    { id: "helleborus_sill", name: "铁筷子窗台", desc: "发现铁筷子", check: function (s) {
      return !!(s.discovered && s.discovered.helleborus);
    } },
    { id: "helleborus_walker", name: "铁筷子径旅人", desc: "走过铁筷子短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.helleborus_path);
    } },
    { id: "christmas_rose_sill", name: "圣诞玫瑰窗台", desc: "发现圣诞玫瑰", check: function (s) {
      return !!(s.discovered && s.discovered.christmas_rose);
    } },
    { id: "christmas_rose_walker", name: "圣诞玫瑰径旅人", desc: "走过圣诞玫瑰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.christmas_rose_path);
    } },
    { id: "pasque_flower_sill", name: "白头翁窗台", desc: "发现白头翁", check: function (s) {
      return !!(s.discovered && s.discovered.pasque_flower);
    } },
    { id: "pasque_flower_walker", name: "白头翁径旅人", desc: "走过白头翁短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pasque_flower_path);
    } },
    { id: "anemone_coronaria_sill", name: "冠状银莲窗台", desc: "发现冠状银莲", check: function (s) {
      return !!(s.discovered && s.discovered.anemone_coronaria);
    } },
    { id: "anemone_coronaria_walker", name: "冠状银莲径旅人", desc: "走过冠状银莲短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.anemone_coronaria_path);
    } },
    { id: "hepatic_sill", name: "獐耳细辛窗台", desc: "发现獐耳细辛", check: function (s) {
      return !!(s.discovered && s.discovered.hepatic);
    } },
    { id: "hepatic_walker", name: "獐耳细辛径旅人", desc: "走过獐耳细辛短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hepatic_path);
    } },
    { id: "clematis_vitalba_sill", name: "老铁线莲窗台", desc: "发现老铁线莲", check: function (s) {
      return !!(s.discovered && s.discovered.clematis_vitalba);
    } },
    { id: "clematis_vitalba_walker", name: "老铁线莲径旅人", desc: "走过老铁线莲短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.clematis_vitalba_path);
    } },
    { id: "speedwell_germander_sill", name: "石蚕婆婆纳窗台", desc: "发现石蚕婆婆纳", check: function (s) {
      return !!(s.discovered && s.discovered.speedwell_germander);
    } },
    { id: "speedwell_germander_walker", name: "石蚕婆婆纳径旅人", desc: "走过石蚕婆婆纳短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.speedwell_germander_path);
    } },
    { id: "germander_sill", name: "石蚕窗台", desc: "发现石蚕", check: function (s) {
      return !!(s.discovered && s.discovered.germander);
    } },
    { id: "germander_walker", name: "石蚕径旅人", desc: "走过石蚕短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.germander_path);
    } },
    { id: "betony_fresh_sill", name: "鲜水苏窗台", desc: "发现鲜水苏", check: function (s) {
      return !!(s.discovered && s.discovered.betony_fresh);
    } },
    { id: "betony_fresh_walker", name: "鲜水苏径旅人", desc: "走过鲜水苏短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.betony_fresh_path);
    } },
    { id: "selfheal_fresh_sill", name: "鲜夏枯草窗台", desc: "发现鲜夏枯草", check: function (s) {
      return !!(s.discovered && s.discovered.selfheal_fresh);
    } },
    { id: "selfheal_fresh_walker", name: "鲜夏枯草径旅人", desc: "走过鲜夏枯草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.selfheal_fresh_path);
    } },
    { id: "woundwort_sill", name: "水苏属窗台", desc: "发现水苏属", check: function (s) {
      return !!(s.discovered && s.discovered.woundwort);
    } },
    { id: "woundwort_walker", name: "水苏属径旅人", desc: "走过水苏属短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.woundwort_path);
    } },
    { id: "hedge_woundwort_sill", name: "篱水苏窗台", desc: "发现篱水苏", check: function (s) {
      return !!(s.discovered && s.discovered.hedge_woundwort);
    } },
    { id: "hedge_woundwort_walker", name: "篱水苏径旅人", desc: "走过篱水苏短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hedge_woundwort_path);
    } },
    { id: "marsh_woundwort_sill", name: "沼水苏窗台", desc: "发现沼水苏", check: function (s) {
      return !!(s.discovered && s.discovered.marsh_woundwort);
    } },
    { id: "marsh_woundwort_walker", name: "沼水苏径旅人", desc: "走过沼水苏短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.marsh_woundwort_path);
    } },
    { id: "black_horehound_sill", name: "黑夏至草窗台", desc: "发现黑夏至草", check: function (s) {
      return !!(s.discovered && s.discovered.black_horehound);
    } },
    { id: "black_horehound_walker", name: "黑夏至草径旅人", desc: "走过黑夏至草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.black_horehound_path);
    } },
    { id: "white_horehound_sill", name: "白夏至草窗台", desc: "发现白夏至草", check: function (s) {
      return !!(s.discovered && s.discovered.white_horehound);
    } },
    { id: "white_horehound_walker", name: "白夏至草径旅人", desc: "走过白夏至草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.white_horehound_path);
    } },
    { id: "motherwort_fresh_sill", name: "鲜益母草窗台", desc: "发现鲜益母草", check: function (s) {
      return !!(s.discovered && s.discovered.motherwort_fresh);
    } },
    { id: "motherwort_fresh_walker", name: "鲜益母草径旅人", desc: "走过鲜益母草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.motherwort_fresh_path);
    } },
    { id: "skullcap_fresh_sill", name: "鲜黄芩窗台", desc: "发现鲜黄芩", check: function (s) {
      return !!(s.discovered && s.discovered.skullcap_fresh);
    } },
    { id: "skullcap_fresh_walker", name: "鲜黄芩径旅人", desc: "走过鲜黄芩短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.skullcap_fresh_path);
    } },
    { id: "baikal_skullcap_sill", name: "黄芩根窗台", desc: "发现黄芩根", check: function (s) {
      return !!(s.discovered && s.discovered.baikal_skullcap);
    } },
    { id: "baikal_skullcap_walker", name: "黄芩根径旅人", desc: "走过黄芩根短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.baikal_skullcap_path);
    } },
    { id: "scutellaria_sill", name: "盔状黄芩窗台", desc: "发现盔状黄芩", check: function (s) {
      return !!(s.discovered && s.discovered.scutellaria);
    } },
    { id: "scutellaria_walker", name: "盔状黄芩径旅人", desc: "走过盔状黄芩短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.scutellaria_path);
    } },
    { id: "bugle_fresh_sill", name: "鲜筋骨草窗台", desc: "发现鲜筋骨草", check: function (s) {
      return !!(s.discovered && s.discovered.bugle_fresh);
    } },
    { id: "bugle_fresh_walker", name: "鲜筋骨草径旅人", desc: "走过鲜筋骨草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bugle_fresh_path);
    } },
    { id: "ground_ivy_fresh_sill", name: "鲜连钱草窗台", desc: "发现鲜连钱草", check: function (s) {
      return !!(s.discovered && s.discovered.ground_ivy_fresh);
    } },
    { id: "ground_ivy_fresh_walker", name: "鲜连钱草径旅人", desc: "走过鲜连钱草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ground_ivy_fresh_path);
    } },
    { id: "alehoof_sill", name: "啤酒花草窗台", desc: "发现啤酒花草", check: function (s) {
      return !!(s.discovered && s.discovered.alehoof);
    } },
    { id: "alehoof_walker", name: "啤酒花草径旅人", desc: "走过啤酒花草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.alehoof_path);
    } },
    { id: "clary_sage_sill", name: "南欧丹参窗台", desc: "发现南欧丹参", check: function (s) {
      return !!(s.discovered && s.discovered.clary_sage);
    } },
    { id: "clary_sage_walker", name: "南欧丹参径旅人", desc: "走过南欧丹参短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.clary_sage_path);
    } },
    { id: "pineapple_sage_sill", name: "菠萝鼠尾草窗台", desc: "发现菠萝鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.pineapple_sage);
    } },
    { id: "pineapple_sage_walker", name: "菠萝鼠尾草径旅人", desc: "走过菠萝鼠尾草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pineapple_sage_path);
    } },
    { id: "fruit_sage_sill", name: "果香鼠尾草窗台", desc: "发现果香鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.fruit_sage);
    } },
    { id: "fruit_sage_walker", name: "果香鼠尾草径旅人", desc: "走过果香鼠尾草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fruit_sage_path);
    } },
    { id: "white_sage_sill", name: "白鼠尾草窗台", desc: "发现白鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.white_sage);
    } },
    { id: "white_sage_walker", name: "白鼠尾草径旅人", desc: "走过白鼠尾草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.white_sage_path);
    } },
    { id: "russian_sage_sill", name: "俄罗斯鼠尾草窗台", desc: "发现俄罗斯鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.russian_sage);
    } },
    { id: "russian_sage_walker", name: "俄罗斯鼠尾草径旅人", desc: "走过俄罗斯鼠尾草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.russian_sage_path);
    } },
    { id: "meadow_clary_fresh_sill", name: "鲜草地鼠尾窗台", desc: "发现鲜草地鼠尾", check: function (s) {
      return !!(s.discovered && s.discovered.meadow_clary_fresh);
    } },
    { id: "meadow_clary_fresh_walker", name: "鲜草地鼠尾径旅人", desc: "走过鲜草地鼠尾短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.meadow_clary_fresh_path);
    } },
    { id: "wood_sage_sill", name: "林地鼠尾草窗台", desc: "发现林地鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.wood_sage);
    } },
    { id: "wood_sage_walker", name: "林地鼠尾草径旅人", desc: "走过林地鼠尾草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wood_sage_path);
    } },
    { id: "jerusalem_sage_sill", name: "耶路撒冷鼠尾窗台", desc: "发现耶路撒冷鼠尾", check: function (s) {
      return !!(s.discovered && s.discovered.jerusalem_sage);
    } },
    { id: "jerusalem_sage_walker", name: "耶路撒冷鼠尾径旅人", desc: "走过耶路撒冷鼠尾短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.jerusalem_sage_path);
    } },
    { id: "catmint_sill", name: "假荆芥窗台", desc: "发现假荆芥", check: function (s) {
      return !!(s.discovered && s.discovered.catmint);
    } },
    { id: "catmint_walker", name: "假荆芥径旅人", desc: "走过假荆芥短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.catmint_path);
    } },
    { id: "catnip_fresh_sill", name: "鲜猫薄荷窗台", desc: "发现鲜猫薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.catnip_fresh);
    } },
    { id: "catnip_fresh_walker", name: "鲜猫薄荷径旅人", desc: "走过鲜猫薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.catnip_fresh_path);
    } },
    { id: "hyssop_fresh_sill", name: "鲜神香草窗台", desc: "发现鲜神香草", check: function (s) {
      return !!(s.discovered && s.discovered.hyssop_fresh);
    } },
    { id: "hyssop_fresh_walker", name: "鲜神香草径旅人", desc: "走过鲜神香草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hyssop_fresh_path);
    } },
    { id: "anise_hyssop_sill", name: "茴香藿香窗台", desc: "发现茴香藿香", check: function (s) {
      return !!(s.discovered && s.discovered.anise_hyssop);
    } },
    { id: "anise_hyssop_walker", name: "茴香藿香径旅人", desc: "走过茴香藿香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.anise_hyssop_path);
    } },
    { id: "korean_mint_sill", name: "藿香窗台", desc: "发现藿香", check: function (s) {
      return !!(s.discovered && s.discovered.korean_mint);
    } },
    { id: "korean_mint_walker", name: "藿香径旅人", desc: "走过藿香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.korean_mint_path);
    } },
    { id: "agastache_sill", name: "藿香属窗台", desc: "发现藿香属", check: function (s) {
      return !!(s.discovered && s.discovered.agastache);
    } },
    { id: "agastache_walker", name: "藿香属径旅人", desc: "走过藿香属短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.agastache_path);
    } },
    { id: "lavender_spike_sill", name: "穗花薰衣草窗台", desc: "发现穗花薰衣草", check: function (s) {
      return !!(s.discovered && s.discovered.lavender_spike);
    } },
    { id: "lavender_spike_walker", name: "穗花薰衣草径旅人", desc: "走过穗花薰衣草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lavender_spike_path);
    } },
    { id: "lavender_sto_sill", name: "法国薰衣草窗台", desc: "发现法国薰衣草", check: function (s) {
      return !!(s.discovered && s.discovered.lavender_sto);
    } },
    { id: "lavender_sto_walker", name: "法国薰衣草径旅人", desc: "走过法国薰衣草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lavender_sto_path);
    } },
    { id: "thyme_lemon_sill", name: "柠檬百里香窗台", desc: "发现柠檬百里香", check: function (s) {
      return !!(s.discovered && s.discovered.thyme_lemon);
    } },
    { id: "thyme_lemon_walker", name: "柠檬百里香径旅人", desc: "走过柠檬百里香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.thyme_lemon_path);
    } },
    { id: "thyme_orange_sill", name: "橙香百里香窗台", desc: "发现橙香百里香", check: function (s) {
      return !!(s.discovered && s.discovered.thyme_orange);
    } },
    { id: "thyme_orange_walker", name: "橙香百里香径旅人", desc: "走过橙香百里香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.thyme_orange_path);
    } },
    { id: "thyme_caraway_sill", name: "葛缕子百里香窗台", desc: "发现葛缕子百里香", check: function (s) {
      return !!(s.discovered && s.discovered.thyme_caraway);
    } },
    { id: "thyme_caraway_walker", name: "葛缕子百里香径旅人", desc: "走过葛缕子百里香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.thyme_caraway_path);
    } },
    { id: "thyme_woolly_sill", name: "绵毛百里香窗台", desc: "发现绵毛百里香", check: function (s) {
      return !!(s.discovered && s.discovered.thyme_woolly);
    } },
    { id: "thyme_woolly_walker", name: "绵毛百里香径旅人", desc: "走过绵毛百里香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.thyme_woolly_path);
    } },
    { id: "creeping_thyme_sill", name: "铺地百里香窗台", desc: "发现铺地百里香", check: function (s) {
      return !!(s.discovered && s.discovered.creeping_thyme);
    } },
    { id: "creeping_thyme_walker", name: "铺地百里香径旅人", desc: "走过铺地百里香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.creeping_thyme_path);
    } },
    { id: "oregano_greek_sill", name: "希腊牛至窗台", desc: "发现希腊牛至", check: function (s) {
      return !!(s.discovered && s.discovered.oregano_greek);
    } },
    { id: "oregano_greek_walker", name: "希腊牛至径旅人", desc: "走过希腊牛至短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.oregano_greek_path);
    } },
    { id: "oregano_italian_sill", name: "意大利牛至窗台", desc: "发现意大利牛至", check: function (s) {
      return !!(s.discovered && s.discovered.oregano_italian);
    } },
    { id: "oregano_italian_walker", name: "意大利牛至径旅人", desc: "走过意大利牛至短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.oregano_italian_path);
    } },
    { id: "marjoram_sweet_sill", name: "甜马郁兰窗台", desc: "发现甜马郁兰", check: function (s) {
      return !!(s.discovered && s.discovered.marjoram_sweet);
    } },
    { id: "marjoram_sweet_walker", name: "甜马郁兰径旅人", desc: "走过甜马郁兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.marjoram_sweet_path);
    } },
    { id: "savory_summer_sill", name: "夏香薄荷窗台", desc: "发现夏香薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.savory_summer);
    } },
    { id: "savory_summer_walker", name: "夏香薄荷径旅人", desc: "走过夏香薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.savory_summer_path);
    } },
    { id: "savory_winter_sill", name: "冬香薄荷窗台", desc: "发现冬香薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.savory_winter);
    } },
    { id: "savory_winter_walker", name: "冬香薄荷径旅人", desc: "走过冬香薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.savory_winter_path);
    } },
    { id: "basil_genovese_sill", name: "热那亚罗勒窗台", desc: "发现热那亚罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.basil_genovese);
    } },
    { id: "basil_genovese_walker", name: "热那亚罗勒径旅人", desc: "走过热那亚罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.basil_genovese_path);
    } },
    { id: "basil_cinnamon_sill", name: "肉桂罗勒窗台", desc: "发现肉桂罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.basil_cinnamon);
    } },
    { id: "basil_cinnamon_walker", name: "肉桂罗勒径旅人", desc: "走过肉桂罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.basil_cinnamon_path);
    } },
    { id: "basil_purple_sill", name: "紫罗勒窗台", desc: "发现紫罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.basil_purple);
    } },
    { id: "basil_purple_walker", name: "紫罗勒径旅人", desc: "走过紫罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.basil_purple_path);
    } },
    { id: "basil_lettuce_sill", name: "生菜罗勒窗台", desc: "发现生菜罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.basil_lettuce);
    } },
    { id: "basil_lettuce_walker", name: "生菜罗勒径旅人", desc: "走过生菜罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.basil_lettuce_path);
    } },
    { id: "mint_peppermint_sill", name: "胡椒薄荷窗台", desc: "发现胡椒薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.mint_peppermint);
    } },
    { id: "mint_peppermint_walker", name: "胡椒薄荷径旅人", desc: "走过胡椒薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mint_peppermint_path);
    } },
    { id: "mint_spearmint_sill", name: "留兰香窗台", desc: "发现留兰香", check: function (s) {
      return !!(s.discovered && s.discovered.mint_spearmint);
    } },
    { id: "mint_spearmint_walker", name: "留兰香径旅人", desc: "走过留兰香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mint_spearmint_path);
    } },
    { id: "mint_chocolate_sill", name: "巧克力薄荷窗台", desc: "发现巧克力薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.mint_chocolate);
    } },
    { id: "mint_chocolate_walker", name: "巧克力薄荷径旅人", desc: "走过巧克力薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mint_chocolate_path);
    } },
    { id: "mint_apple_sill", name: "苹果薄荷窗台", desc: "发现苹果薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.mint_apple);
    } },
    { id: "mint_apple_walker", name: "苹果薄荷径旅人", desc: "走过苹果薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mint_apple_path);
    } },
    { id: "mint_ginger_sill", name: "姜味薄荷窗台", desc: "发现姜味薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.mint_ginger);
    } },
    { id: "mint_ginger_walker", name: "姜味薄荷径旅人", desc: "走过姜味薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mint_ginger_path);
    } },
    { id: "mint_orange_sill", name: "橙香薄荷窗台", desc: "发现橙香薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.mint_orange);
    } },
    { id: "mint_orange_walker", name: "橙香薄荷径旅人", desc: "走过橙香薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mint_orange_path);
    } },
    { id: "mint_lavender_sill", name: "薰衣草薄荷窗台", desc: "发现薰衣草薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.mint_lavender);
    } },
    { id: "mint_lavender_walker", name: "薰衣草薄荷径旅人", desc: "走过薰衣草薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mint_lavender_path);
    } },
    { id: "mint_bergamot_sill", name: "佛手柑薄荷窗台", desc: "发现佛手柑薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.mint_bergamot);
    } },
    { id: "mint_bergamot_walker", name: "佛手柑薄荷径旅人", desc: "走过佛手柑薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mint_bergamot_path);
    } },
    { id: "mint_corsican_sill", name: "科西嘉薄荷窗台", desc: "发现科西嘉薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.mint_corsican);
    } },
    { id: "mint_corsican_walker", name: "科西嘉薄荷径旅人", desc: "走过科西嘉薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mint_corsican_path);
    } },
    { id: "mint_water_sill", name: "水薄荷窗台", desc: "发现水薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.mint_water);
    } },
    { id: "mint_water_walker", name: "水薄荷径旅人", desc: "走过水薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mint_water_path);
    } },
    { id: "melissa_fresh_sill", name: "鲜香蜂草窗台", desc: "发现鲜香蜂草", check: function (s) {
      return !!(s.discovered && s.discovered.melissa_fresh);
    } },
    { id: "melissa_fresh_walker", name: "鲜香蜂草径旅人", desc: "走过鲜香蜂草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.melissa_fresh_path);
    } },
    { id: "lemon_balm_var_sill", name: "柠檬香蜂窗台", desc: "发现柠檬香蜂", check: function (s) {
      return !!(s.discovered && s.discovered.lemon_balm_var);
    } },
    { id: "lemon_balm_var_walker", name: "柠檬香蜂径旅人", desc: "走过柠檬香蜂短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lemon_balm_var_path);
    } },
    { id: "bee_balm_pink_sill", name: "粉美国薄荷窗台", desc: "发现粉美国薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.bee_balm_pink);
    } },
    { id: "bee_balm_pink_walker", name: "粉美国薄荷径旅人", desc: "走过粉美国薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bee_balm_pink_path);
    } },
    { id: "bee_balm_purple_sill", name: "紫美国薄荷窗台", desc: "发现紫美国薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.bee_balm_purple);
    } },
    { id: "bee_balm_purple_walker", name: "紫美国薄荷径旅人", desc: "走过紫美国薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bee_balm_purple_path);
    } },
    { id: "oregano_hop_sill", name: "啤酒花牛至窗台", desc: "发现啤酒花牛至", check: function (s) {
      return !!(s.discovered && s.discovered.oregano_hop);
    } },
    { id: "oregano_hop_walker", name: "啤酒花牛至径旅人", desc: "走过啤酒花牛至短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.oregano_hop_path);
    } },
    { id: "dittany_sill", name: "白鲜窗台", desc: "发现白鲜", check: function (s) {
      return !!(s.discovered && s.discovered.dittany);
    } },
    { id: "dittany_walker", name: "白鲜径旅人", desc: "走过白鲜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dittany_path);
    } },
    { id: "dictamnus_sill", name: "白藓花窗台", desc: "发现白藓花", check: function (s) {
      return !!(s.discovered && s.discovered.dictamnus);
    } },
    { id: "dictamnus_walker", name: "白藓花径旅人", desc: "走过白藓花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dictamnus_path);
    } },
    { id: "burning_bush_sill", name: "燃烧灌木窗台", desc: "发现燃烧灌木", check: function (s) {
      return !!(s.discovered && s.discovered.burning_bush);
    } },
    { id: "burning_bush_walker", name: "燃烧灌木径旅人", desc: "走过燃烧灌木短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.burning_bush_path);
    } },
    { id: "chamomile_roman_sill", name: "罗马洋甘菊窗台", desc: "发现罗马洋甘菊", check: function (s) {
      return !!(s.discovered && s.discovered.chamomile_roman);
    } },
    { id: "chamomile_roman_walker", name: "罗马洋甘菊径旅人", desc: "走过罗马洋甘菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chamomile_roman_path);
    } },
    { id: "chamomile_german_sill", name: "德国洋甘菊窗台", desc: "发现德国洋甘菊", check: function (s) {
      return !!(s.discovered && s.discovered.chamomile_german);
    } },
    { id: "chamomile_german_walker", name: "德国洋甘菊径旅人", desc: "走过德国洋甘菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chamomile_german_path);
    } },
    { id: "feverfew_fresh_sill", name: "鲜小白菊窗台", desc: "发现鲜小白菊", check: function (s) {
      return !!(s.discovered && s.discovered.feverfew_fresh);
    } },
    { id: "feverfew_fresh_walker", name: "鲜小白菊径旅人", desc: "走过鲜小白菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.feverfew_fresh_path);
    } },
    { id: "tansy_fresh_sill", name: "鲜艾菊窗台", desc: "发现鲜艾菊", check: function (s) {
      return !!(s.discovered && s.discovered.tansy_fresh);
    } },
    { id: "tansy_fresh_walker", name: "鲜艾菊径旅人", desc: "走过鲜艾菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.tansy_fresh_path);
    } },
    { id: "yarrow_pink_sill", name: "粉蓍草窗台", desc: "发现粉蓍草", check: function (s) {
      return !!(s.discovered && s.discovered.yarrow_pink);
    } },
    { id: "yarrow_pink_walker", name: "粉蓍草径旅人", desc: "走过粉蓍草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yarrow_pink_path);
    } },
    { id: "yarrow_gold_sill", name: "金蓍草窗台", desc: "发现金蓍草", check: function (s) {
      return !!(s.discovered && s.discovered.yarrow_gold);
    } },
    { id: "yarrow_gold_walker", name: "金蓍草径旅人", desc: "走过金蓍草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yarrow_gold_path);
    } },
    { id: "arnica_fresh_sill", name: "鲜山金车窗台", desc: "发现鲜山金车", check: function (s) {
      return !!(s.discovered && s.discovered.arnica_fresh);
    } },
    { id: "arnica_fresh_walker", name: "鲜山金车径旅人", desc: "走过鲜山金车短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.arnica_fresh_path);
    } },
    { id: "calendula_offic_sill", name: "药用金盏窗台", desc: "发现药用金盏", check: function (s) {
      return !!(s.discovered && s.discovered.calendula_offic);
    } },
    { id: "calendula_offic_walker", name: "药用金盏径旅人", desc: "走过药用金盏短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.calendula_offic_path);
    } },
    { id: "pot_marigold_dbl_sill", name: "重瓣金盏窗台", desc: "发现重瓣金盏", check: function (s) {
      return !!(s.discovered && s.discovered.pot_marigold_dbl);
    } },
    { id: "pot_marigold_dbl_walker", name: "重瓣金盏径旅人", desc: "走过重瓣金盏短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pot_marigold_dbl_path);
    } },
    { id: "tagetes_sill", name: "万寿菊窗台", desc: "发现万寿菊", check: function (s) {
      return !!(s.discovered && s.discovered.tagetes);
    } },
    { id: "tagetes_walker", name: "万寿菊径旅人", desc: "走过万寿菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.tagetes_path);
    } },
    { id: "marigold_french_sill", name: "法国万寿窗台", desc: "发现法国万寿", check: function (s) {
      return !!(s.discovered && s.discovered.marigold_french);
    } },
    { id: "marigold_french_walker", name: "法国万寿径旅人", desc: "走过法国万寿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.marigold_french_path);
    } },
    { id: "signet_marigold_sill", name: "香叶万寿窗台", desc: "发现香叶万寿", check: function (s) {
      return !!(s.discovered && s.discovered.signet_marigold);
    } },
    { id: "signet_marigold_walker", name: "香叶万寿径旅人", desc: "走过香叶万寿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.signet_marigold_path);
    } },
    { id: "costmary_fresh_sill", name: "鲜艾菊薄荷窗台", desc: "发现鲜艾菊薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.costmary_fresh);
    } },
    { id: "costmary_fresh_walker", name: "鲜艾菊薄荷径旅人", desc: "走过鲜艾菊薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.costmary_fresh_path);
    } },
    { id: "elecampane_fresh_sill", name: "鲜土木香窗台", desc: "发现鲜土木香", check: function (s) {
      return !!(s.discovered && s.discovered.elecampane_fresh);
    } },
    { id: "elecampane_fresh_walker", name: "鲜土木香径旅人", desc: "走过鲜土木香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.elecampane_fresh_path);
    } },
    { id: "inula_sill", name: "旋覆花窗台", desc: "发现旋覆花", check: function (s) {
      return !!(s.discovered && s.discovered.inula);
    } },
    { id: "inula_walker", name: "旋覆花径旅人", desc: "走过旋覆花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.inula_path);
    } },
    { id: "eupatorium_sill", name: "佩兰窗台", desc: "发现佩兰", check: function (s) {
      return !!(s.discovered && s.discovered.eupatorium);
    } },
    { id: "eupatorium_walker", name: "佩兰径旅人", desc: "走过佩兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.eupatorium_path);
    } },
    { id: "echinacea_purp_sill", name: "紫松果菊窗台", desc: "发现紫松果菊", check: function (s) {
      return !!(s.discovered && s.discovered.echinacea_purp);
    } },
    { id: "echinacea_purp_walker", name: "紫松果菊径旅人", desc: "走过紫松果菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.echinacea_purp_path);
    } },
    { id: "echinacea_ang_sill", name: "狭叶紫锥窗台", desc: "发现狭叶紫锥", check: function (s) {
      return !!(s.discovered && s.discovered.echinacea_ang);
    } },
    { id: "echinacea_ang_walker", name: "狭叶紫锥径旅人", desc: "走过狭叶紫锥短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.echinacea_ang_path);
    } },
    { id: "echinacea_pall_sill", name: "淡紫锥菊窗台", desc: "发现淡紫锥菊", check: function (s) {
      return !!(s.discovered && s.discovered.echinacea_pall);
    } },
    { id: "echinacea_pall_walker", name: "淡紫锥菊径旅人", desc: "走过淡紫锥菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.echinacea_pall_path);
    } },
    { id: "rudbeckia_sill", name: "金光菊窗台", desc: "发现金光菊", check: function (s) {
      return !!(s.discovered && s.discovered.rudbeckia);
    } },
    { id: "rudbeckia_walker", name: "金光菊径旅人", desc: "走过金光菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rudbeckia_path);
    } },
    { id: "black_eyed_susan_sill", name: "黑心金光窗台", desc: "发现黑心金光", check: function (s) {
      return !!(s.discovered && s.discovered.black_eyed_susan);
    } },
    { id: "black_eyed_susan_walker", name: "黑心金光径旅人", desc: "走过黑心金光短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.black_eyed_susan_path);
    } },
    { id: "coneflower_yellow_sill", name: "黄松果菊窗台", desc: "发现黄松果菊", check: function (s) {
      return !!(s.discovered && s.discovered.coneflower_yellow);
    } },
    { id: "coneflower_yellow_walker", name: "黄松果菊径旅人", desc: "走过黄松果菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.coneflower_yellow_path);
    } },
    { id: "helenium_sill", name: "堆心菊窗台", desc: "发现堆心菊", check: function (s) {
      return !!(s.discovered && s.discovered.helenium);
    } },
    { id: "helenium_walker", name: "堆心菊径旅人", desc: "走过堆心菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.helenium_path);
    } },
    { id: "helenium_autumn_sill", name: "秋堆心菊窗台", desc: "发现秋堆心菊", check: function (s) {
      return !!(s.discovered && s.discovered.helenium_autumn);
    } },
    { id: "helenium_autumn_walker", name: "秋堆心菊径旅人", desc: "走过秋堆心菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.helenium_autumn_path);
    } },
    { id: "coreopsis_lance_sill", name: "剑叶金鸡窗台", desc: "发现剑叶金鸡", check: function (s) {
      return !!(s.discovered && s.discovered.coreopsis_lance);
    } },
    { id: "coreopsis_lance_walker", name: "剑叶金鸡径旅人", desc: "走过剑叶金鸡短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.coreopsis_lance_path);
    } },
    { id: "coreopsis_tick_sill", name: "两色金鸡窗台", desc: "发现两色金鸡", check: function (s) {
      return !!(s.discovered && s.discovered.coreopsis_tick);
    } },
    { id: "coreopsis_tick_walker", name: "两色金鸡径旅人", desc: "走过两色金鸡短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.coreopsis_tick_path);
    } },
    { id: "gaillardia_sill", name: "天人菊窗台", desc: "发现天人菊", check: function (s) {
      return !!(s.discovered && s.discovered.gaillardia);
    } },
    { id: "gaillardia_walker", name: "天人菊径旅人", desc: "走过天人菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.gaillardia_path);
    } },
    { id: "gaillardia_fan_sill", name: "扇形天人窗台", desc: "发现扇形天人", check: function (s) {
      return !!(s.discovered && s.discovered.gaillardia_fan);
    } },
    { id: "gaillardia_fan_walker", name: "扇形天人径旅人", desc: "走过扇形天人短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.gaillardia_fan_path);
    } },
    { id: "ratibida_sill", name: "草原松果窗台", desc: "发现草原松果", check: function (s) {
      return !!(s.discovered && s.discovered.ratibida);
    } },
    { id: "ratibida_walker", name: "草原松果径旅人", desc: "走过草原松果短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ratibida_path);
    } },
    { id: "silphium_sill", name: "杯叶菊窗台", desc: "发现杯叶菊", check: function (s) {
      return !!(s.discovered && s.discovered.silphium);
    } },
    { id: "silphium_walker", name: "杯叶菊径旅人", desc: "走过杯叶菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.silphium_path);
    } },
    { id: "cup_plant_sill", name: "杯托菊窗台", desc: "发现杯托菊", check: function (s) {
      return !!(s.discovered && s.discovered.cup_plant);
    } },
    { id: "cup_plant_walker", name: "杯托菊径旅人", desc: "走过杯托菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cup_plant_path);
    } },
    { id: "compass_plant_sill", name: "罗盘草窗台", desc: "发现罗盘草", check: function (s) {
      return !!(s.discovered && s.discovered.compass_plant);
    } },
    { id: "compass_plant_walker", name: "罗盘草径旅人", desc: "走过罗盘草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.compass_plant_path);
    } },
    { id: "aster_novae_sill", name: "新英格兰紫菀窗台", desc: "发现新英格兰紫菀", check: function (s) {
      return !!(s.discovered && s.discovered.aster_novae);
    } },
    { id: "aster_novae_walker", name: "新英格兰紫菀径旅人", desc: "走过新英格兰紫菀短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.aster_novae_path);
    } },
    { id: "aster_novi_sill", name: "纽约紫菀窗台", desc: "发现纽约紫菀", check: function (s) {
      return !!(s.discovered && s.discovered.aster_novi);
    } },
    { id: "aster_novi_walker", name: "纽约紫菀径旅人", desc: "走过纽约紫菀短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.aster_novi_path);
    } },
    { id: "michaelmas_sill", name: "米迦勒紫菀窗台", desc: "发现米迦勒紫菀", check: function (s) {
      return !!(s.discovered && s.discovered.michaelmas);
    } },
    { id: "michaelmas_walker", name: "米迦勒紫菀径旅人", desc: "走过米迦勒紫菀短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.michaelmas_path);
    } },
    { id: "goldenrod_fresh_sill", name: "鲜一枝黄窗台", desc: "发现鲜一枝黄", check: function (s) {
      return !!(s.discovered && s.discovered.goldenrod_fresh);
    } },
    { id: "goldenrod_fresh_walker", name: "鲜一枝黄径旅人", desc: "走过鲜一枝黄短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.goldenrod_fresh_path);
    } },
    { id: "solidago_sill", name: "加拿大一枝黄窗台", desc: "发现加拿大一枝黄", check: function (s) {
      return !!(s.discovered && s.discovered.solidago);
    } },
    { id: "solidago_walker", name: "加拿大一枝黄径旅人", desc: "走过加拿大一枝黄短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.solidago_path);
    } },
    { id: "boltonia_sill", name: "千星菊窗台", desc: "发现千星菊", check: function (s) {
      return !!(s.discovered && s.discovered.boltonia);
    } },
    { id: "boltonia_walker", name: "千星菊径旅人", desc: "走过千星菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.boltonia_path);
    } },
    { id: "erigeron_sill", name: "飞蓬窗台", desc: "发现飞蓬", check: function (s) {
      return !!(s.discovered && s.discovered.erigeron);
    } },
    { id: "erigeron_walker", name: "飞蓬径旅人", desc: "走过飞蓬短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.erigeron_path);
    } },
    { id: "fleabane_sill", name: "春飞蓬窗台", desc: "发现春飞蓬", check: function (s) {
      return !!(s.discovered && s.discovered.fleabane);
    } },
    { id: "fleabane_walker", name: "春飞蓬径旅人", desc: "走过春飞蓬短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fleabane_path);
    } },
    { id: "daisy_oxeye_sill", name: "滨菊鲜窗台", desc: "发现滨菊鲜", check: function (s) {
      return !!(s.discovered && s.discovered.daisy_oxeye);
    } },
    { id: "daisy_oxeye_walker", name: "滨菊鲜径旅人", desc: "走过滨菊鲜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.daisy_oxeye_path);
    } },
    { id: "daisy_english_sill", name: "英国雏菊窗台", desc: "发现英国雏菊", check: function (s) {
      return !!(s.discovered && s.discovered.daisy_english);
    } },
    { id: "daisy_english_walker", name: "英国雏菊径旅人", desc: "走过英国雏菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.daisy_english_path);
    } },
    { id: "daisy_shasta_sill", name: "滨菊大窗台", desc: "发现滨菊大", check: function (s) {
      return !!(s.discovered && s.discovered.daisy_shasta);
    } },
    { id: "daisy_shasta_walker", name: "滨菊大径旅人", desc: "走过滨菊大短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.daisy_shasta_path);
    } },
    { id: "chrysanthemum_ind_fresh_sill", name: "鲜印菊窗台", desc: "发现鲜印菊", check: function (s) {
      return !!(s.discovered && s.discovered.chrysanthemum_ind_fresh);
    } },
    { id: "chrysanthemum_ind_fresh_walker", name: "鲜印菊径旅人", desc: "走过鲜印菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chrysanthemum_ind_fresh_path);
    } },
    { id: "chrysanthemum_mor_sill", name: "杭白菊窗台", desc: "发现杭白菊", check: function (s) {
      return !!(s.discovered && s.discovered.chrysanthemum_mor);
    } },
    { id: "chrysanthemum_mor_walker", name: "杭白菊径旅人", desc: "走过杭白菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chrysanthemum_mor_path);
    } },
    { id: "chrysanthemum_yej_sill", name: "野菊窗台", desc: "发现野菊", check: function (s) {
      return !!(s.discovered && s.discovered.chrysanthemum_yej);
    } },
    { id: "chrysanthemum_yej_walker", name: "野菊径旅人", desc: "走过野菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chrysanthemum_yej_path);
    } },
    { id: "tanacetum_sill", name: "菊蒿窗台", desc: "发现菊蒿", check: function (s) {
      return !!(s.discovered && s.discovered.tanacetum);
    } },
    { id: "tanacetum_walker", name: "菊蒿径旅人", desc: "走过菊蒿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.tanacetum_path);
    } },
    { id: "pyrethrum_sill", name: "除虫菊窗台", desc: "发现除虫菊", check: function (s) {
      return !!(s.discovered && s.discovered.pyrethrum);
    } },
    { id: "pyrethrum_walker", name: "除虫菊径旅人", desc: "走过除虫菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pyrethrum_path);
    } },
    { id: "sunflower_dwarf_sill", name: "矮向日葵窗台", desc: "发现矮向日葵", check: function (s) {
      return !!(s.discovered && s.discovered.sunflower_dwarf);
    } },
    { id: "sunflower_dwarf_walker", name: "矮向日葵径旅人", desc: "走过矮向日葵短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sunflower_dwarf_path);
    } },
    { id: "sunflower_multi_sill", name: "多头向日葵窗台", desc: "发现多头向日葵", check: function (s) {
      return !!(s.discovered && s.discovered.sunflower_multi);
    } },
    { id: "sunflower_multi_walker", name: "多头向日葵径旅人", desc: "走过多头向日葵短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sunflower_multi_path);
    } },
    { id: "sunflower_red_sill", name: "红向日葵窗台", desc: "发现红向日葵", check: function (s) {
      return !!(s.discovered && s.discovered.sunflower_red);
    } },
    { id: "sunflower_red_walker", name: "红向日葵径旅人", desc: "走过红向日葵短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sunflower_red_path);
    } },
    { id: "jerusalem_artichoke_sill", name: "菊芋窗台", desc: "发现菊芋", check: function (s) {
      return !!(s.discovered && s.discovered.jerusalem_artichoke);
    } },
    { id: "jerusalem_artichoke_walker", name: "菊芋径旅人", desc: "走过菊芋短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.jerusalem_artichoke_path);
    } },
    { id: "sunchoke_flower_sill", name: "菊芋花窗台", desc: "发现菊芋花", check: function (s) {
      return !!(s.discovered && s.discovered.sunchoke_flower);
    } },
    { id: "sunchoke_flower_walker", name: "菊芋花径旅人", desc: "走过菊芋花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sunchoke_flower_path);
    } },
    { id: "topinambur_sill", name: "洋姜窗台", desc: "发现洋姜", check: function (s) {
      return !!(s.discovered && s.discovered.topinambur);
    } },
    { id: "topinambur_walker", name: "洋姜径旅人", desc: "走过洋姜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.topinambur_path);
    } },
    { id: "dahlia_cactus_sill", name: "仙人掌大丽窗台", desc: "发现仙人掌大丽", check: function (s) {
      return !!(s.discovered && s.discovered.dahlia_cactus);
    } },
    { id: "dahlia_cactus_walker", name: "仙人掌大丽径旅人", desc: "走过仙人掌大丽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dahlia_cactus_path);
    } },
    { id: "dahlia_pompom_sill", name: "绒球大丽窗台", desc: "发现绒球大丽", check: function (s) {
      return !!(s.discovered && s.discovered.dahlia_pompom);
    } },
    { id: "dahlia_pompom_walker", name: "绒球大丽径旅人", desc: "走过绒球大丽短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dahlia_pompom_path);
    } },
    { id: "zinnia_dwarf_sill", name: "矮百日草窗台", desc: "发现矮百日草", check: function (s) {
      return !!(s.discovered && s.discovered.zinnia_dwarf);
    } },
    { id: "zinnia_dwarf_walker", name: "矮百日草径旅人", desc: "走过矮百日草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.zinnia_dwarf_path);
    } },
    { id: "zinnia_cactus_sill", name: "仙人掌百日窗台", desc: "发现仙人掌百日", check: function (s) {
      return !!(s.discovered && s.discovered.zinnia_cactus);
    } },
    { id: "zinnia_cactus_walker", name: "仙人掌百日径旅人", desc: "走过仙人掌百日短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.zinnia_cactus_path);
    } },
    { id: "cosmos_sulph_sill", name: "硫华菊窗台", desc: "发现硫华菊", check: function (s) {
      return !!(s.discovered && s.discovered.cosmos_sulph);
    } },
    { id: "cosmos_sulph_walker", name: "硫华菊径旅人", desc: "走过硫华菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cosmos_sulph_path);
    } },
    { id: "cosmos_choco_sill", name: "巧克力波斯窗台", desc: "发现巧克力波斯", check: function (s) {
      return !!(s.discovered && s.discovered.cosmos_choco);
    } },
    { id: "cosmos_choco_walker", name: "巧克力波斯径旅人", desc: "走过巧克力波斯短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cosmos_choco_path);
    } },
    { id: "tithonia_sill", name: "肿柄菊窗台", desc: "发现肿柄菊", check: function (s) {
      return !!(s.discovered && s.discovered.tithonia);
    } },
    { id: "tithonia_walker", name: "肿柄菊径旅人", desc: "走过肿柄菊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.tithonia_path);
    } },
    { id: "mexican_sunflower_sill", name: "墨西哥向日葵窗台", desc: "发现墨西哥向日葵", check: function (s) {
      return !!(s.discovered && s.discovered.mexican_sunflower);
    } },
    { id: "mexican_sunflower_walker", name: "墨西哥向日葵径旅人", desc: "走过墨西哥向日葵短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mexican_sunflower_path);
    } },
    { id: "heliopsis_sill", name: "假向日葵窗台", desc: "发现假向日葵", check: function (s) {
      return !!(s.discovered && s.discovered.heliopsis);
    } },
    { id: "heliopsis_walker", name: "假向日葵径旅人", desc: "走过假向日葵短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.heliopsis_path);
    } },
    { id: "inula_helenium_sill", name: "土木香欧窗台", desc: "发现土木香欧", check: function (s) {
      return !!(s.discovered && s.discovered.inula_helenium);
    } },
    { id: "inula_helenium_walker", name: "土木香欧径旅人", desc: "走过土木香欧短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.inula_helenium_path);
    } },
    { id: "verbena_bon_sill", name: "柳叶马鞭草窗台", desc: "发现柳叶马鞭草", check: function (s) {
      return !!(s.discovered && s.discovered.verbena_bon);
    } },
    { id: "verbena_bon_walker", name: "柳叶马鞭草径旅人", desc: "走过柳叶马鞭草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.verbena_bon_path);
    } },
    { id: "verbena_rig_sill", name: "硬枝马鞭草窗台", desc: "发现硬枝马鞭草", check: function (s) {
      return !!(s.discovered && s.discovered.verbena_rig);
    } },
    { id: "verbena_rig_walker", name: "硬枝马鞭草径旅人", desc: "走过硬枝马鞭草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.verbena_rig_path);
    } },
    { id: "lantana_sill", name: "马缨丹窗台", desc: "发现马缨丹", check: function (s) {
      return !!(s.discovered && s.discovered.lantana);
    } },
    { id: "lantana_walker", name: "马缨丹径旅人", desc: "走过马缨丹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lantana_path);
    } },
    { id: "lantana_white_sill", name: "白马缨丹窗台", desc: "发现白马缨丹", check: function (s) {
      return !!(s.discovered && s.discovered.lantana_white);
    } },
    { id: "lantana_white_walker", name: "白马缨丹径旅人", desc: "走过白马缨丹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lantana_white_path);
    } },
    { id: "phlox_pan_sill", name: "锥花福禄考窗台", desc: "发现锥花福禄考", check: function (s) {
      return !!(s.discovered && s.discovered.phlox_pan);
    } },
    { id: "phlox_pan_walker", name: "锥花福禄考径旅人", desc: "走过锥花福禄考短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.phlox_pan_path);
    } },
    { id: "phlox_sub_sill", name: "针叶福禄考窗台", desc: "发现针叶福禄考", check: function (s) {
      return !!(s.discovered && s.discovered.phlox_sub);
    } },
    { id: "phlox_sub_walker", name: "针叶福禄考径旅人", desc: "走过针叶福禄考短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.phlox_sub_path);
    } },
    { id: "phlox_drum_sill", name: "小福禄考窗台", desc: "发现小福禄考", check: function (s) {
      return !!(s.discovered && s.discovered.phlox_drum);
    } },
    { id: "phlox_drum_walker", name: "小福禄考径旅人", desc: "走过小福禄考短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.phlox_drum_path);
    } },
    { id: "dianthus_chin_sill", name: "石竹窗台", desc: "发现石竹", check: function (s) {
      return !!(s.discovered && s.discovered.dianthus_chin);
    } },
    { id: "dianthus_chin_walker", name: "石竹径旅人", desc: "走过石竹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dianthus_chin_path);
    } },
    { id: "dianthus_barb_sill", name: "须苞石竹窗台", desc: "发现须苞石竹", check: function (s) {
      return !!(s.discovered && s.discovered.dianthus_barb);
    } },
    { id: "dianthus_barb_walker", name: "须苞石竹径旅人", desc: "走过须苞石竹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dianthus_barb_path);
    } },
    { id: "sweet_william_sill", name: "美国石竹窗台", desc: "发现美国石竹", check: function (s) {
      return !!(s.discovered && s.discovered.sweet_william);
    } },
    { id: "sweet_william_walker", name: "美国石竹径旅人", desc: "走过美国石竹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sweet_william_path);
    } },
    { id: "carnation_sill", name: "康乃馨窗台", desc: "发现康乃馨", check: function (s) {
      return !!(s.discovered && s.discovered.carnation);
    } },
    { id: "carnation_walker", name: "康乃馨径旅人", desc: "走过康乃馨短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.carnation_path);
    } },
    { id: "pinks_sill", name: "常夏石竹窗台", desc: "发现常夏石竹", check: function (s) {
      return !!(s.discovered && s.discovered.pinks);
    } },
    { id: "pinks_walker", name: "常夏石竹径旅人", desc: "走过常夏石竹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pinks_path);
    } },
    { id: "gypsophila_sill", name: "满天星窗台", desc: "发现满天星", check: function (s) {
      return !!(s.discovered && s.discovered.gypsophila);
    } },
    { id: "gypsophila_walker", name: "满天星径旅人", desc: "走过满天星短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.gypsophila_path);
    } },
    { id: "baby_breath_sill", name: "霞草窗台", desc: "发现霞草", check: function (s) {
      return !!(s.discovered && s.discovered.baby_breath);
    } },
    { id: "baby_breath_walker", name: "霞草径旅人", desc: "走过霞草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.baby_breath_path);
    } },
    { id: "saponaria_sill", name: "肥皂草窗台", desc: "发现肥皂草", check: function (s) {
      return !!(s.discovered && s.discovered.saponaria);
    } },
    { id: "saponaria_walker", name: "肥皂草径旅人", desc: "走过肥皂草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.saponaria_path);
    } },
    { id: "soapwort_fresh_sill", name: "鲜皂草窗台", desc: "发现鲜皂草", check: function (s) {
      return !!(s.discovered && s.discovered.soapwort_fresh);
    } },
    { id: "soapwort_fresh_walker", name: "鲜皂草径旅人", desc: "走过鲜皂草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.soapwort_fresh_path);
    } },
    { id: "campanula_sill", name: "风铃草属窗台", desc: "发现风铃草属", check: function (s) {
      return !!(s.discovered && s.discovered.campanula);
    } },
    { id: "campanula_walker", name: "风铃草属径旅人", desc: "走过风铃草属短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.campanula_path);
    } },
    { id: "campanula_med_sill", name: "地中海风铃窗台", desc: "发现地中海风铃", check: function (s) {
      return !!(s.discovered && s.discovered.campanula_med);
    } },
    { id: "campanula_med_walker", name: "地中海风铃径旅人", desc: "走过地中海风铃短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.campanula_med_path);
    } },
    { id: "lobelia_sill", name: "半边莲窗台", desc: "发现半边莲", check: function (s) {
      return !!(s.discovered && s.discovered.lobelia);
    } },
    { id: "lobelia_walker", name: "半边莲径旅人", desc: "走过半边莲短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lobelia_path);
    } },
    { id: "lobelia_card_sill", name: "红半边莲窗台", desc: "发现红半边莲", check: function (s) {
      return !!(s.discovered && s.discovered.lobelia_card);
    } },
    { id: "lobelia_card_walker", name: "红半边莲径旅人", desc: "走过红半边莲短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lobelia_card_path);
    } },
    { id: "penstemon_sill", name: "钓钟柳窗台", desc: "发现钓钟柳", check: function (s) {
      return !!(s.discovered && s.discovered.penstemon);
    } },
    { id: "penstemon_walker", name: "钓钟柳径旅人", desc: "走过钓钟柳短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.penstemon_path);
    } },
    { id: "penstemon_fox_sill", name: "狐尾钓钟柳窗台", desc: "发现狐尾钓钟柳", check: function (s) {
      return !!(s.discovered && s.discovered.penstemon_fox);
    } },
    { id: "penstemon_fox_walker", name: "狐尾钓钟柳径旅人", desc: "走过狐尾钓钟柳短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.penstemon_fox_path);
    } },
    { id: "digitalis_sill", name: "毛地黄窗台", desc: "发现毛地黄", check: function (s) {
      return !!(s.discovered && s.discovered.digitalis);
    } },
    { id: "digitalis_walker", name: "毛地黄径旅人", desc: "走过毛地黄短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.digitalis_path);
    } },
    { id: "digitalis_lutea_sill", name: "黄毛地黄窗台", desc: "发现黄毛地黄", check: function (s) {
      return !!(s.discovered && s.discovered.digitalis_lutea);
    } },
    { id: "digitalis_lutea_walker", name: "黄毛地黄径旅人", desc: "走过黄毛地黄短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.digitalis_lutea_path);
    } },
    { id: "snapdragon_sill", name: "金鱼草窗台", desc: "发现金鱼草", check: function (s) {
      return !!(s.discovered && s.discovered.snapdragon);
    } },
    { id: "snapdragon_walker", name: "金鱼草径旅人", desc: "走过金鱼草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.snapdragon_path);
    } },
    { id: "snapdragon_dwarf_sill", name: "矮金鱼草窗台", desc: "发现矮金鱼草", check: function (s) {
      return !!(s.discovered && s.discovered.snapdragon_dwarf);
    } },
    { id: "snapdragon_dwarf_walker", name: "矮金鱼草径旅人", desc: "走过矮金鱼草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.snapdragon_dwarf_path);
    } },
    { id: "antirrhinum_sill", name: "龙口花窗台", desc: "发现龙口花", check: function (s) {
      return !!(s.discovered && s.discovered.antirrhinum);
    } },
    { id: "antirrhinum_walker", name: "龙口花径旅人", desc: "走过龙口花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.antirrhinum_path);
    } },
    { id: "linaria_sill", name: "柳穿鱼窗台", desc: "发现柳穿鱼", check: function (s) {
      return !!(s.discovered && s.discovered.linaria);
    } },
    { id: "linaria_walker", name: "柳穿鱼径旅人", desc: "走过柳穿鱼短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.linaria_path);
    } },
    { id: "toadflax_sill", name: "普通柳穿窗台", desc: "发现普通柳穿", check: function (s) {
      return !!(s.discovered && s.discovered.toadflax);
    } },
    { id: "toadflax_walker", name: "普通柳穿径旅人", desc: "走过普通柳穿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.toadflax_path);
    } },
    { id: "verbascum_chaix_sill", name: "网脉毛蕊窗台", desc: "发现网脉毛蕊", check: function (s) {
      return !!(s.discovered && s.discovered.verbascum_chaix);
    } },
    { id: "verbascum_chaix_walker", name: "网脉毛蕊径旅人", desc: "走过网脉毛蕊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.verbascum_chaix_path);
    } },
    { id: "mullein_white_sill", name: "白毛蕊窗台", desc: "发现白毛蕊", check: function (s) {
      return !!(s.discovered && s.discovered.mullein_white);
    } },
    { id: "mullein_white_walker", name: "白毛蕊径旅人", desc: "走过白毛蕊短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mullein_white_path);
    } },
    { id: "figwort_fresh_sill", name: "鲜玄参窗台", desc: "发现鲜玄参", check: function (s) {
      return !!(s.discovered && s.discovered.figwort_fresh);
    } },
    { id: "figwort_fresh_walker", name: "鲜玄参径旅人", desc: "走过鲜玄参短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.figwort_fresh_path);
    } },
    { id: "scrophularia_sill", name: "玄参属窗台", desc: "发现玄参属", check: function (s) {
      return !!(s.discovered && s.discovered.scrophularia);
    } },
    { id: "scrophularia_walker", name: "玄参属径旅人", desc: "走过玄参属短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.scrophularia_path);
    } },
    { id: "mimulus_sill", name: "沟酸浆窗台", desc: "发现沟酸浆", check: function (s) {
      return !!(s.discovered && s.discovered.mimulus);
    } },
    { id: "mimulus_walker", name: "沟酸浆径旅人", desc: "走过沟酸浆短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mimulus_path);
    } },
    { id: "monkeyflower_sill", name: "猴面花窗台", desc: "发现猴面花", check: function (s) {
      return !!(s.discovered && s.discovered.monkeyflower);
    } },
    { id: "monkeyflower_walker", name: "猴面花径旅人", desc: "走过猴面花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.monkeyflower_path);
    } },
    { id: "collinsia_sill", name: "可林草窗台", desc: "发现可林草", check: function (s) {
      return !!(s.discovered && s.discovered.collinsia);
    } },
    { id: "collinsia_walker", name: "可林草径旅人", desc: "走过可林草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.collinsia_path);
    } },
    { id: "castilleja_sill", name: "火焰草窗台", desc: "发现火焰草", check: function (s) {
      return !!(s.discovered && s.discovered.castilleja);
    } },
    { id: "castilleja_walker", name: "火焰草径旅人", desc: "走过火焰草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.castilleja_path);
    } },
    { id: "paintbrush_sill", name: "印地安画笔窗台", desc: "发现印地安画笔", check: function (s) {
      return !!(s.discovered && s.discovered.paintbrush);
    } },
    { id: "paintbrush_walker", name: "印地安画笔径旅人", desc: "走过印地安画笔短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.paintbrush_path);
    } },
    { id: "orthocarpus_sill", name: "直果草窗台", desc: "发现直果草", check: function (s) {
      return !!(s.discovered && s.discovered.orthocarpus);
    } },
    { id: "orthocarpus_walker", name: "直果草径旅人", desc: "走过直果草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.orthocarpus_path);
    } },
    { id: "pedicularis_sill", name: "马先蒿窗台", desc: "发现马先蒿", check: function (s) {
      return !!(s.discovered && s.discovered.pedicularis);
    } },
    { id: "pedicularis_walker", name: "马先蒿径旅人", desc: "走过马先蒿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pedicularis_path);
    } },
    { id: "lousewort_sill", name: "虱草窗台", desc: "发现虱草", check: function (s) {
      return !!(s.discovered && s.discovered.lousewort);
    } },
    { id: "lousewort_walker", name: "虱草径旅人", desc: "走过虱草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lousewort_path);
    } },
    { id: "euphrasia_sill", name: "小米草窗台", desc: "发现小米草", check: function (s) {
      return !!(s.discovered && s.discovered.euphrasia);
    } },
    { id: "euphrasia_walker", name: "小米草径旅人", desc: "走过小米草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.euphrasia_path);
    } },
    { id: "eyebright_sill", name: "光明草窗台", desc: "发现光明草", check: function (s) {
      return !!(s.discovered && s.discovered.eyebright);
    } },
    { id: "eyebright_walker", name: "光明草径旅人", desc: "走过光明草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.eyebright_path);
    } },
    { id: "rhinanthus_sill", name: "鼻花窗台", desc: "发现鼻花", check: function (s) {
      return !!(s.discovered && s.discovered.rhinanthus);
    } },
    { id: "rhinanthus_walker", name: "鼻花径旅人", desc: "走过鼻花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rhinanthus_path);
    } },
    { id: "yellow_rattle_sill", name: "黄响铃窗台", desc: "发现黄响铃", check: function (s) {
      return !!(s.discovered && s.discovered.yellow_rattle);
    } },
    { id: "yellow_rattle_walker", name: "黄响铃径旅人", desc: "走过黄响铃短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yellow_rattle_path);
    } },
    { id: "melampyrum_sill", name: "山罗花窗台", desc: "发现山罗花", check: function (s) {
      return !!(s.discovered && s.discovered.melampyrum);
    } },
    { id: "melampyrum_walker", name: "山罗花径旅人", desc: "走过山罗花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.melampyrum_path);
    } },
    { id: "cow_wheat_sill", name: "牛麦窗台", desc: "发现牛麦", check: function (s) {
      return !!(s.discovered && s.discovered.cow_wheat);
    } },
    { id: "cow_wheat_walker", name: "牛麦径旅人", desc: "走过牛麦短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cow_wheat_path);
    } },
    { id: "bartisia_sill", name: "巴氏草窗台", desc: "发现巴氏草", check: function (s) {
      return !!(s.discovered && s.discovered.bartisia);
    } },
    { id: "bartisia_walker", name: "巴氏草径旅人", desc: "走过巴氏草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bartisia_path);
    } },
    { id: "cattleya_sill", name: "卡特兰窗台", desc: "发现卡特兰", check: function (s) {
      return !!(s.discovered && s.discovered.cattleya);
    } },
    { id: "cattleya_walker", name: "卡特兰径旅人", desc: "走过卡特兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cattleya_path);
    } },
    { id: "dendrobium_sill", name: "石斛窗台", desc: "发现石斛", check: function (s) {
      return !!(s.discovered && s.discovered.dendrobium);
    } },
    { id: "dendrobium_walker", name: "石斛径旅人", desc: "走过石斛短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dendrobium_path);
    } },
    { id: "phalaenopsis_sill", name: "蝴蝶兰窗台", desc: "发现蝴蝶兰", check: function (s) {
      return !!(s.discovered && s.discovered.phalaenopsis);
    } },
    { id: "phalaenopsis_walker", name: "蝴蝶兰径旅人", desc: "走过蝴蝶兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.phalaenopsis_path);
    } },
    { id: "cymbidium_sill", name: "建兰窗台", desc: "发现建兰", check: function (s) {
      return !!(s.discovered && s.discovered.cymbidium);
    } },
    { id: "cymbidium_walker", name: "建兰径旅人", desc: "走过建兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cymbidium_path);
    } },
    { id: "oncidium_sill", name: "文心兰窗台", desc: "发现文心兰", check: function (s) {
      return !!(s.discovered && s.discovered.oncidium);
    } },
    { id: "oncidium_walker", name: "文心兰径旅人", desc: "走过文心兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.oncidium_path);
    } },
    { id: "vanda_sill", name: "万代兰窗台", desc: "发现万代兰", check: function (s) {
      return !!(s.discovered && s.discovered.vanda);
    } },
    { id: "vanda_walker", name: "万代兰径旅人", desc: "走过万代兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.vanda_path);
    } },
    { id: "paphiopedilum_sill", name: "兜兰窗台", desc: "发现兜兰", check: function (s) {
      return !!(s.discovered && s.discovered.paphiopedilum);
    } },
    { id: "paphiopedilum_walker", name: "兜兰径旅人", desc: "走过兜兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.paphiopedilum_path);
    } },
    { id: "miltonia_sill", name: "米尔顿兰窗台", desc: "发现米尔顿兰", check: function (s) {
      return !!(s.discovered && s.discovered.miltonia);
    } },
    { id: "miltonia_walker", name: "米尔顿兰径旅人", desc: "走过米尔顿兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.miltonia_path);
    } },
    { id: "odontoglossum_sill", name: "齿瓣兰窗台", desc: "发现齿瓣兰", check: function (s) {
      return !!(s.discovered && s.discovered.odontoglossum);
    } },
    { id: "odontoglossum_walker", name: "齿瓣兰径旅人", desc: "走过齿瓣兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.odontoglossum_path);
    } },
    { id: "brassia_sill", name: "蜘蛛兰窗台", desc: "发现蜘蛛兰", check: function (s) {
      return !!(s.discovered && s.discovered.brassia);
    } },
    { id: "brassia_walker", name: "蜘蛛兰径旅人", desc: "走过蜘蛛兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.brassia_path);
    } },
    { id: "epidendrum_sill", name: "树兰窗台", desc: "发现树兰", check: function (s) {
      return !!(s.discovered && s.discovered.epidendrum);
    } },
    { id: "epidendrum_walker", name: "树兰径旅人", desc: "走过树兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.epidendrum_path);
    } },
    { id: "ludisia_sill", name: "血叶兰窗台", desc: "发现血叶兰", check: function (s) {
      return !!(s.discovered && s.discovered.ludisia);
    } },
    { id: "ludisia_walker", name: "血叶兰径旅人", desc: "走过血叶兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ludisia_path);
    } },
    { id: "anoectochilus_sill", name: "金线莲窗台", desc: "发现金线莲", check: function (s) {
      return !!(s.discovered && s.discovered.anoectochilus);
    } },
    { id: "anoectochilus_walker", name: "金线莲径旅人", desc: "走过金线莲短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.anoectochilus_path);
    } },
    { id: "gastrodia_sill", name: "天麻窗台", desc: "发现天麻", check: function (s) {
      return !!(s.discovered && s.discovered.gastrodia);
    } },
    { id: "gastrodia_walker", name: "天麻径旅人", desc: "走过天麻短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.gastrodia_path);
    } },
    { id: "bletilla_sill", name: "白及窗台", desc: "发现白及", check: function (s) {
      return !!(s.discovered && s.discovered.bletilla);
    } },
    { id: "bletilla_walker", name: "白及径旅人", desc: "走过白及短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bletilla_path);
    } },
    { id: "calanthe_sill", name: "虾脊兰窗台", desc: "发现虾脊兰", check: function (s) {
      return !!(s.discovered && s.discovered.calanthe);
    } },
    { id: "calanthe_walker", name: "虾脊兰径旅人", desc: "走过虾脊兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.calanthe_path);
    } },
    { id: "maidenhair_sill", name: "铁线蕨窗台", desc: "发现铁线蕨", check: function (s) {
      return !!(s.discovered && s.discovered.maidenhair);
    } },
    { id: "maidenhair_walker", name: "铁线蕨径旅人", desc: "走过铁线蕨短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.maidenhair_path);
    } },
    { id: "boston_fern_sill", name: "波士顿蕨窗台", desc: "发现波士顿蕨", check: function (s) {
      return !!(s.discovered && s.discovered.boston_fern);
    } },
    { id: "boston_fern_walker", name: "波士顿蕨径旅人", desc: "走过波士顿蕨短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.boston_fern_path);
    } },
    { id: "bird_nest_fern_sill", name: "鸟巢蕨窗台", desc: "发现鸟巢蕨", check: function (s) {
      return !!(s.discovered && s.discovered.bird_nest_fern);
    } },
    { id: "bird_nest_fern_walker", name: "鸟巢蕨径旅人", desc: "走过鸟巢蕨短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bird_nest_fern_path);
    } },
    { id: "staghorn_sill", name: "鹿角蕨窗台", desc: "发现鹿角蕨", check: function (s) {
      return !!(s.discovered && s.discovered.staghorn);
    } },
    { id: "staghorn_walker", name: "鹿角蕨径旅人", desc: "走过鹿角蕨短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.staghorn_path);
    } },
    { id: "sword_fern_sill", name: "剑叶蕨窗台", desc: "发现剑叶蕨", check: function (s) {
      return !!(s.discovered && s.discovered.sword_fern);
    } },
    { id: "sword_fern_walker", name: "剑叶蕨径旅人", desc: "走过剑叶蕨短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sword_fern_path);
    } },
    { id: "holly_fern_sill", name: "刺叶蕨窗台", desc: "发现刺叶蕨", check: function (s) {
      return !!(s.discovered && s.discovered.holly_fern);
    } },
    { id: "holly_fern_walker", name: "刺叶蕨径旅人", desc: "走过刺叶蕨短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.holly_fern_path);
    } },
    { id: "autumn_fern_sill", name: "秋色蕨窗台", desc: "发现秋色蕨", check: function (s) {
      return !!(s.discovered && s.discovered.autumn_fern);
    } },
    { id: "autumn_fern_walker", name: "秋色蕨径旅人", desc: "走过秋色蕨短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.autumn_fern_path);
    } },
    { id: "japanese_painted_sill", name: "日本彩叶蕨窗台", desc: "发现日本彩叶蕨", check: function (s) {
      return !!(s.discovered && s.discovered.japanese_painted);
    } },
    { id: "japanese_painted_walker", name: "日本彩叶蕨径旅人", desc: "走过日本彩叶蕨短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.japanese_painted_path);
    } },
    { id: "ostrich_fern_sill", name: "鸵鸟蕨窗台", desc: "发现鸵鸟蕨", check: function (s) {
      return !!(s.discovered && s.discovered.ostrich_fern);
    } },
    { id: "ostrich_fern_walker", name: "鸵鸟蕨径旅人", desc: "走过鸵鸟蕨短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ostrich_fern_path);
    } },
    { id: "cinnamon_fern_sill", name: "肉桂蕨窗台", desc: "发现肉桂蕨", check: function (s) {
      return !!(s.discovered && s.discovered.cinnamon_fern);
    } },
    { id: "cinnamon_fern_walker", name: "肉桂蕨径旅人", desc: "走过肉桂蕨短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cinnamon_fern_path);
    } },
    { id: "royal_fern_sill", name: "王蕨窗台", desc: "发现王蕨", check: function (s) {
      return !!(s.discovered && s.discovered.royal_fern);
    } },
    { id: "royal_fern_walker", name: "王蕨径旅人", desc: "走过王蕨短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.royal_fern_path);
    } },
    { id: "sensitive_fern_sill", name: "敏感蕨窗台", desc: "发现敏感蕨", check: function (s) {
      return !!(s.discovered && s.discovered.sensitive_fern);
    } },
    { id: "sensitive_fern_walker", name: "敏感蕨径旅人", desc: "走过敏感蕨短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sensitive_fern_path);
    } },
    { id: "bracken_tip_sill", name: "蕨菜尖窗台", desc: "发现蕨菜尖", check: function (s) {
      return !!(s.discovered && s.discovered.bracken_tip);
    } },
    { id: "bracken_tip_walker", name: "蕨菜尖径旅人", desc: "走过蕨菜尖短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bracken_tip_path);
    } },
    { id: "fiddlehead_sill", name: "拳卷蕨窗台", desc: "发现拳卷蕨", check: function (s) {
      return !!(s.discovered && s.discovered.fiddlehead);
    } },
    { id: "fiddlehead_walker", name: "拳卷蕨径旅人", desc: "走过拳卷蕨短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fiddlehead_path);
    } },
    { id: "adder_tongue_sill", name: "瓶尔小草窗台", desc: "发现瓶尔小草", check: function (s) {
      return !!(s.discovered && s.discovered.adder_tongue);
    } },
    { id: "adder_tongue_walker", name: "瓶尔小草径旅人", desc: "走过瓶尔小草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.adder_tongue_path);
    } },
    { id: "moonwort_sill", name: "阴地蕨窗台", desc: "发现阴地蕨", check: function (s) {
      return !!(s.discovered && s.discovered.moonwort);
    } },
    { id: "moonwort_walker", name: "阴地蕨径旅人", desc: "走过阴地蕨短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.moonwort_path);
    } },
    { id: "miscanthus_sill", name: "芒草窗台", desc: "发现芒草", check: function (s) {
      return !!(s.discovered && s.discovered.miscanthus);
    } },
    { id: "miscanthus_walker", name: "芒草径旅人", desc: "走过芒草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.miscanthus_path);
    } },
    { id: "pampas_sill", name: "蒲苇窗台", desc: "发现蒲苇", check: function (s) {
      return !!(s.discovered && s.discovered.pampas);
    } },
    { id: "pampas_walker", name: "蒲苇径旅人", desc: "走过蒲苇短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pampas_path);
    } },
    { id: "fountain_grass_sill", name: "狼尾草窗台", desc: "发现狼尾草", check: function (s) {
      return !!(s.discovered && s.discovered.fountain_grass);
    } },
    { id: "fountain_grass_walker", name: "狼尾草径旅人", desc: "走过狼尾草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fountain_grass_path);
    } },
    { id: "blue_fescue_sill", name: "蓝羊茅窗台", desc: "发现蓝羊茅", check: function (s) {
      return !!(s.discovered && s.discovered.blue_fescue);
    } },
    { id: "blue_fescue_walker", name: "蓝羊茅径旅人", desc: "走过蓝羊茅短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.blue_fescue_path);
    } },
    { id: "japanese_forest_sill", name: "日本森林草窗台", desc: "发现日本森林草", check: function (s) {
      return !!(s.discovered && s.discovered.japanese_forest);
    } },
    { id: "japanese_forest_walker", name: "日本森林草径旅人", desc: "走过日本森林草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.japanese_forest_path);
    } },
    { id: "hakonechloa_sill", name: "箱根草窗台", desc: "发现箱根草", check: function (s) {
      return !!(s.discovered && s.discovered.hakonechloa);
    } },
    { id: "hakonechloa_walker", name: "箱根草径旅人", desc: "走过箱根草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hakonechloa_path);
    } },
    { id: "carex_morrow_sill", name: "阔叶苔草窗台", desc: "发现阔叶苔草", check: function (s) {
      return !!(s.discovered && s.discovered.carex_morrow);
    } },
    { id: "carex_morrow_walker", name: "阔叶苔草径旅人", desc: "走过阔叶苔草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.carex_morrow_path);
    } },
    { id: "carex_buch_sill", name: "红铜苔草窗台", desc: "发现红铜苔草", check: function (s) {
      return !!(s.discovered && s.discovered.carex_buch);
    } },
    { id: "carex_buch_walker", name: "红铜苔草径旅人", desc: "走过红铜苔草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.carex_buch_path);
    } },
    { id: "juncus_sill", name: "灯心草窗台", desc: "发现灯心草", check: function (s) {
      return !!(s.discovered && s.discovered.juncus);
    } },
    { id: "juncus_walker", name: "灯心草径旅人", desc: "走过灯心草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.juncus_path);
    } },
    { id: "scirpus_sill", name: "藨草窗台", desc: "发现藨草", check: function (s) {
      return !!(s.discovered && s.discovered.scirpus);
    } },
    { id: "scirpus_walker", name: "藨草径旅人", desc: "走过藨草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.scirpus_path);
    } },
    { id: "typha_pollen_sill", name: "香蒲花粉窗台", desc: "发现香蒲花粉", check: function (s) {
      return !!(s.discovered && s.discovered.typha_pollen);
    } },
    { id: "typha_pollen_walker", name: "香蒲花粉径旅人", desc: "走过香蒲花粉短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.typha_pollen_path);
    } },
    { id: "phragmites_sill", name: "芦苇窗台", desc: "发现芦苇", check: function (s) {
      return !!(s.discovered && s.discovered.phragmites);
    } },
    { id: "phragmites_walker", name: "芦苇径旅人", desc: "走过芦苇短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.phragmites_path);
    } },
    { id: "bamboo_moso_sill", name: "毛竹窗台", desc: "发现毛竹", check: function (s) {
      return !!(s.discovered && s.discovered.bamboo_moso);
    } },
    { id: "bamboo_moso_walker", name: "毛竹径旅人", desc: "走过毛竹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bamboo_moso_path);
    } },
    { id: "bamboo_black_sill", name: "紫竹窗台", desc: "发现紫竹", check: function (s) {
      return !!(s.discovered && s.discovered.bamboo_black);
    } },
    { id: "bamboo_black_walker", name: "紫竹径旅人", desc: "走过紫竹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bamboo_black_path);
    } },
    { id: "bamboo_golden_sill", name: "金镶玉竹窗台", desc: "发现金镶玉竹", check: function (s) {
      return !!(s.discovered && s.discovered.bamboo_golden);
    } },
    { id: "bamboo_golden_walker", name: "金镶玉竹径旅人", desc: "走过金镶玉竹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bamboo_golden_path);
    } },
    { id: "arrow_bamboo_sill", name: "矢竹窗台", desc: "发现矢竹", check: function (s) {
      return !!(s.discovered && s.discovered.arrow_bamboo);
    } },
    { id: "arrow_bamboo_walker", name: "矢竹径旅人", desc: "走过矢竹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.arrow_bamboo_path);
    } },
    { id: "echeveria_sill", name: "石莲花窗台", desc: "发现石莲花", check: function (s) {
      return !!(s.discovered && s.discovered.echeveria);
    } },
    { id: "echeveria_walker", name: "石莲花径旅人", desc: "走过石莲花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.echeveria_path);
    } },
    { id: "sedum_morgan_sill", name: "玉树景天窗台", desc: "发现玉树景天", check: function (s) {
      return !!(s.discovered && s.discovered.sedum_morgan);
    } },
    { id: "sedum_morgan_walker", name: "玉树景天径旅人", desc: "走过玉树景天短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sedum_morgan_path);
    } },
    { id: "sedum_spect_sill", name: "八宝景天窗台", desc: "发现八宝景天", check: function (s) {
      return !!(s.discovered && s.discovered.sedum_spect);
    } },
    { id: "sedum_spect_walker", name: "八宝景天径旅人", desc: "走过八宝景天短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sedum_spect_path);
    } },
    { id: "sempervivum_sill", name: "长生草窗台", desc: "发现长生草", check: function (s) {
      return !!(s.discovered && s.discovered.sempervivum);
    } },
    { id: "sempervivum_walker", name: "长生草径旅人", desc: "走过长生草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sempervivum_path);
    } },
    { id: "aeonium_sill", name: "莲花掌窗台", desc: "发现莲花掌", check: function (s) {
      return !!(s.discovered && s.discovered.aeonium);
    } },
    { id: "aeonium_walker", name: "莲花掌径旅人", desc: "走过莲花掌短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.aeonium_path);
    } },
    { id: "crassula_sill", name: "青锁龙窗台", desc: "发现青锁龙", check: function (s) {
      return !!(s.discovered && s.discovered.crassula);
    } },
    { id: "crassula_walker", name: "青锁龙径旅人", desc: "走过青锁龙短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.crassula_path);
    } },
    { id: "kalanchoe_sill", name: "长寿花窗台", desc: "发现长寿花", check: function (s) {
      return !!(s.discovered && s.discovered.kalanchoe);
    } },
    { id: "kalanchoe_walker", name: "长寿花径旅人", desc: "走过长寿花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.kalanchoe_path);
    } },
    { id: "haworthia_sill", name: "十二卷窗台", desc: "发现十二卷", check: function (s) {
      return !!(s.discovered && s.discovered.haworthia);
    } },
    { id: "haworthia_walker", name: "十二卷径旅人", desc: "走过十二卷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.haworthia_path);
    } },
    { id: "aloe_vera_fl_sill", name: "芦荟花窗台", desc: "发现芦荟花", check: function (s) {
      return !!(s.discovered && s.discovered.aloe_vera_fl);
    } },
    { id: "aloe_vera_fl_walker", name: "芦荟花径旅人", desc: "走过芦荟花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.aloe_vera_fl_path);
    } },
    { id: "agave_flower_sill", name: "龙舌兰花窗台", desc: "发现龙舌兰花", check: function (s) {
      return !!(s.discovered && s.discovered.agave_flower);
    } },
    { id: "agave_flower_walker", name: "龙舌兰花径旅人", desc: "走过龙舌兰花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.agave_flower_path);
    } },
    { id: "yucca_filament_sill", name: "丝兰丝窗台", desc: "发现丝兰丝", check: function (s) {
      return !!(s.discovered && s.discovered.yucca_filament);
    } },
    { id: "yucca_filament_walker", name: "丝兰丝径旅人", desc: "走过丝兰丝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yucca_filament_path);
    } },
    { id: "sansevieria_sill", name: "虎尾兰窗台", desc: "发现虎尾兰", check: function (s) {
      return !!(s.discovered && s.discovered.sansevieria);
    } },
    { id: "sansevieria_walker", name: "虎尾兰径旅人", desc: "走过虎尾兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sansevieria_path);
    } },
    { id: "jade_plant_sill", name: "翡翠木窗台", desc: "发现翡翠木", check: function (s) {
      return !!(s.discovered && s.discovered.jade_plant);
    } },
    { id: "jade_plant_walker", name: "翡翠木径旅人", desc: "走过翡翠木短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.jade_plant_path);
    } },
    { id: "string_pearls_sill", name: "珍珠吊兰窗台", desc: "发现珍珠吊兰", check: function (s) {
      return !!(s.discovered && s.discovered.string_pearls);
    } },
    { id: "string_pearls_walker", name: "珍珠吊兰径旅人", desc: "走过珍珠吊兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.string_pearls_path);
    } },
    { id: "burros_tail_sill", name: "驴尾草窗台", desc: "发现驴尾草", check: function (s) {
      return !!(s.discovered && s.discovered.burros_tail);
    } },
    { id: "burros_tail_walker", name: "驴尾草径旅人", desc: "走过驴尾草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.burros_tail_path);
    } },
    { id: "panda_plant_sill", name: "熊猫草窗台", desc: "发现熊猫草", check: function (s) {
      return !!(s.discovered && s.discovered.panda_plant);
    } },
    { id: "panda_plant_walker", name: "熊猫草径旅人", desc: "走过熊猫草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.panda_plant_path);
    } },
    { id: "boysen_leaf_sill", name: "波森莓叶窗台", desc: "发现波森莓叶", check: function (s) {
      return !!(s.discovered && s.discovered.boysen_leaf);
    } },
    { id: "boysen_leaf_walker", name: "波森莓叶径旅人", desc: "走过波森莓叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.boysen_leaf_path);
    } },
    { id: "logan_leaf_sill", name: "罗甘莓叶窗台", desc: "发现罗甘莓叶", check: function (s) {
      return !!(s.discovered && s.discovered.logan_leaf);
    } },
    { id: "logan_leaf_walker", name: "罗甘莓叶径旅人", desc: "走过罗甘莓叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.logan_leaf_path);
    } },
    { id: "tay_leaf_sill", name: "泰莓叶窗台", desc: "发现泰莓叶", check: function (s) {
      return !!(s.discovered && s.discovered.tay_leaf);
    } },
    { id: "tay_leaf_walker", name: "泰莓叶径旅人", desc: "走过泰莓叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.tay_leaf_path);
    } },
    { id: "marion_leaf_sill", name: "马里恩莓叶窗台", desc: "发现马里恩莓叶", check: function (s) {
      return !!(s.discovered && s.discovered.marion_leaf);
    } },
    { id: "marion_leaf_walker", name: "马里恩莓叶径旅人", desc: "走过马里恩莓叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.marion_leaf_path);
    } },
    { id: "wine_leaf_sill", name: "酒莓叶窗台", desc: "发现酒莓叶", check: function (s) {
      return !!(s.discovered && s.discovered.wine_leaf);
    } },
    { id: "wine_leaf_walker", name: "酒莓叶径旅人", desc: "走过酒莓叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wine_leaf_path);
    } },
    { id: "salmon_leaf_sill", name: "鲑莓叶窗台", desc: "发现鲑莓叶", check: function (s) {
      return !!(s.discovered && s.discovered.salmon_leaf);
    } },
    { id: "salmon_leaf_walker", name: "鲑莓叶径旅人", desc: "走过鲑莓叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.salmon_leaf_path);
    } },
    { id: "thimble_leaf_sill", name: "糙莓叶窗台", desc: "发现糙莓叶", check: function (s) {
      return !!(s.discovered && s.discovered.thimble_leaf);
    } },
    { id: "thimble_leaf_walker", name: "糙莓叶径旅人", desc: "走过糙莓叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.thimble_leaf_path);
    } },
    { id: "cloud_flower_sill", name: "云莓花窗台", desc: "发现云莓花", check: function (s) {
      return !!(s.discovered && s.discovered.cloud_flower);
    } },
    { id: "cloud_flower_walker", name: "云莓花径旅人", desc: "走过云莓花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cloud_flower_path);
    } },
    { id: "huckleberry_sill", name: "美洲越橘窗台", desc: "发现美洲越橘", check: function (s) {
      return !!(s.discovered && s.discovered.huckleberry);
    } },
    { id: "huckleberry_walker", name: "美洲越橘径旅人", desc: "走过美洲越橘短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.huckleberry_path);
    } },
    { id: "huckle_leaf_sill", name: "美洲越橘叶窗台", desc: "发现美洲越橘叶", check: function (s) {
      return !!(s.discovered && s.discovered.huckle_leaf);
    } },
    { id: "huckle_leaf_walker", name: "美洲越橘叶径旅人", desc: "走过美洲越橘叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.huckle_leaf_path);
    } },
    { id: "salal_sill", name: "萨拉尔窗台", desc: "发现萨拉尔", check: function (s) {
      return !!(s.discovered && s.discovered.salal);
    } },
    { id: "salal_walker", name: "萨拉尔径旅人", desc: "走过萨拉尔短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.salal_path);
    } },
    { id: "salal_leaf_sill", name: "萨拉尔叶窗台", desc: "发现萨拉尔叶", check: function (s) {
      return !!(s.discovered && s.discovered.salal_leaf);
    } },
    { id: "salal_leaf_walker", name: "萨拉尔叶径旅人", desc: "走过萨拉尔叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.salal_leaf_path);
    } },
    { id: "oregon_grape_sill", name: "俄勒冈葡萄窗台", desc: "发现俄勒冈葡萄", check: function (s) {
      return !!(s.discovered && s.discovered.oregon_grape);
    } },
    { id: "oregon_grape_walker", name: "俄勒冈葡萄径旅人", desc: "走过俄勒冈葡萄短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.oregon_grape_path);
    } },
    { id: "mahonia_sill", name: "十大功劳窗台", desc: "发现十大功劳", check: function (s) {
      return !!(s.discovered && s.discovered.mahonia);
    } },
    { id: "mahonia_walker", name: "十大功劳径旅人", desc: "走过十大功劳短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mahonia_path);
    } },
    { id: "barberry_red_sill", name: "红小檗窗台", desc: "发现红小檗", check: function (s) {
      return !!(s.discovered && s.discovered.barberry_red);
    } },
    { id: "barberry_red_walker", name: "红小檗径旅人", desc: "走过红小檗短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.barberry_red_path);
    } },
    { id: "barberry_leaf_sill", name: "小檗叶窗台", desc: "发现小檗叶", check: function (s) {
      return !!(s.discovered && s.discovered.barberry_leaf);
    } },
    { id: "barberry_leaf_walker", name: "小檗叶径旅人", desc: "走过小檗叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.barberry_leaf_path);
    } },
    { id: "currant_flower_sill", name: "醋栗花窗台", desc: "发现醋栗花", check: function (s) {
      return !!(s.discovered && s.discovered.currant_flower);
    } },
    { id: "currant_flower_walker", name: "醋栗花径旅人", desc: "走过醋栗花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.currant_flower_path);
    } },
    { id: "goose_flower_sill", name: "鹅莓花窗台", desc: "发现鹅莓花", check: function (s) {
      return !!(s.discovered && s.discovered.goose_flower);
    } },
    { id: "goose_flower_walker", name: "鹅莓花径旅人", desc: "走过鹅莓花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.goose_flower_path);
    } },
    { id: "josta_sill", name: "约斯塔莓窗台", desc: "发现约斯塔莓", check: function (s) {
      return !!(s.discovered && s.discovered.josta);
    } },
    { id: "josta_walker", name: "约斯塔莓径旅人", desc: "走过约斯塔莓短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.josta_path);
    } },
    { id: "worcesterberry_sill", name: "伍斯特莓窗台", desc: "发现伍斯特莓", check: function (s) {
      return !!(s.discovered && s.discovered.worcesterberry);
    } },
    { id: "worcesterberry_walker", name: "伍斯特莓径旅人", desc: "走过伍斯特莓短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.worcesterberry_path);
    } },
    { id: "juneberry_sill", name: "六月莓窗台", desc: "发现六月莓", check: function (s) {
      return !!(s.discovered && s.discovered.juneberry);
    } },
    { id: "juneberry_walker", name: "六月莓径旅人", desc: "走过六月莓短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.juneberry_path);
    } },
    { id: "shadbush_sill", name: "唐棣花窗台", desc: "发现唐棣花", check: function (s) {
      return !!(s.discovered && s.discovered.shadbush);
    } },
    { id: "shadbush_walker", name: "唐棣花径旅人", desc: "走过唐棣花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.shadbush_path);
    } },
    { id: "chokecherry_sill", name: "稠李窗台", desc: "发现稠李", check: function (s) {
      return !!(s.discovered && s.discovered.chokecherry);
    } },
    { id: "chokecherry_walker", name: "稠李径旅人", desc: "走过稠李短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chokecherry_path);
    } },
    { id: "bird_cherry_sill", name: "鸟樱窗台", desc: "发现鸟樱", check: function (s) {
      return !!(s.discovered && s.discovered.bird_cherry);
    } },
    { id: "bird_cherry_walker", name: "鸟樱径旅人", desc: "走过鸟樱短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bird_cherry_path);
    } },
    { id: "pin_cherry_sill", name: "细樱窗台", desc: "发现细樱", check: function (s) {
      return !!(s.discovered && s.discovered.pin_cherry);
    } },
    { id: "pin_cherry_walker", name: "细樱径旅人", desc: "走过细樱短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pin_cherry_path);
    } },
    { id: "sand_cherry_sill", name: "沙樱窗台", desc: "发现沙樱", check: function (s) {
      return !!(s.discovered && s.discovered.sand_cherry);
    } },
    { id: "sand_cherry_walker", name: "沙樱径旅人", desc: "走过沙樱短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sand_cherry_path);
    } },
    { id: "nanking_cherry_sill", name: "毛樱桃窗台", desc: "发现毛樱桃", check: function (s) {
      return !!(s.discovered && s.discovered.nanking_cherry);
    } },
    { id: "nanking_cherry_walker", name: "毛樱桃径旅人", desc: "走过毛樱桃短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.nanking_cherry_path);
    } },
    { id: "cornelian_sill", name: "欧亚山茱萸窗台", desc: "发现欧亚山茱萸", check: function (s) {
      return !!(s.discovered && s.discovered.cornelian);
    } },
    { id: "cornelian_walker", name: "欧亚山茱萸径旅人", desc: "走过欧亚山茱萸短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cornelian_path);
    } },
    { id: "honeysuckle_blue_sill", name: "蓝果忍冬窗台", desc: "发现蓝果忍冬", check: function (s) {
      return !!(s.discovered && s.discovered.honeysuckle_blue);
    } },
    { id: "honeysuckle_blue_walker", name: "蓝果忍冬径旅人", desc: "走过蓝果忍冬短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.honeysuckle_blue_path);
    } },
    { id: "honeyberry_sill", name: "蜜莓窗台", desc: "发现蜜莓", check: function (s) {
      return !!(s.discovered && s.discovered.honeyberry);
    } },
    { id: "honeyberry_walker", name: "蜜莓径旅人", desc: "走过蜜莓短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.honeyberry_path);
    } },
    { id: "hascap_sill", name: "哈斯卡普窗台", desc: "发现哈斯卡普", check: function (s) {
      return !!(s.discovered && s.discovered.hascap);
    } },
    { id: "hascap_walker", name: "哈斯卡普径旅人", desc: "走过哈斯卡普短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hascap_path);
    } },
    { id: "arctic_berry_sill", name: "北极蜜莓窗台", desc: "发现北极蜜莓", check: function (s) {
      return !!(s.discovered && s.discovered.arctic_berry);
    } },
    { id: "arctic_berry_walker", name: "北极蜜莓径旅人", desc: "走过北极蜜莓短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.arctic_berry_path);
    } },
    { id: "clematis_arm_sill", name: "绣球铁线莲窗台", desc: "发现绣球铁线莲", check: function (s) {
      return !!(s.discovered && s.discovered.clematis_arm);
    } },
    { id: "clematis_arm_walker", name: "绣球铁线莲径旅人", desc: "走过绣球铁线莲短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.clematis_arm_path);
    } },
    { id: "clematis_mon_sill", name: "绣球铁线窗台", desc: "发现绣球铁线", check: function (s) {
      return !!(s.discovered && s.discovered.clematis_mon);
    } },
    { id: "clematis_mon_walker", name: "绣球铁线径旅人", desc: "走过绣球铁线短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.clematis_mon_path);
    } },
    { id: "clematis_tang_sill", name: "甘青铁线莲窗台", desc: "发现甘青铁线莲", check: function (s) {
      return !!(s.discovered && s.discovered.clematis_tang);
    } },
    { id: "clematis_tang_walker", name: "甘青铁线莲径旅人", desc: "走过甘青铁线莲短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.clematis_tang_path);
    } },
    { id: "clematis_ori_sill", name: "东方铁线莲窗台", desc: "发现东方铁线莲", check: function (s) {
      return !!(s.discovered && s.discovered.clematis_ori);
    } },
    { id: "clematis_ori_walker", name: "东方铁线莲径旅人", desc: "走过东方铁线莲短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.clematis_ori_path);
    } },
    { id: "akibia_sill", name: "木通窗台", desc: "发现木通", check: function (s) {
      return !!(s.discovered && s.discovered.akibia);
    } },
    { id: "akibia_walker", name: "木通径旅人", desc: "走过木通短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.akibia_path);
    } },
    { id: "akebia_flower_sill", name: "木通花窗台", desc: "发现木通花", check: function (s) {
      return !!(s.discovered && s.discovered.akebia_flower);
    } },
    { id: "akebia_flower_walker", name: "木通花径旅人", desc: "走过木通花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.akebia_flower_path);
    } },
    { id: "schisandra_chin_sill", name: "北五味子窗台", desc: "发现北五味子", check: function (s) {
      return !!(s.discovered && s.discovered.schisandra_chin);
    } },
    { id: "schisandra_chin_walker", name: "北五味子径旅人", desc: "走过北五味子短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.schisandra_chin_path);
    } },
    { id: "schisandra_leaf_sill", name: "五味子叶窗台", desc: "发现五味子叶", check: function (s) {
      return !!(s.discovered && s.discovered.schisandra_leaf);
    } },
    { id: "schisandra_leaf_walker", name: "五味子叶径旅人", desc: "走过五味子叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.schisandra_leaf_path);
    } },
    { id: "kiwi_hardy_sill", name: "软枣猕猴桃窗台", desc: "发现软枣猕猴桃", check: function (s) {
      return !!(s.discovered && s.discovered.kiwi_hardy);
    } },
    { id: "kiwi_hardy_walker", name: "软枣猕猴桃径旅人", desc: "走过软枣猕猴桃短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.kiwi_hardy_path);
    } },
    { id: "kiwi_flower_sill", name: "猕猴桃花窗台", desc: "发现猕猴桃花", check: function (s) {
      return !!(s.discovered && s.discovered.kiwi_flower);
    } },
    { id: "kiwi_flower_walker", name: "猕猴桃花径旅人", desc: "走过猕猴桃花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.kiwi_flower_path);
    } },
    { id: "actinidia_sill", name: "羊桃窗台", desc: "发现羊桃", check: function (s) {
      return !!(s.discovered && s.discovered.actinidia);
    } },
    { id: "actinidia_walker", name: "羊桃径旅人", desc: "走过羊桃短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.actinidia_path);
    } },
    { id: "silver_vine_sill", name: "葛枣猕猴桃窗台", desc: "发现葛枣猕猴桃", check: function (s) {
      return !!(s.discovered && s.discovered.silver_vine);
    } },
    { id: "silver_vine_walker", name: "葛枣猕猴桃径旅人", desc: "走过葛枣猕猴桃短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.silver_vine_path);
    } },
    { id: "hop_fresh_sill", name: "鲜啤酒花窗台", desc: "发现鲜啤酒花", check: function (s) {
      return !!(s.discovered && s.discovered.hop_fresh);
    } },
    { id: "hop_fresh_walker", name: "鲜啤酒花径旅人", desc: "走过鲜啤酒花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hop_fresh_path);
    } },
    { id: "hop_leaf_sill", name: "啤酒花叶窗台", desc: "发现啤酒花叶", check: function (s) {
      return !!(s.discovered && s.discovered.hop_leaf);
    } },
    { id: "hop_leaf_walker", name: "啤酒花叶径旅人", desc: "走过啤酒花叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hop_leaf_path);
    } },
    { id: "humulus_sill", name: "葎草窗台", desc: "发现葎草", check: function (s) {
      return !!(s.discovered && s.discovered.humulus);
    } },
    { id: "humulus_walker", name: "葎草径旅人", desc: "走过葎草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.humulus_path);
    } },
    { id: "japanese_hop_sill", name: "日本葎草窗台", desc: "发现日本葎草", check: function (s) {
      return !!(s.discovered && s.discovered.japanese_hop);
    } },
    { id: "japanese_hop_walker", name: "日本葎草径旅人", desc: "走过日本葎草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.japanese_hop_path);
    } },
    { id: "grape_leaf_fresh_sill", name: "鲜葡萄叶窗台", desc: "发现鲜葡萄叶", check: function (s) {
      return !!(s.discovered && s.discovered.grape_leaf_fresh);
    } },
    { id: "grape_leaf_fresh_walker", name: "鲜葡萄叶径旅人", desc: "走过鲜葡萄叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.grape_leaf_fresh_path);
    } },
    { id: "vine_tendril_sill", name: "葡萄卷须窗台", desc: "发现葡萄卷须", check: function (s) {
      return !!(s.discovered && s.discovered.vine_tendril);
    } },
    { id: "vine_tendril_walker", name: "葡萄卷须径旅人", desc: "走过葡萄卷须短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.vine_tendril_path);
    } },
    { id: "muscadine_sill", name: "圆叶葡萄窗台", desc: "发现圆叶葡萄", check: function (s) {
      return !!(s.discovered && s.discovered.muscadine);
    } },
    { id: "muscadine_walker", name: "圆叶葡萄径旅人", desc: "走过圆叶葡萄短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.muscadine_path);
    } },
    { id: "scuppernong_sill", name: "白圆叶葡萄窗台", desc: "发现白圆叶葡萄", check: function (s) {
      return !!(s.discovered && s.discovered.scuppernong);
    } },
    { id: "scuppernong_walker", name: "白圆叶葡萄径旅人", desc: "走过白圆叶葡萄短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.scuppernong_path);
    } },
    { id: "passiflora_inc_sill", name: "西番莲窗台", desc: "发现西番莲", check: function (s) {
      return !!(s.discovered && s.discovered.passiflora_inc);
    } },
    { id: "passiflora_inc_walker", name: "西番莲径旅人", desc: "走过西番莲短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.passiflora_inc_path);
    } },
    { id: "passiflora_cae_sill", name: "天蓝西番莲窗台", desc: "发现天蓝西番莲", check: function (s) {
      return !!(s.discovered && s.discovered.passiflora_cae);
    } },
    { id: "passiflora_cae_walker", name: "天蓝西番莲径旅人", desc: "走过天蓝西番莲短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.passiflora_cae_path);
    } },
    { id: "passiflora_ed_sill", name: "百香花窗台", desc: "发现百香花", check: function (s) {
      return !!(s.discovered && s.discovered.passiflora_ed);
    } },
    { id: "passiflora_ed_walker", name: "百香花径旅人", desc: "走过百香花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.passiflora_ed_path);
    } },
    { id: "maypop_sill", name: "五月瓜窗台", desc: "发现五月瓜", check: function (s) {
      return !!(s.discovered && s.discovered.maypop);
    } },
    { id: "maypop_walker", name: "五月瓜径旅人", desc: "走过五月瓜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.maypop_path);
    } },
    { id: "morning_glory_red_sill", name: "红牵牛窗台", desc: "发现红牵牛", check: function (s) {
      return !!(s.discovered && s.discovered.morning_glory_red);
    } },
    { id: "morning_glory_red_walker", name: "红牵牛径旅人", desc: "走过红牵牛短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.morning_glory_red_path);
    } },
    { id: "morning_glory_blue_sill", name: "蓝牵牛窗台", desc: "发现蓝牵牛", check: function (s) {
      return !!(s.discovered && s.discovered.morning_glory_blue);
    } },
    { id: "morning_glory_blue_walker", name: "蓝牵牛径旅人", desc: "走过蓝牵牛短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.morning_glory_blue_path);
    } },
    { id: "ipomoea_bat_sill", name: "红薯花窗台", desc: "发现红薯花", check: function (s) {
      return !!(s.discovered && s.discovered.ipomoea_bat);
    } },
    { id: "ipomoea_bat_walker", name: "红薯花径旅人", desc: "走过红薯花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.ipomoea_bat_path);
    } },
    { id: "moonvine_sill", name: "月藤窗台", desc: "发现月藤", check: function (s) {
      return !!(s.discovered && s.discovered.moonvine);
    } },
    { id: "moonvine_walker", name: "月藤径旅人", desc: "走过月藤短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.moonvine_path);
    } },
    { id: "cypress_vine_sill", name: "茑萝窗台", desc: "发现茑萝", check: function (s) {
      return !!(s.discovered && s.discovered.cypress_vine);
    } },
    { id: "cypress_vine_walker", name: "茑萝径旅人", desc: "走过茑萝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cypress_vine_path);
    } },
    { id: "cardinal_climber_sill", name: "红雀藤窗台", desc: "发现红雀藤", check: function (s) {
      return !!(s.discovered && s.discovered.cardinal_climber);
    } },
    { id: "cardinal_climber_walker", name: "红雀藤径旅人", desc: "走过红雀藤短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cardinal_climber_path);
    } },
    { id: "black_eyed_susan_vine_sill", name: "黑眼苏珊藤窗台", desc: "发现黑眼苏珊藤", check: function (s) {
      return !!(s.discovered && s.discovered.black_eyed_susan_vine);
    } },
    { id: "black_eyed_susan_vine_walker", name: "黑眼苏珊藤径旅人", desc: "走过黑眼苏珊藤短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.black_eyed_susan_vine_path);
    } },
    { id: "thunbergia_sill", name: "山牵牛窗台", desc: "发现山牵牛", check: function (s) {
      return !!(s.discovered && s.discovered.thunbergia);
    } },
    { id: "thunbergia_walker", name: "山牵牛径旅人", desc: "走过山牵牛短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.thunbergia_path);
    } },
    { id: "sweet_potato_leaf_sill", name: "红薯叶窗台", desc: "发现红薯叶", check: function (s) {
      return !!(s.discovered && s.discovered.sweet_potato_leaf);
    } },
    { id: "sweet_potato_leaf_walker", name: "红薯叶径旅人", desc: "走过红薯叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.sweet_potato_leaf_path);
    } },
    { id: "yam_leaf_sill", name: "山药叶窗台", desc: "发现山药叶", check: function (s) {
      return !!(s.discovered && s.discovered.yam_leaf);
    } },
    { id: "yam_leaf_walker", name: "山药叶径旅人", desc: "走过山药叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yam_leaf_path);
    } },
    { id: "dioscorea_sill", name: "薯蓣窗台", desc: "发现薯蓣", check: function (s) {
      return !!(s.discovered && s.discovered.dioscorea);
    } },
    { id: "dioscorea_walker", name: "薯蓣径旅人", desc: "走过薯蓣短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dioscorea_path);
    } },
    { id: "chinese_yam_sill", name: "淮山窗台", desc: "发现淮山", check: function (s) {
      return !!(s.discovered && s.discovered.chinese_yam);
    } },
    { id: "chinese_yam_walker", name: "淮山径旅人", desc: "走过淮山短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chinese_yam_path);
    } },
    { id: "luffa_flower_sill", name: "丝瓜花窗台", desc: "发现丝瓜花", check: function (s) {
      return !!(s.discovered && s.discovered.luffa_flower);
    } },
    { id: "luffa_flower_walker", name: "丝瓜花径旅人", desc: "走过丝瓜花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.luffa_flower_path);
    } },
    { id: "luffa_leaf_sill", name: "丝瓜叶窗台", desc: "发现丝瓜叶", check: function (s) {
      return !!(s.discovered && s.discovered.luffa_leaf);
    } },
    { id: "luffa_leaf_walker", name: "丝瓜叶径旅人", desc: "走过丝瓜叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.luffa_leaf_path);
    } },
    { id: "bitter_melon_fl_sill", name: "苦瓜花窗台", desc: "发现苦瓜花", check: function (s) {
      return !!(s.discovered && s.discovered.bitter_melon_fl);
    } },
    { id: "bitter_melon_fl_walker", name: "苦瓜花径旅人", desc: "走过苦瓜花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bitter_melon_fl_path);
    } },
    { id: "bitter_melon_leaf_sill", name: "苦瓜叶窗台", desc: "发现苦瓜叶", check: function (s) {
      return !!(s.discovered && s.discovered.bitter_melon_leaf);
    } },
    { id: "bitter_melon_leaf_walker", name: "苦瓜叶径旅人", desc: "走过苦瓜叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.bitter_melon_leaf_path);
    } },
    { id: "squash_blossom_sill", name: "南瓜花窗台", desc: "发现南瓜花", check: function (s) {
      return !!(s.discovered && s.discovered.squash_blossom);
    } },
    { id: "squash_blossom_walker", name: "南瓜花径旅人", desc: "走过南瓜花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.squash_blossom_path);
    } },
    { id: "zucchini_flower_sill", name: "西葫芦花窗台", desc: "发现西葫芦花", check: function (s) {
      return !!(s.discovered && s.discovered.zucchini_flower);
    } },
    { id: "zucchini_flower_walker", name: "西葫芦花径旅人", desc: "走过西葫芦花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.zucchini_flower_path);
    } },
    { id: "cucumber_flower_sill", name: "黄瓜花窗台", desc: "发现黄瓜花", check: function (s) {
      return !!(s.discovered && s.discovered.cucumber_flower);
    } },
    { id: "cucumber_flower_walker", name: "黄瓜花径旅人", desc: "走过黄瓜花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cucumber_flower_path);
    } },
    { id: "melon_flower_sill", name: "甜瓜花窗台", desc: "发现甜瓜花", check: function (s) {
      return !!(s.discovered && s.discovered.melon_flower);
    } },
    { id: "melon_flower_walker", name: "甜瓜花径旅人", desc: "走过甜瓜花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.melon_flower_path);
    } },
    { id: "okra_flower_sill", name: "秋葵花窗台", desc: "发现秋葵花", check: function (s) {
      return !!(s.discovered && s.discovered.okra_flower);
    } },
    { id: "okra_flower_walker", name: "秋葵花径旅人", desc: "走过秋葵花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.okra_flower_path);
    } },
    { id: "okra_leaf_sill", name: "秋葵叶窗台", desc: "发现秋葵叶", check: function (s) {
      return !!(s.discovered && s.discovered.okra_leaf);
    } },
    { id: "okra_leaf_walker", name: "秋葵叶径旅人", desc: "走过秋葵叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.okra_leaf_path);
    } },
    { id: "hibiscus_escul_sill", name: "黄秋葵窗台", desc: "发现黄秋葵", check: function (s) {
      return !!(s.discovered && s.discovered.hibiscus_escul);
    } },
    { id: "hibiscus_escul_walker", name: "黄秋葵径旅人", desc: "走过黄秋葵短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hibiscus_escul_path);
    } },
    { id: "roselle_fresh_sill", name: "鲜玫瑰茄窗台", desc: "发现鲜玫瑰茄", check: function (s) {
      return !!(s.discovered && s.discovered.roselle_fresh);
    } },
    { id: "roselle_fresh_walker", name: "鲜玫瑰茄径旅人", desc: "走过鲜玫瑰茄短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.roselle_fresh_path);
    } },
    { id: "cotton_flower_sill", name: "棉花窗台", desc: "发现棉花", check: function (s) {
      return !!(s.discovered && s.discovered.cotton_flower);
    } },
    { id: "cotton_flower_walker", name: "棉花径旅人", desc: "走过棉花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cotton_flower_path);
    } },
    { id: "cotton_leaf_sill", name: "棉叶窗台", desc: "发现棉叶", check: function (s) {
      return !!(s.discovered && s.discovered.cotton_leaf);
    } },
    { id: "cotton_leaf_walker", name: "棉叶径旅人", desc: "走过棉叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cotton_leaf_path);
    } },
    { id: "kenaf_sill", name: "红麻窗台", desc: "发现红麻", check: function (s) {
      return !!(s.discovered && s.discovered.kenaf);
    } },
    { id: "kenaf_walker", name: "红麻径旅人", desc: "走过红麻短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.kenaf_path);
    } },
    { id: "jute_leaf_sill", name: "黄麻叶窗台", desc: "发现黄麻叶", check: function (s) {
      return !!(s.discovered && s.discovered.jute_leaf);
    } },
    { id: "jute_leaf_walker", name: "黄麻叶径旅人", desc: "走过黄麻叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.jute_leaf_path);
    } },
    { id: "flax_blue_sill", name: "蓝亚麻窗台", desc: "发现蓝亚麻", check: function (s) {
      return !!(s.discovered && s.discovered.flax_blue);
    } },
    { id: "flax_blue_walker", name: "蓝亚麻径旅人", desc: "走过蓝亚麻短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.flax_blue_path);
    } },
    { id: "flax_red_sill", name: "红亚麻窗台", desc: "发现红亚麻", check: function (s) {
      return !!(s.discovered && s.discovered.flax_red);
    } },
    { id: "flax_red_walker", name: "红亚麻径旅人", desc: "走过红亚麻短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.flax_red_path);
    } },
    { id: "linseed_oil_sill", name: "亚麻仁油窗台", desc: "发现亚麻仁油", check: function (s) {
      return !!(s.discovered && s.discovered.linseed_oil);
    } },
    { id: "linseed_oil_walker", name: "亚麻仁油径旅人", desc: "走过亚麻仁油短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.linseed_oil_path);
    } },
    { id: "hemp_flower_sill", name: "火麻花窗台", desc: "发现火麻花", check: function (s) {
      return !!(s.discovered && s.discovered.hemp_flower);
    } },
    { id: "hemp_flower_walker", name: "火麻花径旅人", desc: "走过火麻花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hemp_flower_path);
    } },
    { id: "nettle_fresh_sill", name: "鲜荨麻窗台", desc: "发现鲜荨麻", check: function (s) {
      return !!(s.discovered && s.discovered.nettle_fresh);
    } },
    { id: "nettle_fresh_walker", name: "鲜荨麻径旅人", desc: "走过鲜荨麻短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.nettle_fresh_path);
    } },
    { id: "nettle_root_sill", name: "荨麻根窗台", desc: "发现荨麻根", check: function (s) {
      return !!(s.discovered && s.discovered.nettle_root);
    } },
    { id: "nettle_root_walker", name: "荨麻根径旅人", desc: "走过荨麻根短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.nettle_root_path);
    } },
    { id: "dead_nettle_sill", name: "野芝麻窗台", desc: "发现野芝麻", check: function (s) {
      return !!(s.discovered && s.discovered.dead_nettle);
    } },
    { id: "dead_nettle_walker", name: "野芝麻径旅人", desc: "走过野芝麻短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dead_nettle_path);
    } },
    { id: "purple_dead_nettle_sill", name: "紫野芝麻窗台", desc: "发现紫野芝麻", check: function (s) {
      return !!(s.discovered && s.discovered.purple_dead_nettle);
    } },
    { id: "purple_dead_nettle_walker", name: "紫野芝麻径旅人", desc: "走过紫野芝麻短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.purple_dead_nettle_path);
    } },
    { id: "henbit_sill", name: "宝盖草窗台", desc: "发现宝盖草", check: function (s) {
      return !!(s.discovered && s.discovered.henbit);
    } },
    { id: "henbit_walker", name: "宝盖草径旅人", desc: "走过宝盖草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.henbit_path);
    } },
    { id: "lamium_sill", name: "银边野芝麻窗台", desc: "发现银边野芝麻", check: function (s) {
      return !!(s.discovered && s.discovered.lamium);
    } },
    { id: "lamium_walker", name: "银边野芝麻径旅人", desc: "走过银边野芝麻短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lamium_path);
    } },
    { id: "galeopsis_sill", name: "鼬瓣花窗台", desc: "发现鼬瓣花", check: function (s) {
      return !!(s.discovered && s.discovered.galeopsis);
    } },
    { id: "galeopsis_walker", name: "鼬瓣花径旅人", desc: "走过鼬瓣花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.galeopsis_path);
    } },
    { id: "stachys_byz_sill", name: "绵毛水苏窗台", desc: "发现绵毛水苏", check: function (s) {
      return !!(s.discovered && s.discovered.stachys_byz);
    } },
    { id: "stachys_byz_walker", name: "绵毛水苏径旅人", desc: "走过绵毛水苏短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.stachys_byz_path);
    } },
    { id: "alpine_thyme_sill", name: "高山百里香窗台", desc: "发现高山百里香", check: function (s) {
      return !!(s.discovered && s.discovered.alpine_thyme);
    } },
    { id: "alpine_thyme_walker", name: "高山百里香径旅人", desc: "走过高山百里香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.alpine_thyme_path);
    } },
    { id: "alpine_sage_sill", name: "高山鼠尾草窗台", desc: "发现高山鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.alpine_sage);
    } },
    { id: "alpine_sage_walker", name: "高山鼠尾草径旅人", desc: "走过高山鼠尾草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.alpine_sage_path);
    } },
    { id: "alpine_oregano_sill", name: "高山牛至窗台", desc: "发现高山牛至", check: function (s) {
      return !!(s.discovered && s.discovered.alpine_oregano);
    } },
    { id: "alpine_oregano_walker", name: "高山牛至径旅人", desc: "走过高山牛至短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.alpine_oregano_path);
    } },
    { id: "alpine_basil_sill", name: "高山罗勒窗台", desc: "发现高山罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.alpine_basil);
    } },
    { id: "alpine_basil_walker", name: "高山罗勒径旅人", desc: "走过高山罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.alpine_basil_path);
    } },
    { id: "alpine_mint_sill", name: "高山薄荷窗台", desc: "发现高山薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.alpine_mint);
    } },
    { id: "alpine_mint_walker", name: "高山薄荷径旅人", desc: "走过高山薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.alpine_mint_path);
    } },
    { id: "alpine_lavender_sill", name: "高山薰衣草窗台", desc: "发现高山薰衣草", check: function (s) {
      return !!(s.discovered && s.discovered.alpine_lavender);
    } },
    { id: "alpine_lavender_walker", name: "高山薰衣草径旅人", desc: "走过高山薰衣草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.alpine_lavender_path);
    } },
    { id: "alpine_rosemary_sill", name: "高山迷迭香窗台", desc: "发现高山迷迭香", check: function (s) {
      return !!(s.discovered && s.discovered.alpine_rosemary);
    } },
    { id: "alpine_rosemary_walker", name: "高山迷迭香径旅人", desc: "走过高山迷迭香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.alpine_rosemary_path);
    } },
    { id: "alpine_marjoram_sill", name: "高山马郁兰窗台", desc: "发现高山马郁兰", check: function (s) {
      return !!(s.discovered && s.discovered.alpine_marjoram);
    } },
    { id: "alpine_marjoram_walker", name: "高山马郁兰径旅人", desc: "走过高山马郁兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.alpine_marjoram_path);
    } },
    { id: "alpine_tarragon_sill", name: "高山龙蒿窗台", desc: "发现高山龙蒿", check: function (s) {
      return !!(s.discovered && s.discovered.alpine_tarragon);
    } },
    { id: "alpine_tarragon_walker", name: "高山龙蒿径旅人", desc: "走过高山龙蒿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.alpine_tarragon_path);
    } },
    { id: "alpine_chive_sill", name: "高山香葱窗台", desc: "发现高山香葱", check: function (s) {
      return !!(s.discovered && s.discovered.alpine_chive);
    } },
    { id: "alpine_chive_walker", name: "高山香葱径旅人", desc: "走过高山香葱短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.alpine_chive_path);
    } },
    { id: "alpine_parsley_sill", name: "高山欧芹窗台", desc: "发现高山欧芹", check: function (s) {
      return !!(s.discovered && s.discovered.alpine_parsley);
    } },
    { id: "alpine_parsley_walker", name: "高山欧芹径旅人", desc: "走过高山欧芹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.alpine_parsley_path);
    } },
    { id: "alpine_cilantro_sill", name: "高山香菜窗台", desc: "发现高山香菜", check: function (s) {
      return !!(s.discovered && s.discovered.alpine_cilantro);
    } },
    { id: "alpine_cilantro_walker", name: "高山香菜径旅人", desc: "走过高山香菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.alpine_cilantro_path);
    } },
    { id: "alpine_dill_sill", name: "高山莳萝窗台", desc: "发现高山莳萝", check: function (s) {
      return !!(s.discovered && s.discovered.alpine_dill);
    } },
    { id: "alpine_dill_walker", name: "高山莳萝径旅人", desc: "走过高山莳萝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.alpine_dill_path);
    } },
    { id: "alpine_fennel_sill", name: "高山茴香窗台", desc: "发现高山茴香", check: function (s) {
      return !!(s.discovered && s.discovered.alpine_fennel);
    } },
    { id: "alpine_fennel_walker", name: "高山茴香径旅人", desc: "走过高山茴香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.alpine_fennel_path);
    } },
    { id: "alpine_lovage_sill", name: "高山独活窗台", desc: "发现高山独活", check: function (s) {
      return !!(s.discovered && s.discovered.alpine_lovage);
    } },
    { id: "alpine_lovage_walker", name: "高山独活径旅人", desc: "走过高山独活短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.alpine_lovage_path);
    } },
    { id: "alpine_sorrel_sill", name: "高山酸模窗台", desc: "发现高山酸模", check: function (s) {
      return !!(s.discovered && s.discovered.alpine_sorrel);
    } },
    { id: "alpine_sorrel_walker", name: "高山酸模径旅人", desc: "走过高山酸模短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.alpine_sorrel_path);
    } },
    { id: "coastal_thyme_sill", name: "海岸百里香窗台", desc: "发现海岸百里香", check: function (s) {
      return !!(s.discovered && s.discovered.coastal_thyme);
    } },
    { id: "coastal_thyme_walker", name: "海岸百里香径旅人", desc: "走过海岸百里香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.coastal_thyme_path);
    } },
    { id: "coastal_sage_sill", name: "海岸鼠尾草窗台", desc: "发现海岸鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.coastal_sage);
    } },
    { id: "coastal_sage_walker", name: "海岸鼠尾草径旅人", desc: "走过海岸鼠尾草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.coastal_sage_path);
    } },
    { id: "coastal_oregano_sill", name: "海岸牛至窗台", desc: "发现海岸牛至", check: function (s) {
      return !!(s.discovered && s.discovered.coastal_oregano);
    } },
    { id: "coastal_oregano_walker", name: "海岸牛至径旅人", desc: "走过海岸牛至短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.coastal_oregano_path);
    } },
    { id: "coastal_basil_sill", name: "海岸罗勒窗台", desc: "发现海岸罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.coastal_basil);
    } },
    { id: "coastal_basil_walker", name: "海岸罗勒径旅人", desc: "走过海岸罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.coastal_basil_path);
    } },
    { id: "coastal_mint_sill", name: "海岸薄荷窗台", desc: "发现海岸薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.coastal_mint);
    } },
    { id: "coastal_mint_walker", name: "海岸薄荷径旅人", desc: "走过海岸薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.coastal_mint_path);
    } },
    { id: "coastal_lavender_sill", name: "海岸薰衣草窗台", desc: "发现海岸薰衣草", check: function (s) {
      return !!(s.discovered && s.discovered.coastal_lavender);
    } },
    { id: "coastal_lavender_walker", name: "海岸薰衣草径旅人", desc: "走过海岸薰衣草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.coastal_lavender_path);
    } },
    { id: "coastal_rosemary_sill", name: "海岸迷迭香窗台", desc: "发现海岸迷迭香", check: function (s) {
      return !!(s.discovered && s.discovered.coastal_rosemary);
    } },
    { id: "coastal_rosemary_walker", name: "海岸迷迭香径旅人", desc: "走过海岸迷迭香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.coastal_rosemary_path);
    } },
    { id: "coastal_marjoram_sill", name: "海岸马郁兰窗台", desc: "发现海岸马郁兰", check: function (s) {
      return !!(s.discovered && s.discovered.coastal_marjoram);
    } },
    { id: "coastal_marjoram_walker", name: "海岸马郁兰径旅人", desc: "走过海岸马郁兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.coastal_marjoram_path);
    } },
    { id: "coastal_tarragon_sill", name: "海岸龙蒿窗台", desc: "发现海岸龙蒿", check: function (s) {
      return !!(s.discovered && s.discovered.coastal_tarragon);
    } },
    { id: "coastal_tarragon_walker", name: "海岸龙蒿径旅人", desc: "走过海岸龙蒿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.coastal_tarragon_path);
    } },
    { id: "coastal_chive_sill", name: "海岸香葱窗台", desc: "发现海岸香葱", check: function (s) {
      return !!(s.discovered && s.discovered.coastal_chive);
    } },
    { id: "coastal_chive_walker", name: "海岸香葱径旅人", desc: "走过海岸香葱短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.coastal_chive_path);
    } },
    { id: "coastal_parsley_sill", name: "海岸欧芹窗台", desc: "发现海岸欧芹", check: function (s) {
      return !!(s.discovered && s.discovered.coastal_parsley);
    } },
    { id: "coastal_parsley_walker", name: "海岸欧芹径旅人", desc: "走过海岸欧芹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.coastal_parsley_path);
    } },
    { id: "coastal_cilantro_sill", name: "海岸香菜窗台", desc: "发现海岸香菜", check: function (s) {
      return !!(s.discovered && s.discovered.coastal_cilantro);
    } },
    { id: "coastal_cilantro_walker", name: "海岸香菜径旅人", desc: "走过海岸香菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.coastal_cilantro_path);
    } },
    { id: "coastal_dill_sill", name: "海岸莳萝窗台", desc: "发现海岸莳萝", check: function (s) {
      return !!(s.discovered && s.discovered.coastal_dill);
    } },
    { id: "coastal_dill_walker", name: "海岸莳萝径旅人", desc: "走过海岸莳萝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.coastal_dill_path);
    } },
    { id: "coastal_fennel_sill", name: "海岸茴香窗台", desc: "发现海岸茴香", check: function (s) {
      return !!(s.discovered && s.discovered.coastal_fennel);
    } },
    { id: "coastal_fennel_walker", name: "海岸茴香径旅人", desc: "走过海岸茴香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.coastal_fennel_path);
    } },
    { id: "coastal_lovage_sill", name: "海岸独活窗台", desc: "发现海岸独活", check: function (s) {
      return !!(s.discovered && s.discovered.coastal_lovage);
    } },
    { id: "coastal_lovage_walker", name: "海岸独活径旅人", desc: "走过海岸独活短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.coastal_lovage_path);
    } },
    { id: "coastal_sorrel_sill", name: "海岸酸模窗台", desc: "发现海岸酸模", check: function (s) {
      return !!(s.discovered && s.discovered.coastal_sorrel);
    } },
    { id: "coastal_sorrel_walker", name: "海岸酸模径旅人", desc: "走过海岸酸模短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.coastal_sorrel_path);
    } },
    { id: "meadow_thyme_sill", name: "草甸百里香窗台", desc: "发现草甸百里香", check: function (s) {
      return !!(s.discovered && s.discovered.meadow_thyme);
    } },
    { id: "meadow_thyme_walker", name: "草甸百里香径旅人", desc: "走过草甸百里香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.meadow_thyme_path);
    } },
    { id: "meadow_sage_sill", name: "草甸鼠尾草窗台", desc: "发现草甸鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.meadow_sage);
    } },
    { id: "meadow_sage_walker", name: "草甸鼠尾草径旅人", desc: "走过草甸鼠尾草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.meadow_sage_path);
    } },
    { id: "meadow_oregano_sill", name: "草甸牛至窗台", desc: "发现草甸牛至", check: function (s) {
      return !!(s.discovered && s.discovered.meadow_oregano);
    } },
    { id: "meadow_oregano_walker", name: "草甸牛至径旅人", desc: "走过草甸牛至短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.meadow_oregano_path);
    } },
    { id: "meadow_basil_sill", name: "草甸罗勒窗台", desc: "发现草甸罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.meadow_basil);
    } },
    { id: "meadow_basil_walker", name: "草甸罗勒径旅人", desc: "走过草甸罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.meadow_basil_path);
    } },
    { id: "meadow_mint_sill", name: "草甸薄荷窗台", desc: "发现草甸薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.meadow_mint);
    } },
    { id: "meadow_mint_walker", name: "草甸薄荷径旅人", desc: "走过草甸薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.meadow_mint_path);
    } },
    { id: "meadow_lavender_sill", name: "草甸薰衣草窗台", desc: "发现草甸薰衣草", check: function (s) {
      return !!(s.discovered && s.discovered.meadow_lavender);
    } },
    { id: "meadow_lavender_walker", name: "草甸薰衣草径旅人", desc: "走过草甸薰衣草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.meadow_lavender_path);
    } },
    { id: "meadow_rosemary_sill", name: "草甸迷迭香窗台", desc: "发现草甸迷迭香", check: function (s) {
      return !!(s.discovered && s.discovered.meadow_rosemary);
    } },
    { id: "meadow_rosemary_walker", name: "草甸迷迭香径旅人", desc: "走过草甸迷迭香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.meadow_rosemary_path);
    } },
    { id: "meadow_marjoram_sill", name: "草甸马郁兰窗台", desc: "发现草甸马郁兰", check: function (s) {
      return !!(s.discovered && s.discovered.meadow_marjoram);
    } },
    { id: "meadow_marjoram_walker", name: "草甸马郁兰径旅人", desc: "走过草甸马郁兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.meadow_marjoram_path);
    } },
    { id: "meadow_tarragon_sill", name: "草甸龙蒿窗台", desc: "发现草甸龙蒿", check: function (s) {
      return !!(s.discovered && s.discovered.meadow_tarragon);
    } },
    { id: "meadow_tarragon_walker", name: "草甸龙蒿径旅人", desc: "走过草甸龙蒿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.meadow_tarragon_path);
    } },
    { id: "meadow_chive_sill", name: "草甸香葱窗台", desc: "发现草甸香葱", check: function (s) {
      return !!(s.discovered && s.discovered.meadow_chive);
    } },
    { id: "meadow_chive_walker", name: "草甸香葱径旅人", desc: "走过草甸香葱短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.meadow_chive_path);
    } },
    { id: "meadow_parsley_sill", name: "草甸欧芹窗台", desc: "发现草甸欧芹", check: function (s) {
      return !!(s.discovered && s.discovered.meadow_parsley);
    } },
    { id: "meadow_parsley_walker", name: "草甸欧芹径旅人", desc: "走过草甸欧芹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.meadow_parsley_path);
    } },
    { id: "meadow_cilantro_sill", name: "草甸香菜窗台", desc: "发现草甸香菜", check: function (s) {
      return !!(s.discovered && s.discovered.meadow_cilantro);
    } },
    { id: "meadow_cilantro_walker", name: "草甸香菜径旅人", desc: "走过草甸香菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.meadow_cilantro_path);
    } },
    { id: "meadow_dill_sill", name: "草甸莳萝窗台", desc: "发现草甸莳萝", check: function (s) {
      return !!(s.discovered && s.discovered.meadow_dill);
    } },
    { id: "meadow_dill_walker", name: "草甸莳萝径旅人", desc: "走过草甸莳萝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.meadow_dill_path);
    } },
    { id: "meadow_fennel_sill", name: "草甸茴香窗台", desc: "发现草甸茴香", check: function (s) {
      return !!(s.discovered && s.discovered.meadow_fennel);
    } },
    { id: "meadow_fennel_walker", name: "草甸茴香径旅人", desc: "走过草甸茴香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.meadow_fennel_path);
    } },
    { id: "meadow_lovage_sill", name: "草甸独活窗台", desc: "发现草甸独活", check: function (s) {
      return !!(s.discovered && s.discovered.meadow_lovage);
    } },
    { id: "meadow_lovage_walker", name: "草甸独活径旅人", desc: "走过草甸独活短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.meadow_lovage_path);
    } },
    { id: "meadow_sorrel_sill", name: "草甸酸模窗台", desc: "发现草甸酸模", check: function (s) {
      return !!(s.discovered && s.discovered.meadow_sorrel);
    } },
    { id: "meadow_sorrel_walker", name: "草甸酸模径旅人", desc: "走过草甸酸模短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.meadow_sorrel_path);
    } },
    { id: "woodland_thyme_sill", name: "林地百里香窗台", desc: "发现林地百里香", check: function (s) {
      return !!(s.discovered && s.discovered.woodland_thyme);
    } },
    { id: "woodland_thyme_walker", name: "林地百里香径旅人", desc: "走过林地百里香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.woodland_thyme_path);
    } },
    { id: "woodland_sage_sill", name: "林间鼠尾草窗台", desc: "发现林间鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.woodland_sage);
    } },
    { id: "woodland_sage_walker", name: "林间鼠尾草径旅人", desc: "走过林间鼠尾草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.woodland_sage_path);
    } },
    { id: "woodland_oregano_sill", name: "林地牛至窗台", desc: "发现林地牛至", check: function (s) {
      return !!(s.discovered && s.discovered.woodland_oregano);
    } },
    { id: "woodland_oregano_walker", name: "林地牛至径旅人", desc: "走过林地牛至短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.woodland_oregano_path);
    } },
    { id: "woodland_basil_sill", name: "林地罗勒窗台", desc: "发现林地罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.woodland_basil);
    } },
    { id: "woodland_basil_walker", name: "林地罗勒径旅人", desc: "走过林地罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.woodland_basil_path);
    } },
    { id: "woodland_mint_sill", name: "林地薄荷窗台", desc: "发现林地薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.woodland_mint);
    } },
    { id: "woodland_mint_walker", name: "林地薄荷径旅人", desc: "走过林地薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.woodland_mint_path);
    } },
    { id: "woodland_lavender_sill", name: "林地薰衣草窗台", desc: "发现林地薰衣草", check: function (s) {
      return !!(s.discovered && s.discovered.woodland_lavender);
    } },
    { id: "woodland_lavender_walker", name: "林地薰衣草径旅人", desc: "走过林地薰衣草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.woodland_lavender_path);
    } },
    { id: "woodland_rosemary_sill", name: "林地迷迭香窗台", desc: "发现林地迷迭香", check: function (s) {
      return !!(s.discovered && s.discovered.woodland_rosemary);
    } },
    { id: "woodland_rosemary_walker", name: "林地迷迭香径旅人", desc: "走过林地迷迭香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.woodland_rosemary_path);
    } },
    { id: "woodland_marjoram_sill", name: "林地马郁兰窗台", desc: "发现林地马郁兰", check: function (s) {
      return !!(s.discovered && s.discovered.woodland_marjoram);
    } },
    { id: "woodland_marjoram_walker", name: "林地马郁兰径旅人", desc: "走过林地马郁兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.woodland_marjoram_path);
    } },
    { id: "woodland_tarragon_sill", name: "林地龙蒿窗台", desc: "发现林地龙蒿", check: function (s) {
      return !!(s.discovered && s.discovered.woodland_tarragon);
    } },
    { id: "woodland_tarragon_walker", name: "林地龙蒿径旅人", desc: "走过林地龙蒿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.woodland_tarragon_path);
    } },
    { id: "woodland_chive_sill", name: "林地香葱窗台", desc: "发现林地香葱", check: function (s) {
      return !!(s.discovered && s.discovered.woodland_chive);
    } },
    { id: "woodland_chive_walker", name: "林地香葱径旅人", desc: "走过林地香葱短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.woodland_chive_path);
    } },
    { id: "woodland_parsley_sill", name: "林地欧芹窗台", desc: "发现林地欧芹", check: function (s) {
      return !!(s.discovered && s.discovered.woodland_parsley);
    } },
    { id: "woodland_parsley_walker", name: "林地欧芹径旅人", desc: "走过林地欧芹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.woodland_parsley_path);
    } },
    { id: "woodland_cilantro_sill", name: "林地香菜窗台", desc: "发现林地香菜", check: function (s) {
      return !!(s.discovered && s.discovered.woodland_cilantro);
    } },
    { id: "woodland_cilantro_walker", name: "林地香菜径旅人", desc: "走过林地香菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.woodland_cilantro_path);
    } },
    { id: "woodland_dill_sill", name: "林地莳萝窗台", desc: "发现林地莳萝", check: function (s) {
      return !!(s.discovered && s.discovered.woodland_dill);
    } },
    { id: "woodland_dill_walker", name: "林地莳萝径旅人", desc: "走过林地莳萝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.woodland_dill_path);
    } },
    { id: "woodland_fennel_sill", name: "林地茴香窗台", desc: "发现林地茴香", check: function (s) {
      return !!(s.discovered && s.discovered.woodland_fennel);
    } },
    { id: "woodland_fennel_walker", name: "林地茴香径旅人", desc: "走过林地茴香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.woodland_fennel_path);
    } },
    { id: "woodland_lovage_sill", name: "林地独活窗台", desc: "发现林地独活", check: function (s) {
      return !!(s.discovered && s.discovered.woodland_lovage);
    } },
    { id: "woodland_lovage_walker", name: "林地独活径旅人", desc: "走过林地独活短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.woodland_lovage_path);
    } },
    { id: "woodland_sorrel_sill", name: "林地酸模窗台", desc: "发现林地酸模", check: function (s) {
      return !!(s.discovered && s.discovered.woodland_sorrel);
    } },
    { id: "woodland_sorrel_walker", name: "林地酸模径旅人", desc: "走过林地酸模短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.woodland_sorrel_path);
    } },
    { id: "garden_thyme_sill", name: "园栽百里香窗台", desc: "发现园栽百里香", check: function (s) {
      return !!(s.discovered && s.discovered.garden_thyme);
    } },
    { id: "garden_thyme_walker", name: "园栽百里香径旅人", desc: "走过园栽百里香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.garden_thyme_path);
    } },
    { id: "garden_sage_sill", name: "园栽鼠尾草窗台", desc: "发现园栽鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.garden_sage);
    } },
    { id: "garden_sage_walker", name: "园栽鼠尾草径旅人", desc: "走过园栽鼠尾草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.garden_sage_path);
    } },
    { id: "garden_oregano_sill", name: "园栽牛至窗台", desc: "发现园栽牛至", check: function (s) {
      return !!(s.discovered && s.discovered.garden_oregano);
    } },
    { id: "garden_oregano_walker", name: "园栽牛至径旅人", desc: "走过园栽牛至短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.garden_oregano_path);
    } },
    { id: "garden_basil_sill", name: "园栽罗勒窗台", desc: "发现园栽罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.garden_basil);
    } },
    { id: "garden_basil_walker", name: "园栽罗勒径旅人", desc: "走过园栽罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.garden_basil_path);
    } },
    { id: "garden_mint_sill", name: "园栽薄荷窗台", desc: "发现园栽薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.garden_mint);
    } },
    { id: "garden_mint_walker", name: "园栽薄荷径旅人", desc: "走过园栽薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.garden_mint_path);
    } },
    { id: "garden_lavender_sill", name: "园栽薰衣草窗台", desc: "发现园栽薰衣草", check: function (s) {
      return !!(s.discovered && s.discovered.garden_lavender);
    } },
    { id: "garden_lavender_walker", name: "园栽薰衣草径旅人", desc: "走过园栽薰衣草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.garden_lavender_path);
    } },
    { id: "garden_rosemary_sill", name: "园栽迷迭香窗台", desc: "发现园栽迷迭香", check: function (s) {
      return !!(s.discovered && s.discovered.garden_rosemary);
    } },
    { id: "garden_rosemary_walker", name: "园栽迷迭香径旅人", desc: "走过园栽迷迭香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.garden_rosemary_path);
    } },
    { id: "garden_marjoram_sill", name: "园栽马郁兰窗台", desc: "发现园栽马郁兰", check: function (s) {
      return !!(s.discovered && s.discovered.garden_marjoram);
    } },
    { id: "garden_marjoram_walker", name: "园栽马郁兰径旅人", desc: "走过园栽马郁兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.garden_marjoram_path);
    } },
    { id: "garden_tarragon_sill", name: "园栽龙蒿窗台", desc: "发现园栽龙蒿", check: function (s) {
      return !!(s.discovered && s.discovered.garden_tarragon);
    } },
    { id: "garden_tarragon_walker", name: "园栽龙蒿径旅人", desc: "走过园栽龙蒿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.garden_tarragon_path);
    } },
    { id: "garden_chive_sill", name: "园栽香葱窗台", desc: "发现园栽香葱", check: function (s) {
      return !!(s.discovered && s.discovered.garden_chive);
    } },
    { id: "garden_chive_walker", name: "园栽香葱径旅人", desc: "走过园栽香葱短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.garden_chive_path);
    } },
    { id: "garden_parsley_sill", name: "园栽欧芹窗台", desc: "发现园栽欧芹", check: function (s) {
      return !!(s.discovered && s.discovered.garden_parsley);
    } },
    { id: "garden_parsley_walker", name: "园栽欧芹径旅人", desc: "走过园栽欧芹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.garden_parsley_path);
    } },
    { id: "garden_cilantro_sill", name: "园栽香菜窗台", desc: "发现园栽香菜", check: function (s) {
      return !!(s.discovered && s.discovered.garden_cilantro);
    } },
    { id: "garden_cilantro_walker", name: "园栽香菜径旅人", desc: "走过园栽香菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.garden_cilantro_path);
    } },
    { id: "garden_dill_sill", name: "园栽莳萝窗台", desc: "发现园栽莳萝", check: function (s) {
      return !!(s.discovered && s.discovered.garden_dill);
    } },
    { id: "garden_dill_walker", name: "园栽莳萝径旅人", desc: "走过园栽莳萝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.garden_dill_path);
    } },
    { id: "garden_fennel_sill", name: "园栽茴香窗台", desc: "发现园栽茴香", check: function (s) {
      return !!(s.discovered && s.discovered.garden_fennel);
    } },
    { id: "garden_fennel_walker", name: "园栽茴香径旅人", desc: "走过园栽茴香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.garden_fennel_path);
    } },
    { id: "garden_lovage_sill", name: "园栽独活窗台", desc: "发现园栽独活", check: function (s) {
      return !!(s.discovered && s.discovered.garden_lovage);
    } },
    { id: "garden_lovage_walker", name: "园栽独活径旅人", desc: "走过园栽独活短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.garden_lovage_path);
    } },
    { id: "garden_sorrel_sill", name: "园栽酸模窗台", desc: "发现园栽酸模", check: function (s) {
      return !!(s.discovered && s.discovered.garden_sorrel);
    } },
    { id: "garden_sorrel_walker", name: "园栽酸模径旅人", desc: "走过园栽酸模短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.garden_sorrel_path);
    } },
    { id: "wild_thyme_sill", name: "野生百里香窗台", desc: "发现野生百里香", check: function (s) {
      return !!(s.discovered && s.discovered.wild_thyme);
    } },
    { id: "wild_thyme_walker", name: "野生百里香径旅人", desc: "走过野生百里香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wild_thyme_path);
    } },
    { id: "wild_sage_sill", name: "野生鼠尾草窗台", desc: "发现野生鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.wild_sage);
    } },
    { id: "wild_sage_walker", name: "野生鼠尾草径旅人", desc: "走过野生鼠尾草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wild_sage_path);
    } },
    { id: "wild_oregano_sill", name: "野生牛至窗台", desc: "发现野生牛至", check: function (s) {
      return !!(s.discovered && s.discovered.wild_oregano);
    } },
    { id: "wild_oregano_walker", name: "野生牛至径旅人", desc: "走过野生牛至短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wild_oregano_path);
    } },
    { id: "wild_basil_sill", name: "野生罗勒窗台", desc: "发现野生罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.wild_basil);
    } },
    { id: "wild_basil_walker", name: "野生罗勒径旅人", desc: "走过野生罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wild_basil_path);
    } },
    { id: "wild_mint_sill", name: "野生薄荷窗台", desc: "发现野生薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.wild_mint);
    } },
    { id: "wild_mint_walker", name: "野生薄荷径旅人", desc: "走过野生薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wild_mint_path);
    } },
    { id: "wild_lavender_sill", name: "野生薰衣草窗台", desc: "发现野生薰衣草", check: function (s) {
      return !!(s.discovered && s.discovered.wild_lavender);
    } },
    { id: "wild_lavender_walker", name: "野生薰衣草径旅人", desc: "走过野生薰衣草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wild_lavender_path);
    } },
    { id: "wild_rosemary_sill", name: "野生迷迭香窗台", desc: "发现野生迷迭香", check: function (s) {
      return !!(s.discovered && s.discovered.wild_rosemary);
    } },
    { id: "wild_rosemary_walker", name: "野生迷迭香径旅人", desc: "走过野生迷迭香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wild_rosemary_path);
    } },
    { id: "wild_marjoram_sill", name: "野生马郁兰窗台", desc: "发现野生马郁兰", check: function (s) {
      return !!(s.discovered && s.discovered.wild_marjoram);
    } },
    { id: "wild_marjoram_walker", name: "野生马郁兰径旅人", desc: "走过野生马郁兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wild_marjoram_path);
    } },
    { id: "wild_tarragon_sill", name: "野生龙蒿窗台", desc: "发现野生龙蒿", check: function (s) {
      return !!(s.discovered && s.discovered.wild_tarragon);
    } },
    { id: "wild_tarragon_walker", name: "野生龙蒿径旅人", desc: "走过野生龙蒿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wild_tarragon_path);
    } },
    { id: "wild_chive_sill", name: "野生香葱窗台", desc: "发现野生香葱", check: function (s) {
      return !!(s.discovered && s.discovered.wild_chive);
    } },
    { id: "wild_chive_walker", name: "野生香葱径旅人", desc: "走过野生香葱短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wild_chive_path);
    } },
    { id: "wild_parsley_sill", name: "野生欧芹窗台", desc: "发现野生欧芹", check: function (s) {
      return !!(s.discovered && s.discovered.wild_parsley);
    } },
    { id: "wild_parsley_walker", name: "野生欧芹径旅人", desc: "走过野生欧芹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wild_parsley_path);
    } },
    { id: "wild_cilantro_sill", name: "野生香菜窗台", desc: "发现野生香菜", check: function (s) {
      return !!(s.discovered && s.discovered.wild_cilantro);
    } },
    { id: "wild_cilantro_walker", name: "野生香菜径旅人", desc: "走过野生香菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wild_cilantro_path);
    } },
    { id: "wild_dill_sill", name: "野生莳萝窗台", desc: "发现野生莳萝", check: function (s) {
      return !!(s.discovered && s.discovered.wild_dill);
    } },
    { id: "wild_dill_walker", name: "野生莳萝径旅人", desc: "走过野生莳萝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wild_dill_path);
    } },
    { id: "wild_fennel_sill", name: "野生茴香窗台", desc: "发现野生茴香", check: function (s) {
      return !!(s.discovered && s.discovered.wild_fennel);
    } },
    { id: "wild_fennel_walker", name: "野生茴香径旅人", desc: "走过野生茴香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wild_fennel_path);
    } },
    { id: "wild_lovage_sill", name: "野生独活窗台", desc: "发现野生独活", check: function (s) {
      return !!(s.discovered && s.discovered.wild_lovage);
    } },
    { id: "wild_lovage_walker", name: "野生独活径旅人", desc: "走过野生独活短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wild_lovage_path);
    } },
    { id: "wild_sorrel_sill", name: "野生酸模窗台", desc: "发现野生酸模", check: function (s) {
      return !!(s.discovered && s.discovered.wild_sorrel);
    } },
    { id: "wild_sorrel_walker", name: "野生酸模径旅人", desc: "走过野生酸模短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.wild_sorrel_path);
    } },
    { id: "dwarf_thyme_sill", name: "矮生百里香窗台", desc: "发现矮生百里香", check: function (s) {
      return !!(s.discovered && s.discovered.dwarf_thyme);
    } },
    { id: "dwarf_thyme_walker", name: "矮生百里香径旅人", desc: "走过矮生百里香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dwarf_thyme_path);
    } },
    { id: "dwarf_sage_sill", name: "矮生鼠尾草窗台", desc: "发现矮生鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.dwarf_sage);
    } },
    { id: "dwarf_sage_walker", name: "矮生鼠尾草径旅人", desc: "走过矮生鼠尾草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dwarf_sage_path);
    } },
    { id: "dwarf_oregano_sill", name: "矮生牛至窗台", desc: "发现矮生牛至", check: function (s) {
      return !!(s.discovered && s.discovered.dwarf_oregano);
    } },
    { id: "dwarf_oregano_walker", name: "矮生牛至径旅人", desc: "走过矮生牛至短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dwarf_oregano_path);
    } },
    { id: "dwarf_basil_sill", name: "矮生罗勒窗台", desc: "发现矮生罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.dwarf_basil);
    } },
    { id: "dwarf_basil_walker", name: "矮生罗勒径旅人", desc: "走过矮生罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dwarf_basil_path);
    } },
    { id: "dwarf_mint_sill", name: "矮生薄荷窗台", desc: "发现矮生薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.dwarf_mint);
    } },
    { id: "dwarf_mint_walker", name: "矮生薄荷径旅人", desc: "走过矮生薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dwarf_mint_path);
    } },
    { id: "dwarf_lavender_sill", name: "矮生薰衣草窗台", desc: "发现矮生薰衣草", check: function (s) {
      return !!(s.discovered && s.discovered.dwarf_lavender);
    } },
    { id: "dwarf_lavender_walker", name: "矮生薰衣草径旅人", desc: "走过矮生薰衣草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dwarf_lavender_path);
    } },
    { id: "dwarf_rosemary_sill", name: "矮生迷迭香窗台", desc: "发现矮生迷迭香", check: function (s) {
      return !!(s.discovered && s.discovered.dwarf_rosemary);
    } },
    { id: "dwarf_rosemary_walker", name: "矮生迷迭香径旅人", desc: "走过矮生迷迭香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dwarf_rosemary_path);
    } },
    { id: "dwarf_marjoram_sill", name: "矮生马郁兰窗台", desc: "发现矮生马郁兰", check: function (s) {
      return !!(s.discovered && s.discovered.dwarf_marjoram);
    } },
    { id: "dwarf_marjoram_walker", name: "矮生马郁兰径旅人", desc: "走过矮生马郁兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dwarf_marjoram_path);
    } },
    { id: "dwarf_tarragon_sill", name: "矮生龙蒿窗台", desc: "发现矮生龙蒿", check: function (s) {
      return !!(s.discovered && s.discovered.dwarf_tarragon);
    } },
    { id: "dwarf_tarragon_walker", name: "矮生龙蒿径旅人", desc: "走过矮生龙蒿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dwarf_tarragon_path);
    } },
    { id: "dwarf_chive_sill", name: "矮生香葱窗台", desc: "发现矮生香葱", check: function (s) {
      return !!(s.discovered && s.discovered.dwarf_chive);
    } },
    { id: "dwarf_chive_walker", name: "矮生香葱径旅人", desc: "走过矮生香葱短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dwarf_chive_path);
    } },
    { id: "dwarf_parsley_sill", name: "矮生欧芹窗台", desc: "发现矮生欧芹", check: function (s) {
      return !!(s.discovered && s.discovered.dwarf_parsley);
    } },
    { id: "dwarf_parsley_walker", name: "矮生欧芹径旅人", desc: "走过矮生欧芹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dwarf_parsley_path);
    } },
    { id: "dwarf_cilantro_sill", name: "矮生香菜窗台", desc: "发现矮生香菜", check: function (s) {
      return !!(s.discovered && s.discovered.dwarf_cilantro);
    } },
    { id: "dwarf_cilantro_walker", name: "矮生香菜径旅人", desc: "走过矮生香菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dwarf_cilantro_path);
    } },
    { id: "dwarf_dill_sill", name: "矮生莳萝窗台", desc: "发现矮生莳萝", check: function (s) {
      return !!(s.discovered && s.discovered.dwarf_dill);
    } },
    { id: "dwarf_dill_walker", name: "矮生莳萝径旅人", desc: "走过矮生莳萝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dwarf_dill_path);
    } },
    { id: "dwarf_fennel_sill", name: "矮生茴香窗台", desc: "发现矮生茴香", check: function (s) {
      return !!(s.discovered && s.discovered.dwarf_fennel);
    } },
    { id: "dwarf_fennel_walker", name: "矮生茴香径旅人", desc: "走过矮生茴香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dwarf_fennel_path);
    } },
    { id: "dwarf_lovage_sill", name: "矮生独活窗台", desc: "发现矮生独活", check: function (s) {
      return !!(s.discovered && s.discovered.dwarf_lovage);
    } },
    { id: "dwarf_lovage_walker", name: "矮生独活径旅人", desc: "走过矮生独活短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dwarf_lovage_path);
    } },
    { id: "dwarf_sorrel_sill", name: "矮生酸模窗台", desc: "发现矮生酸模", check: function (s) {
      return !!(s.discovered && s.discovered.dwarf_sorrel);
    } },
    { id: "dwarf_sorrel_walker", name: "矮生酸模径旅人", desc: "走过矮生酸模短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.dwarf_sorrel_path);
    } },
    { id: "giant_thyme_sill", name: "巨生百里香窗台", desc: "发现巨生百里香", check: function (s) {
      return !!(s.discovered && s.discovered.giant_thyme);
    } },
    { id: "giant_thyme_walker", name: "巨生百里香径旅人", desc: "走过巨生百里香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.giant_thyme_path);
    } },
    { id: "giant_sage_sill", name: "巨生鼠尾草窗台", desc: "发现巨生鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.giant_sage);
    } },
    { id: "giant_sage_walker", name: "巨生鼠尾草径旅人", desc: "走过巨生鼠尾草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.giant_sage_path);
    } },
    { id: "giant_oregano_sill", name: "巨生牛至窗台", desc: "发现巨生牛至", check: function (s) {
      return !!(s.discovered && s.discovered.giant_oregano);
    } },
    { id: "giant_oregano_walker", name: "巨生牛至径旅人", desc: "走过巨生牛至短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.giant_oregano_path);
    } },
    { id: "giant_basil_sill", name: "巨生罗勒窗台", desc: "发现巨生罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.giant_basil);
    } },
    { id: "giant_basil_walker", name: "巨生罗勒径旅人", desc: "走过巨生罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.giant_basil_path);
    } },
    { id: "giant_mint_sill", name: "巨生薄荷窗台", desc: "发现巨生薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.giant_mint);
    } },
    { id: "giant_mint_walker", name: "巨生薄荷径旅人", desc: "走过巨生薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.giant_mint_path);
    } },
    { id: "giant_lavender_sill", name: "巨生薰衣草窗台", desc: "发现巨生薰衣草", check: function (s) {
      return !!(s.discovered && s.discovered.giant_lavender);
    } },
    { id: "giant_lavender_walker", name: "巨生薰衣草径旅人", desc: "走过巨生薰衣草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.giant_lavender_path);
    } },
    { id: "giant_rosemary_sill", name: "巨生迷迭香窗台", desc: "发现巨生迷迭香", check: function (s) {
      return !!(s.discovered && s.discovered.giant_rosemary);
    } },
    { id: "giant_rosemary_walker", name: "巨生迷迭香径旅人", desc: "走过巨生迷迭香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.giant_rosemary_path);
    } },
    { id: "giant_marjoram_sill", name: "巨生马郁兰窗台", desc: "发现巨生马郁兰", check: function (s) {
      return !!(s.discovered && s.discovered.giant_marjoram);
    } },
    { id: "giant_marjoram_walker", name: "巨生马郁兰径旅人", desc: "走过巨生马郁兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.giant_marjoram_path);
    } },
    { id: "giant_tarragon_sill", name: "巨生龙蒿窗台", desc: "发现巨生龙蒿", check: function (s) {
      return !!(s.discovered && s.discovered.giant_tarragon);
    } },
    { id: "giant_tarragon_walker", name: "巨生龙蒿径旅人", desc: "走过巨生龙蒿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.giant_tarragon_path);
    } },
    { id: "giant_chive_sill", name: "巨生香葱窗台", desc: "发现巨生香葱", check: function (s) {
      return !!(s.discovered && s.discovered.giant_chive);
    } },
    { id: "giant_chive_walker", name: "巨生香葱径旅人", desc: "走过巨生香葱短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.giant_chive_path);
    } },
    { id: "giant_parsley_sill", name: "巨生欧芹窗台", desc: "发现巨生欧芹", check: function (s) {
      return !!(s.discovered && s.discovered.giant_parsley);
    } },
    { id: "giant_parsley_walker", name: "巨生欧芹径旅人", desc: "走过巨生欧芹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.giant_parsley_path);
    } },
    { id: "giant_cilantro_sill", name: "巨生香菜窗台", desc: "发现巨生香菜", check: function (s) {
      return !!(s.discovered && s.discovered.giant_cilantro);
    } },
    { id: "giant_cilantro_walker", name: "巨生香菜径旅人", desc: "走过巨生香菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.giant_cilantro_path);
    } },
    { id: "giant_dill_sill", name: "巨生莳萝窗台", desc: "发现巨生莳萝", check: function (s) {
      return !!(s.discovered && s.discovered.giant_dill);
    } },
    { id: "giant_dill_walker", name: "巨生莳萝径旅人", desc: "走过巨生莳萝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.giant_dill_path);
    } },
    { id: "giant_fennel_sill", name: "巨生茴香窗台", desc: "发现巨生茴香", check: function (s) {
      return !!(s.discovered && s.discovered.giant_fennel);
    } },
    { id: "giant_fennel_walker", name: "巨生茴香径旅人", desc: "走过巨生茴香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.giant_fennel_path);
    } },
    { id: "giant_lovage_sill", name: "巨生独活窗台", desc: "发现巨生独活", check: function (s) {
      return !!(s.discovered && s.discovered.giant_lovage);
    } },
    { id: "giant_lovage_walker", name: "巨生独活径旅人", desc: "走过巨生独活短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.giant_lovage_path);
    } },
    { id: "giant_sorrel_sill", name: "巨生酸模窗台", desc: "发现巨生酸模", check: function (s) {
      return !!(s.discovered && s.discovered.giant_sorrel);
    } },
    { id: "giant_sorrel_walker", name: "巨生酸模径旅人", desc: "走过巨生酸模短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.giant_sorrel_path);
    } },
    { id: "variegated_thyme_sill", name: "斑叶百里香窗台", desc: "发现斑叶百里香", check: function (s) {
      return !!(s.discovered && s.discovered.variegated_thyme);
    } },
    { id: "variegated_thyme_walker", name: "斑叶百里香径旅人", desc: "走过斑叶百里香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.variegated_thyme_path);
    } },
    { id: "variegated_sage_sill", name: "斑叶鼠尾草窗台", desc: "发现斑叶鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.variegated_sage);
    } },
    { id: "variegated_sage_walker", name: "斑叶鼠尾草径旅人", desc: "走过斑叶鼠尾草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.variegated_sage_path);
    } },
    { id: "variegated_oregano_sill", name: "斑叶牛至窗台", desc: "发现斑叶牛至", check: function (s) {
      return !!(s.discovered && s.discovered.variegated_oregano);
    } },
    { id: "variegated_oregano_walker", name: "斑叶牛至径旅人", desc: "走过斑叶牛至短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.variegated_oregano_path);
    } },
    { id: "variegated_basil_sill", name: "斑叶罗勒窗台", desc: "发现斑叶罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.variegated_basil);
    } },
    { id: "variegated_basil_walker", name: "斑叶罗勒径旅人", desc: "走过斑叶罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.variegated_basil_path);
    } },
    { id: "variegated_mint_sill", name: "斑叶薄荷窗台", desc: "发现斑叶薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.variegated_mint);
    } },
    { id: "variegated_mint_walker", name: "斑叶薄荷径旅人", desc: "走过斑叶薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.variegated_mint_path);
    } },
    { id: "variegated_lavender_sill", name: "斑叶薰衣草窗台", desc: "发现斑叶薰衣草", check: function (s) {
      return !!(s.discovered && s.discovered.variegated_lavender);
    } },
    { id: "variegated_lavender_walker", name: "斑叶薰衣草径旅人", desc: "走过斑叶薰衣草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.variegated_lavender_path);
    } },
    { id: "variegated_rosemary_sill", name: "斑叶迷迭香窗台", desc: "发现斑叶迷迭香", check: function (s) {
      return !!(s.discovered && s.discovered.variegated_rosemary);
    } },
    { id: "variegated_rosemary_walker", name: "斑叶迷迭香径旅人", desc: "走过斑叶迷迭香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.variegated_rosemary_path);
    } },
    { id: "variegated_marjoram_sill", name: "斑叶马郁兰窗台", desc: "发现斑叶马郁兰", check: function (s) {
      return !!(s.discovered && s.discovered.variegated_marjoram);
    } },
    { id: "variegated_marjoram_walker", name: "斑叶马郁兰径旅人", desc: "走过斑叶马郁兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.variegated_marjoram_path);
    } },
    { id: "variegated_tarragon_sill", name: "斑叶龙蒿窗台", desc: "发现斑叶龙蒿", check: function (s) {
      return !!(s.discovered && s.discovered.variegated_tarragon);
    } },
    { id: "variegated_tarragon_walker", name: "斑叶龙蒿径旅人", desc: "走过斑叶龙蒿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.variegated_tarragon_path);
    } },
    { id: "variegated_chive_sill", name: "斑叶香葱窗台", desc: "发现斑叶香葱", check: function (s) {
      return !!(s.discovered && s.discovered.variegated_chive);
    } },
    { id: "variegated_chive_walker", name: "斑叶香葱径旅人", desc: "走过斑叶香葱短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.variegated_chive_path);
    } },
    { id: "variegated_parsley_sill", name: "斑叶欧芹窗台", desc: "发现斑叶欧芹", check: function (s) {
      return !!(s.discovered && s.discovered.variegated_parsley);
    } },
    { id: "variegated_parsley_walker", name: "斑叶欧芹径旅人", desc: "走过斑叶欧芹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.variegated_parsley_path);
    } },
    { id: "variegated_cilantro_sill", name: "斑叶香菜窗台", desc: "发现斑叶香菜", check: function (s) {
      return !!(s.discovered && s.discovered.variegated_cilantro);
    } },
    { id: "variegated_cilantro_walker", name: "斑叶香菜径旅人", desc: "走过斑叶香菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.variegated_cilantro_path);
    } },
    { id: "variegated_dill_sill", name: "斑叶莳萝窗台", desc: "发现斑叶莳萝", check: function (s) {
      return !!(s.discovered && s.discovered.variegated_dill);
    } },
    { id: "variegated_dill_walker", name: "斑叶莳萝径旅人", desc: "走过斑叶莳萝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.variegated_dill_path);
    } },
    { id: "variegated_fennel_sill", name: "斑叶茴香窗台", desc: "发现斑叶茴香", check: function (s) {
      return !!(s.discovered && s.discovered.variegated_fennel);
    } },
    { id: "variegated_fennel_walker", name: "斑叶茴香径旅人", desc: "走过斑叶茴香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.variegated_fennel_path);
    } },
    { id: "variegated_lovage_sill", name: "斑叶独活窗台", desc: "发现斑叶独活", check: function (s) {
      return !!(s.discovered && s.discovered.variegated_lovage);
    } },
    { id: "variegated_lovage_walker", name: "斑叶独活径旅人", desc: "走过斑叶独活短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.variegated_lovage_path);
    } },
    { id: "variegated_sorrel_sill", name: "斑叶酸模窗台", desc: "发现斑叶酸模", check: function (s) {
      return !!(s.discovered && s.discovered.variegated_sorrel);
    } },
    { id: "variegated_sorrel_walker", name: "斑叶酸模径旅人", desc: "走过斑叶酸模短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.variegated_sorrel_path);
    } },
    { id: "golden_thyme_sill", name: "金叶百里香窗台", desc: "发现金叶百里香", check: function (s) {
      return !!(s.discovered && s.discovered.golden_thyme);
    } },
    { id: "golden_thyme_walker", name: "金叶百里香径旅人", desc: "走过金叶百里香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.golden_thyme_path);
    } },
    { id: "golden_sage_sill", name: "金叶鼠尾草窗台", desc: "发现金叶鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.golden_sage);
    } },
    { id: "golden_sage_walker", name: "金叶鼠尾草径旅人", desc: "走过金叶鼠尾草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.golden_sage_path);
    } },
    { id: "golden_oregano_sill", name: "金叶牛至窗台", desc: "发现金叶牛至", check: function (s) {
      return !!(s.discovered && s.discovered.golden_oregano);
    } },
    { id: "golden_oregano_walker", name: "金叶牛至径旅人", desc: "走过金叶牛至短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.golden_oregano_path);
    } },
    { id: "golden_basil_sill", name: "金叶罗勒窗台", desc: "发现金叶罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.golden_basil);
    } },
    { id: "golden_basil_walker", name: "金叶罗勒径旅人", desc: "走过金叶罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.golden_basil_path);
    } },
    { id: "golden_mint_sill", name: "金叶薄荷窗台", desc: "发现金叶薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.golden_mint);
    } },
    { id: "golden_mint_walker", name: "金叶薄荷径旅人", desc: "走过金叶薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.golden_mint_path);
    } },
    { id: "golden_lavender_sill", name: "金叶薰衣草窗台", desc: "发现金叶薰衣草", check: function (s) {
      return !!(s.discovered && s.discovered.golden_lavender);
    } },
    { id: "golden_lavender_walker", name: "金叶薰衣草径旅人", desc: "走过金叶薰衣草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.golden_lavender_path);
    } },
    { id: "golden_rosemary_sill", name: "金叶迷迭香窗台", desc: "发现金叶迷迭香", check: function (s) {
      return !!(s.discovered && s.discovered.golden_rosemary);
    } },
    { id: "golden_rosemary_walker", name: "金叶迷迭香径旅人", desc: "走过金叶迷迭香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.golden_rosemary_path);
    } },
    { id: "golden_marjoram_sill", name: "金叶马郁兰窗台", desc: "发现金叶马郁兰", check: function (s) {
      return !!(s.discovered && s.discovered.golden_marjoram);
    } },
    { id: "golden_marjoram_walker", name: "金叶马郁兰径旅人", desc: "走过金叶马郁兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.golden_marjoram_path);
    } },
    { id: "golden_tarragon_sill", name: "金叶龙蒿窗台", desc: "发现金叶龙蒿", check: function (s) {
      return !!(s.discovered && s.discovered.golden_tarragon);
    } },
    { id: "golden_tarragon_walker", name: "金叶龙蒿径旅人", desc: "走过金叶龙蒿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.golden_tarragon_path);
    } },
    { id: "golden_chive_sill", name: "金叶香葱窗台", desc: "发现金叶香葱", check: function (s) {
      return !!(s.discovered && s.discovered.golden_chive);
    } },
    { id: "golden_chive_walker", name: "金叶香葱径旅人", desc: "走过金叶香葱短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.golden_chive_path);
    } },
    { id: "golden_parsley_sill", name: "金叶欧芹窗台", desc: "发现金叶欧芹", check: function (s) {
      return !!(s.discovered && s.discovered.golden_parsley);
    } },
    { id: "golden_parsley_walker", name: "金叶欧芹径旅人", desc: "走过金叶欧芹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.golden_parsley_path);
    } },
    { id: "golden_cilantro_sill", name: "金叶香菜窗台", desc: "发现金叶香菜", check: function (s) {
      return !!(s.discovered && s.discovered.golden_cilantro);
    } },
    { id: "golden_cilantro_walker", name: "金叶香菜径旅人", desc: "走过金叶香菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.golden_cilantro_path);
    } },
    { id: "golden_dill_sill", name: "金叶莳萝窗台", desc: "发现金叶莳萝", check: function (s) {
      return !!(s.discovered && s.discovered.golden_dill);
    } },
    { id: "golden_dill_walker", name: "金叶莳萝径旅人", desc: "走过金叶莳萝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.golden_dill_path);
    } },
    { id: "golden_fennel_sill", name: "金叶茴香窗台", desc: "发现金叶茴香", check: function (s) {
      return !!(s.discovered && s.discovered.golden_fennel);
    } },
    { id: "golden_fennel_walker", name: "金叶茴香径旅人", desc: "走过金叶茴香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.golden_fennel_path);
    } },
    { id: "golden_lovage_sill", name: "金叶独活窗台", desc: "发现金叶独活", check: function (s) {
      return !!(s.discovered && s.discovered.golden_lovage);
    } },
    { id: "golden_lovage_walker", name: "金叶独活径旅人", desc: "走过金叶独活短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.golden_lovage_path);
    } },
    { id: "golden_sorrel_sill", name: "金叶酸模窗台", desc: "发现金叶酸模", check: function (s) {
      return !!(s.discovered && s.discovered.golden_sorrel);
    } },
    { id: "golden_sorrel_walker", name: "金叶酸模径旅人", desc: "走过金叶酸模短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.golden_sorrel_path);
    } },
    { id: "silver_thyme_sill", name: "银叶百里香窗台", desc: "发现银叶百里香", check: function (s) {
      return !!(s.discovered && s.discovered.silver_thyme);
    } },
    { id: "silver_thyme_walker", name: "银叶百里香径旅人", desc: "走过银叶百里香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.silver_thyme_path);
    } },
    { id: "silver_sage_sill", name: "银叶鼠尾草窗台", desc: "发现银叶鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.silver_sage);
    } },
    { id: "silver_sage_walker", name: "银叶鼠尾草径旅人", desc: "走过银叶鼠尾草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.silver_sage_path);
    } },
    { id: "silver_oregano_sill", name: "银叶牛至窗台", desc: "发现银叶牛至", check: function (s) {
      return !!(s.discovered && s.discovered.silver_oregano);
    } },
    { id: "silver_oregano_walker", name: "银叶牛至径旅人", desc: "走过银叶牛至短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.silver_oregano_path);
    } },
    { id: "silver_basil_sill", name: "银叶罗勒窗台", desc: "发现银叶罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.silver_basil);
    } },
    { id: "silver_basil_walker", name: "银叶罗勒径旅人", desc: "走过银叶罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.silver_basil_path);
    } },
    { id: "silver_mint_sill", name: "银叶薄荷窗台", desc: "发现银叶薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.silver_mint);
    } },
    { id: "silver_mint_walker", name: "银叶薄荷径旅人", desc: "走过银叶薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.silver_mint_path);
    } },
    { id: "silver_lavender_sill", name: "银叶薰衣草窗台", desc: "发现银叶薰衣草", check: function (s) {
      return !!(s.discovered && s.discovered.silver_lavender);
    } },
    { id: "silver_lavender_walker", name: "银叶薰衣草径旅人", desc: "走过银叶薰衣草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.silver_lavender_path);
    } },
    { id: "silver_rosemary_sill", name: "银叶迷迭香窗台", desc: "发现银叶迷迭香", check: function (s) {
      return !!(s.discovered && s.discovered.silver_rosemary);
    } },
    { id: "silver_rosemary_walker", name: "银叶迷迭香径旅人", desc: "走过银叶迷迭香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.silver_rosemary_path);
    } },
    { id: "silver_marjoram_sill", name: "银叶马郁兰窗台", desc: "发现银叶马郁兰", check: function (s) {
      return !!(s.discovered && s.discovered.silver_marjoram);
    } },
    { id: "silver_marjoram_walker", name: "银叶马郁兰径旅人", desc: "走过银叶马郁兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.silver_marjoram_path);
    } },
    { id: "silver_tarragon_sill", name: "银叶龙蒿窗台", desc: "发现银叶龙蒿", check: function (s) {
      return !!(s.discovered && s.discovered.silver_tarragon);
    } },
    { id: "silver_tarragon_walker", name: "银叶龙蒿径旅人", desc: "走过银叶龙蒿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.silver_tarragon_path);
    } },
    { id: "silver_chive_sill", name: "银叶香葱窗台", desc: "发现银叶香葱", check: function (s) {
      return !!(s.discovered && s.discovered.silver_chive);
    } },
    { id: "silver_chive_walker", name: "银叶香葱径旅人", desc: "走过银叶香葱短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.silver_chive_path);
    } },
    { id: "silver_parsley_sill", name: "银叶欧芹窗台", desc: "发现银叶欧芹", check: function (s) {
      return !!(s.discovered && s.discovered.silver_parsley);
    } },
    { id: "silver_parsley_walker", name: "银叶欧芹径旅人", desc: "走过银叶欧芹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.silver_parsley_path);
    } },
    { id: "silver_cilantro_sill", name: "银叶香菜窗台", desc: "发现银叶香菜", check: function (s) {
      return !!(s.discovered && s.discovered.silver_cilantro);
    } },
    { id: "silver_cilantro_walker", name: "银叶香菜径旅人", desc: "走过银叶香菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.silver_cilantro_path);
    } },
    { id: "silver_dill_sill", name: "银叶莳萝窗台", desc: "发现银叶莳萝", check: function (s) {
      return !!(s.discovered && s.discovered.silver_dill);
    } },
    { id: "silver_dill_walker", name: "银叶莳萝径旅人", desc: "走过银叶莳萝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.silver_dill_path);
    } },
    { id: "silver_fennel_sill", name: "银叶茴香窗台", desc: "发现银叶茴香", check: function (s) {
      return !!(s.discovered && s.discovered.silver_fennel);
    } },
    { id: "silver_fennel_walker", name: "银叶茴香径旅人", desc: "走过银叶茴香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.silver_fennel_path);
    } },
    { id: "silver_lovage_sill", name: "银叶独活窗台", desc: "发现银叶独活", check: function (s) {
      return !!(s.discovered && s.discovered.silver_lovage);
    } },
    { id: "silver_lovage_walker", name: "银叶独活径旅人", desc: "走过银叶独活短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.silver_lovage_path);
    } },
    { id: "silver_sorrel_sill", name: "银叶酸模窗台", desc: "发现银叶酸模", check: function (s) {
      return !!(s.discovered && s.discovered.silver_sorrel);
    } },
    { id: "silver_sorrel_walker", name: "银叶酸模径旅人", desc: "走过银叶酸模短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.silver_sorrel_path);
    } },
    { id: "purple_thyme_sill", name: "紫叶百里香窗台", desc: "发现紫叶百里香", check: function (s) {
      return !!(s.discovered && s.discovered.purple_thyme);
    } },
    { id: "purple_thyme_walker", name: "紫叶百里香径旅人", desc: "走过紫叶百里香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.purple_thyme_path);
    } },
    { id: "purple_sage_sill", name: "紫叶鼠尾草窗台", desc: "发现紫叶鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.purple_sage);
    } },
    { id: "purple_sage_walker", name: "紫叶鼠尾草径旅人", desc: "走过紫叶鼠尾草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.purple_sage_path);
    } },
    { id: "purple_oregano_sill", name: "紫叶牛至窗台", desc: "发现紫叶牛至", check: function (s) {
      return !!(s.discovered && s.discovered.purple_oregano);
    } },
    { id: "purple_oregano_walker", name: "紫叶牛至径旅人", desc: "走过紫叶牛至短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.purple_oregano_path);
    } },
    { id: "purple_basil_sill", name: "紫叶罗勒窗台", desc: "发现紫叶罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.purple_basil);
    } },
    { id: "purple_basil_walker", name: "紫叶罗勒径旅人", desc: "走过紫叶罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.purple_basil_path);
    } },
    { id: "purple_mint_sill", name: "紫叶薄荷窗台", desc: "发现紫叶薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.purple_mint);
    } },
    { id: "purple_mint_walker", name: "紫叶薄荷径旅人", desc: "走过紫叶薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.purple_mint_path);
    } },
    { id: "purple_lavender_sill", name: "紫叶薰衣草窗台", desc: "发现紫叶薰衣草", check: function (s) {
      return !!(s.discovered && s.discovered.purple_lavender);
    } },
    { id: "purple_lavender_walker", name: "紫叶薰衣草径旅人", desc: "走过紫叶薰衣草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.purple_lavender_path);
    } },
    { id: "purple_rosemary_sill", name: "紫叶迷迭香窗台", desc: "发现紫叶迷迭香", check: function (s) {
      return !!(s.discovered && s.discovered.purple_rosemary);
    } },
    { id: "purple_rosemary_walker", name: "紫叶迷迭香径旅人", desc: "走过紫叶迷迭香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.purple_rosemary_path);
    } },
    { id: "purple_marjoram_sill", name: "紫叶马郁兰窗台", desc: "发现紫叶马郁兰", check: function (s) {
      return !!(s.discovered && s.discovered.purple_marjoram);
    } },
    { id: "purple_marjoram_walker", name: "紫叶马郁兰径旅人", desc: "走过紫叶马郁兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.purple_marjoram_path);
    } },
    { id: "purple_tarragon_sill", name: "紫叶龙蒿窗台", desc: "发现紫叶龙蒿", check: function (s) {
      return !!(s.discovered && s.discovered.purple_tarragon);
    } },
    { id: "purple_tarragon_walker", name: "紫叶龙蒿径旅人", desc: "走过紫叶龙蒿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.purple_tarragon_path);
    } },
    { id: "purple_chive_sill", name: "紫叶香葱窗台", desc: "发现紫叶香葱", check: function (s) {
      return !!(s.discovered && s.discovered.purple_chive);
    } },
    { id: "purple_chive_walker", name: "紫叶香葱径旅人", desc: "走过紫叶香葱短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.purple_chive_path);
    } },
    { id: "purple_parsley_sill", name: "紫叶欧芹窗台", desc: "发现紫叶欧芹", check: function (s) {
      return !!(s.discovered && s.discovered.purple_parsley);
    } },
    { id: "purple_parsley_walker", name: "紫叶欧芹径旅人", desc: "走过紫叶欧芹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.purple_parsley_path);
    } },
    { id: "purple_cilantro_sill", name: "紫叶香菜窗台", desc: "发现紫叶香菜", check: function (s) {
      return !!(s.discovered && s.discovered.purple_cilantro);
    } },
    { id: "purple_cilantro_walker", name: "紫叶香菜径旅人", desc: "走过紫叶香菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.purple_cilantro_path);
    } },
    { id: "purple_dill_sill", name: "紫叶莳萝窗台", desc: "发现紫叶莳萝", check: function (s) {
      return !!(s.discovered && s.discovered.purple_dill);
    } },
    { id: "purple_dill_walker", name: "紫叶莳萝径旅人", desc: "走过紫叶莳萝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.purple_dill_path);
    } },
    { id: "purple_fennel_sill", name: "紫叶茴香窗台", desc: "发现紫叶茴香", check: function (s) {
      return !!(s.discovered && s.discovered.purple_fennel);
    } },
    { id: "purple_fennel_walker", name: "紫叶茴香径旅人", desc: "走过紫叶茴香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.purple_fennel_path);
    } },
    { id: "purple_lovage_sill", name: "紫叶独活窗台", desc: "发现紫叶独活", check: function (s) {
      return !!(s.discovered && s.discovered.purple_lovage);
    } },
    { id: "purple_lovage_walker", name: "紫叶独活径旅人", desc: "走过紫叶独活短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.purple_lovage_path);
    } },
    { id: "purple_sorrel_sill", name: "紫叶酸模窗台", desc: "发现紫叶酸模", check: function (s) {
      return !!(s.discovered && s.discovered.purple_sorrel);
    } },
    { id: "purple_sorrel_walker", name: "紫叶酸模径旅人", desc: "走过紫叶酸模短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.purple_sorrel_path);
    } },
    { id: "red_thyme_sill", name: "红叶百里香窗台", desc: "发现红叶百里香", check: function (s) {
      return !!(s.discovered && s.discovered.red_thyme);
    } },
    { id: "red_thyme_walker", name: "红叶百里香径旅人", desc: "走过红叶百里香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.red_thyme_path);
    } },
    { id: "red_sage_sill", name: "红叶鼠尾草窗台", desc: "发现红叶鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.red_sage);
    } },
    { id: "red_sage_walker", name: "红叶鼠尾草径旅人", desc: "走过红叶鼠尾草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.red_sage_path);
    } },
    { id: "red_oregano_sill", name: "红叶牛至窗台", desc: "发现红叶牛至", check: function (s) {
      return !!(s.discovered && s.discovered.red_oregano);
    } },
    { id: "red_oregano_walker", name: "红叶牛至径旅人", desc: "走过红叶牛至短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.red_oregano_path);
    } },
    { id: "red_basil_sill", name: "红叶罗勒窗台", desc: "发现红叶罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.red_basil);
    } },
    { id: "red_basil_walker", name: "红叶罗勒径旅人", desc: "走过红叶罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.red_basil_path);
    } },
    { id: "red_mint_sill", name: "红叶薄荷窗台", desc: "发现红叶薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.red_mint);
    } },
    { id: "red_mint_walker", name: "红叶薄荷径旅人", desc: "走过红叶薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.red_mint_path);
    } },
    { id: "red_lavender_sill", name: "红叶薰衣草窗台", desc: "发现红叶薰衣草", check: function (s) {
      return !!(s.discovered && s.discovered.red_lavender);
    } },
    { id: "red_lavender_walker", name: "红叶薰衣草径旅人", desc: "走过红叶薰衣草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.red_lavender_path);
    } },
    { id: "red_rosemary_sill", name: "红叶迷迭香窗台", desc: "发现红叶迷迭香", check: function (s) {
      return !!(s.discovered && s.discovered.red_rosemary);
    } },
    { id: "red_rosemary_walker", name: "红叶迷迭香径旅人", desc: "走过红叶迷迭香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.red_rosemary_path);
    } },
    { id: "red_marjoram_sill", name: "红叶马郁兰窗台", desc: "发现红叶马郁兰", check: function (s) {
      return !!(s.discovered && s.discovered.red_marjoram);
    } },
    { id: "red_marjoram_walker", name: "红叶马郁兰径旅人", desc: "走过红叶马郁兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.red_marjoram_path);
    } },
    { id: "red_tarragon_sill", name: "红叶龙蒿窗台", desc: "发现红叶龙蒿", check: function (s) {
      return !!(s.discovered && s.discovered.red_tarragon);
    } },
    { id: "red_tarragon_walker", name: "红叶龙蒿径旅人", desc: "走过红叶龙蒿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.red_tarragon_path);
    } },
    { id: "red_chive_sill", name: "红叶香葱窗台", desc: "发现红叶香葱", check: function (s) {
      return !!(s.discovered && s.discovered.red_chive);
    } },
    { id: "red_chive_walker", name: "红叶香葱径旅人", desc: "走过红叶香葱短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.red_chive_path);
    } },
    { id: "red_parsley_sill", name: "红叶欧芹窗台", desc: "发现红叶欧芹", check: function (s) {
      return !!(s.discovered && s.discovered.red_parsley);
    } },
    { id: "red_parsley_walker", name: "红叶欧芹径旅人", desc: "走过红叶欧芹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.red_parsley_path);
    } },
    { id: "red_cilantro_sill", name: "红叶香菜窗台", desc: "发现红叶香菜", check: function (s) {
      return !!(s.discovered && s.discovered.red_cilantro);
    } },
    { id: "red_cilantro_walker", name: "红叶香菜径旅人", desc: "走过红叶香菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.red_cilantro_path);
    } },
    { id: "red_dill_sill", name: "红叶莳萝窗台", desc: "发现红叶莳萝", check: function (s) {
      return !!(s.discovered && s.discovered.red_dill);
    } },
    { id: "red_dill_walker", name: "红叶莳萝径旅人", desc: "走过红叶莳萝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.red_dill_path);
    } },
    { id: "red_fennel_sill", name: "红叶茴香窗台", desc: "发现红叶茴香", check: function (s) {
      return !!(s.discovered && s.discovered.red_fennel);
    } },
    { id: "red_fennel_walker", name: "红叶茴香径旅人", desc: "走过红叶茴香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.red_fennel_path);
    } },
    { id: "red_lovage_sill", name: "红叶独活窗台", desc: "发现红叶独活", check: function (s) {
      return !!(s.discovered && s.discovered.red_lovage);
    } },
    { id: "red_lovage_walker", name: "红叶独活径旅人", desc: "走过红叶独活短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.red_lovage_path);
    } },
    { id: "red_sorrel_sill", name: "红叶酸模窗台", desc: "发现红叶酸模", check: function (s) {
      return !!(s.discovered && s.discovered.red_sorrel);
    } },
    { id: "red_sorrel_walker", name: "红叶酸模径旅人", desc: "走过红叶酸模短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.red_sorrel_path);
    } },
    { id: "white_thyme_sill", name: "白花百里香窗台", desc: "发现白花百里香", check: function (s) {
      return !!(s.discovered && s.discovered.white_thyme);
    } },
    { id: "white_thyme_walker", name: "白花百里香径旅人", desc: "走过白花百里香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.white_thyme_path);
    } },
    { id: "white_oregano_sill", name: "白花牛至窗台", desc: "发现白花牛至", check: function (s) {
      return !!(s.discovered && s.discovered.white_oregano);
    } },
    { id: "white_oregano_walker", name: "白花牛至径旅人", desc: "走过白花牛至短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.white_oregano_path);
    } },
    { id: "white_basil_sill", name: "白花罗勒窗台", desc: "发现白花罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.white_basil);
    } },
    { id: "white_basil_walker", name: "白花罗勒径旅人", desc: "走过白花罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.white_basil_path);
    } },
    { id: "white_mint_sill", name: "白花薄荷窗台", desc: "发现白花薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.white_mint);
    } },
    { id: "white_mint_walker", name: "白花薄荷径旅人", desc: "走过白花薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.white_mint_path);
    } },
    { id: "white_lavender_sill", name: "白花薰衣草窗台", desc: "发现白花薰衣草", check: function (s) {
      return !!(s.discovered && s.discovered.white_lavender);
    } },
    { id: "white_lavender_walker", name: "白花薰衣草径旅人", desc: "走过白花薰衣草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.white_lavender_path);
    } },
    { id: "white_rosemary_sill", name: "白花迷迭香窗台", desc: "发现白花迷迭香", check: function (s) {
      return !!(s.discovered && s.discovered.white_rosemary);
    } },
    { id: "white_rosemary_walker", name: "白花迷迭香径旅人", desc: "走过白花迷迭香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.white_rosemary_path);
    } },
    { id: "white_marjoram_sill", name: "白花马郁兰窗台", desc: "发现白花马郁兰", check: function (s) {
      return !!(s.discovered && s.discovered.white_marjoram);
    } },
    { id: "white_marjoram_walker", name: "白花马郁兰径旅人", desc: "走过白花马郁兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.white_marjoram_path);
    } },
    { id: "white_tarragon_sill", name: "白花龙蒿窗台", desc: "发现白花龙蒿", check: function (s) {
      return !!(s.discovered && s.discovered.white_tarragon);
    } },
    { id: "white_tarragon_walker", name: "白花龙蒿径旅人", desc: "走过白花龙蒿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.white_tarragon_path);
    } },
    { id: "white_chive_sill", name: "白花香葱窗台", desc: "发现白花香葱", check: function (s) {
      return !!(s.discovered && s.discovered.white_chive);
    } },
    { id: "white_chive_walker", name: "白花香葱径旅人", desc: "走过白花香葱短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.white_chive_path);
    } },
    { id: "white_parsley_sill", name: "白花欧芹窗台", desc: "发现白花欧芹", check: function (s) {
      return !!(s.discovered && s.discovered.white_parsley);
    } },
    { id: "white_parsley_walker", name: "白花欧芹径旅人", desc: "走过白花欧芹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.white_parsley_path);
    } },
    { id: "white_cilantro_sill", name: "白花香菜窗台", desc: "发现白花香菜", check: function (s) {
      return !!(s.discovered && s.discovered.white_cilantro);
    } },
    { id: "white_cilantro_walker", name: "白花香菜径旅人", desc: "走过白花香菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.white_cilantro_path);
    } },
    { id: "white_dill_sill", name: "白花莳萝窗台", desc: "发现白花莳萝", check: function (s) {
      return !!(s.discovered && s.discovered.white_dill);
    } },
    { id: "white_dill_walker", name: "白花莳萝径旅人", desc: "走过白花莳萝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.white_dill_path);
    } },
    { id: "white_fennel_sill", name: "白花茴香窗台", desc: "发现白花茴香", check: function (s) {
      return !!(s.discovered && s.discovered.white_fennel);
    } },
    { id: "white_fennel_walker", name: "白花茴香径旅人", desc: "走过白花茴香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.white_fennel_path);
    } },
    { id: "white_lovage_sill", name: "白花独活窗台", desc: "发现白花独活", check: function (s) {
      return !!(s.discovered && s.discovered.white_lovage);
    } },
    { id: "white_lovage_walker", name: "白花独活径旅人", desc: "走过白花独活短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.white_lovage_path);
    } },
    { id: "white_sorrel_sill", name: "白花酸模窗台", desc: "发现白花酸模", check: function (s) {
      return !!(s.discovered && s.discovered.white_sorrel);
    } },
    { id: "white_sorrel_walker", name: "白花酸模径旅人", desc: "走过白花酸模短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.white_sorrel_path);
    } },
    { id: "pink_thyme_sill", name: "粉花百里香窗台", desc: "发现粉花百里香", check: function (s) {
      return !!(s.discovered && s.discovered.pink_thyme);
    } },
    { id: "pink_thyme_walker", name: "粉花百里香径旅人", desc: "走过粉花百里香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pink_thyme_path);
    } },
    { id: "pink_sage_sill", name: "粉花鼠尾草窗台", desc: "发现粉花鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.pink_sage);
    } },
    { id: "pink_sage_walker", name: "粉花鼠尾草径旅人", desc: "走过粉花鼠尾草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pink_sage_path);
    } },
    { id: "pink_oregano_sill", name: "粉花牛至窗台", desc: "发现粉花牛至", check: function (s) {
      return !!(s.discovered && s.discovered.pink_oregano);
    } },
    { id: "pink_oregano_walker", name: "粉花牛至径旅人", desc: "走过粉花牛至短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pink_oregano_path);
    } },
    { id: "pink_basil_sill", name: "粉花罗勒窗台", desc: "发现粉花罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.pink_basil);
    } },
    { id: "pink_basil_walker", name: "粉花罗勒径旅人", desc: "走过粉花罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pink_basil_path);
    } },
    { id: "pink_mint_sill", name: "粉花薄荷窗台", desc: "发现粉花薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.pink_mint);
    } },
    { id: "pink_mint_walker", name: "粉花薄荷径旅人", desc: "走过粉花薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pink_mint_path);
    } },
    { id: "pink_lavender_sill", name: "粉花薰衣草窗台", desc: "发现粉花薰衣草", check: function (s) {
      return !!(s.discovered && s.discovered.pink_lavender);
    } },
    { id: "pink_lavender_walker", name: "粉花薰衣草径旅人", desc: "走过粉花薰衣草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pink_lavender_path);
    } },
    { id: "pink_rosemary_sill", name: "粉花迷迭香窗台", desc: "发现粉花迷迭香", check: function (s) {
      return !!(s.discovered && s.discovered.pink_rosemary);
    } },
    { id: "pink_rosemary_walker", name: "粉花迷迭香径旅人", desc: "走过粉花迷迭香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pink_rosemary_path);
    } },
    { id: "pink_marjoram_sill", name: "粉花马郁兰窗台", desc: "发现粉花马郁兰", check: function (s) {
      return !!(s.discovered && s.discovered.pink_marjoram);
    } },
    { id: "pink_marjoram_walker", name: "粉花马郁兰径旅人", desc: "走过粉花马郁兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pink_marjoram_path);
    } },
    { id: "pink_tarragon_sill", name: "粉花龙蒿窗台", desc: "发现粉花龙蒿", check: function (s) {
      return !!(s.discovered && s.discovered.pink_tarragon);
    } },
    { id: "pink_tarragon_walker", name: "粉花龙蒿径旅人", desc: "走过粉花龙蒿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pink_tarragon_path);
    } },
    { id: "pink_chive_sill", name: "粉花香葱窗台", desc: "发现粉花香葱", check: function (s) {
      return !!(s.discovered && s.discovered.pink_chive);
    } },
    { id: "pink_chive_walker", name: "粉花香葱径旅人", desc: "走过粉花香葱短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pink_chive_path);
    } },
    { id: "pink_parsley_sill", name: "粉花欧芹窗台", desc: "发现粉花欧芹", check: function (s) {
      return !!(s.discovered && s.discovered.pink_parsley);
    } },
    { id: "pink_parsley_walker", name: "粉花欧芹径旅人", desc: "走过粉花欧芹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pink_parsley_path);
    } },
    { id: "pink_cilantro_sill", name: "粉花香菜窗台", desc: "发现粉花香菜", check: function (s) {
      return !!(s.discovered && s.discovered.pink_cilantro);
    } },
    { id: "pink_cilantro_walker", name: "粉花香菜径旅人", desc: "走过粉花香菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pink_cilantro_path);
    } },
    { id: "pink_dill_sill", name: "粉花莳萝窗台", desc: "发现粉花莳萝", check: function (s) {
      return !!(s.discovered && s.discovered.pink_dill);
    } },
    { id: "pink_dill_walker", name: "粉花莳萝径旅人", desc: "走过粉花莳萝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pink_dill_path);
    } },
    { id: "pink_fennel_sill", name: "粉花茴香窗台", desc: "发现粉花茴香", check: function (s) {
      return !!(s.discovered && s.discovered.pink_fennel);
    } },
    { id: "pink_fennel_walker", name: "粉花茴香径旅人", desc: "走过粉花茴香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pink_fennel_path);
    } },
    { id: "pink_lovage_sill", name: "粉花独活窗台", desc: "发现粉花独活", check: function (s) {
      return !!(s.discovered && s.discovered.pink_lovage);
    } },
    { id: "pink_lovage_walker", name: "粉花独活径旅人", desc: "走过粉花独活短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pink_lovage_path);
    } },
    { id: "pink_sorrel_sill", name: "粉花酸模窗台", desc: "发现粉花酸模", check: function (s) {
      return !!(s.discovered && s.discovered.pink_sorrel);
    } },
    { id: "pink_sorrel_walker", name: "粉花酸模径旅人", desc: "走过粉花酸模短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pink_sorrel_path);
    } },
    { id: "blue_thyme_sill", name: "蓝花百里香窗台", desc: "发现蓝花百里香", check: function (s) {
      return !!(s.discovered && s.discovered.blue_thyme);
    } },
    { id: "blue_thyme_walker", name: "蓝花百里香径旅人", desc: "走过蓝花百里香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.blue_thyme_path);
    } },
    { id: "blue_sage_sill", name: "蓝花鼠尾草窗台", desc: "发现蓝花鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.blue_sage);
    } },
    { id: "blue_sage_walker", name: "蓝花鼠尾草径旅人", desc: "走过蓝花鼠尾草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.blue_sage_path);
    } },
    { id: "blue_oregano_sill", name: "蓝花牛至窗台", desc: "发现蓝花牛至", check: function (s) {
      return !!(s.discovered && s.discovered.blue_oregano);
    } },
    { id: "blue_oregano_walker", name: "蓝花牛至径旅人", desc: "走过蓝花牛至短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.blue_oregano_path);
    } },
    { id: "blue_basil_sill", name: "蓝花罗勒窗台", desc: "发现蓝花罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.blue_basil);
    } },
    { id: "blue_basil_walker", name: "蓝花罗勒径旅人", desc: "走过蓝花罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.blue_basil_path);
    } },
    { id: "blue_mint_sill", name: "蓝花薄荷窗台", desc: "发现蓝花薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.blue_mint);
    } },
    { id: "blue_mint_walker", name: "蓝花薄荷径旅人", desc: "走过蓝花薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.blue_mint_path);
    } },
    { id: "blue_lavender_sill", name: "蓝花薰衣草窗台", desc: "发现蓝花薰衣草", check: function (s) {
      return !!(s.discovered && s.discovered.blue_lavender);
    } },
    { id: "blue_lavender_walker", name: "蓝花薰衣草径旅人", desc: "走过蓝花薰衣草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.blue_lavender_path);
    } },
    { id: "blue_rosemary_sill", name: "蓝花迷迭香窗台", desc: "发现蓝花迷迭香", check: function (s) {
      return !!(s.discovered && s.discovered.blue_rosemary);
    } },
    { id: "blue_rosemary_walker", name: "蓝花迷迭香径旅人", desc: "走过蓝花迷迭香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.blue_rosemary_path);
    } },
    { id: "blue_marjoram_sill", name: "蓝花马郁兰窗台", desc: "发现蓝花马郁兰", check: function (s) {
      return !!(s.discovered && s.discovered.blue_marjoram);
    } },
    { id: "blue_marjoram_walker", name: "蓝花马郁兰径旅人", desc: "走过蓝花马郁兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.blue_marjoram_path);
    } },
    { id: "blue_tarragon_sill", name: "蓝花龙蒿窗台", desc: "发现蓝花龙蒿", check: function (s) {
      return !!(s.discovered && s.discovered.blue_tarragon);
    } },
    { id: "blue_tarragon_walker", name: "蓝花龙蒿径旅人", desc: "走过蓝花龙蒿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.blue_tarragon_path);
    } },
    { id: "blue_chive_sill", name: "蓝花香葱窗台", desc: "发现蓝花香葱", check: function (s) {
      return !!(s.discovered && s.discovered.blue_chive);
    } },
    { id: "blue_chive_walker", name: "蓝花香葱径旅人", desc: "走过蓝花香葱短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.blue_chive_path);
    } },
    { id: "blue_parsley_sill", name: "蓝花欧芹窗台", desc: "发现蓝花欧芹", check: function (s) {
      return !!(s.discovered && s.discovered.blue_parsley);
    } },
    { id: "blue_parsley_walker", name: "蓝花欧芹径旅人", desc: "走过蓝花欧芹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.blue_parsley_path);
    } },
    { id: "blue_cilantro_sill", name: "蓝花香菜窗台", desc: "发现蓝花香菜", check: function (s) {
      return !!(s.discovered && s.discovered.blue_cilantro);
    } },
    { id: "blue_cilantro_walker", name: "蓝花香菜径旅人", desc: "走过蓝花香菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.blue_cilantro_path);
    } },
    { id: "blue_dill_sill", name: "蓝花莳萝窗台", desc: "发现蓝花莳萝", check: function (s) {
      return !!(s.discovered && s.discovered.blue_dill);
    } },
    { id: "blue_dill_walker", name: "蓝花莳萝径旅人", desc: "走过蓝花莳萝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.blue_dill_path);
    } },
    { id: "blue_fennel_sill", name: "蓝花茴香窗台", desc: "发现蓝花茴香", check: function (s) {
      return !!(s.discovered && s.discovered.blue_fennel);
    } },
    { id: "blue_fennel_walker", name: "蓝花茴香径旅人", desc: "走过蓝花茴香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.blue_fennel_path);
    } },
    { id: "blue_lovage_sill", name: "蓝花独活窗台", desc: "发现蓝花独活", check: function (s) {
      return !!(s.discovered && s.discovered.blue_lovage);
    } },
    { id: "blue_lovage_walker", name: "蓝花独活径旅人", desc: "走过蓝花独活短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.blue_lovage_path);
    } },
    { id: "blue_sorrel_sill", name: "蓝花酸模窗台", desc: "发现蓝花酸模", check: function (s) {
      return !!(s.discovered && s.discovered.blue_sorrel);
    } },
    { id: "blue_sorrel_walker", name: "蓝花酸模径旅人", desc: "走过蓝花酸模短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.blue_sorrel_path);
    } },
    { id: "yellow_thyme_sill", name: "黄花百里香窗台", desc: "发现黄花百里香", check: function (s) {
      return !!(s.discovered && s.discovered.yellow_thyme);
    } },
    { id: "yellow_thyme_walker", name: "黄花百里香径旅人", desc: "走过黄花百里香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yellow_thyme_path);
    } },
    { id: "yellow_sage_sill", name: "黄花鼠尾草窗台", desc: "发现黄花鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.yellow_sage);
    } },
    { id: "yellow_sage_walker", name: "黄花鼠尾草径旅人", desc: "走过黄花鼠尾草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yellow_sage_path);
    } },
    { id: "yellow_oregano_sill", name: "黄花牛至窗台", desc: "发现黄花牛至", check: function (s) {
      return !!(s.discovered && s.discovered.yellow_oregano);
    } },
    { id: "yellow_oregano_walker", name: "黄花牛至径旅人", desc: "走过黄花牛至短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yellow_oregano_path);
    } },
    { id: "yellow_basil_sill", name: "黄花罗勒窗台", desc: "发现黄花罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.yellow_basil);
    } },
    { id: "yellow_basil_walker", name: "黄花罗勒径旅人", desc: "走过黄花罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yellow_basil_path);
    } },
    { id: "yellow_mint_sill", name: "黄花薄荷窗台", desc: "发现黄花薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.yellow_mint);
    } },
    { id: "yellow_mint_walker", name: "黄花薄荷径旅人", desc: "走过黄花薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yellow_mint_path);
    } },
    { id: "yellow_lavender_sill", name: "黄花薰衣草窗台", desc: "发现黄花薰衣草", check: function (s) {
      return !!(s.discovered && s.discovered.yellow_lavender);
    } },
    { id: "yellow_lavender_walker", name: "黄花薰衣草径旅人", desc: "走过黄花薰衣草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yellow_lavender_path);
    } },
    { id: "yellow_rosemary_sill", name: "黄花迷迭香窗台", desc: "发现黄花迷迭香", check: function (s) {
      return !!(s.discovered && s.discovered.yellow_rosemary);
    } },
    { id: "yellow_rosemary_walker", name: "黄花迷迭香径旅人", desc: "走过黄花迷迭香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yellow_rosemary_path);
    } },
    { id: "yellow_marjoram_sill", name: "黄花马郁兰窗台", desc: "发现黄花马郁兰", check: function (s) {
      return !!(s.discovered && s.discovered.yellow_marjoram);
    } },
    { id: "yellow_marjoram_walker", name: "黄花马郁兰径旅人", desc: "走过黄花马郁兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yellow_marjoram_path);
    } },
    { id: "yellow_tarragon_sill", name: "黄花龙蒿窗台", desc: "发现黄花龙蒿", check: function (s) {
      return !!(s.discovered && s.discovered.yellow_tarragon);
    } },
    { id: "yellow_tarragon_walker", name: "黄花龙蒿径旅人", desc: "走过黄花龙蒿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yellow_tarragon_path);
    } },
    { id: "yellow_chive_sill", name: "黄花香葱窗台", desc: "发现黄花香葱", check: function (s) {
      return !!(s.discovered && s.discovered.yellow_chive);
    } },
    { id: "yellow_chive_walker", name: "黄花香葱径旅人", desc: "走过黄花香葱短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yellow_chive_path);
    } },
    { id: "yellow_parsley_sill", name: "黄花欧芹窗台", desc: "发现黄花欧芹", check: function (s) {
      return !!(s.discovered && s.discovered.yellow_parsley);
    } },
    { id: "yellow_parsley_walker", name: "黄花欧芹径旅人", desc: "走过黄花欧芹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yellow_parsley_path);
    } },
    { id: "yellow_cilantro_sill", name: "黄花香菜窗台", desc: "发现黄花香菜", check: function (s) {
      return !!(s.discovered && s.discovered.yellow_cilantro);
    } },
    { id: "yellow_cilantro_walker", name: "黄花香菜径旅人", desc: "走过黄花香菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yellow_cilantro_path);
    } },
    { id: "yellow_dill_sill", name: "黄花莳萝窗台", desc: "发现黄花莳萝", check: function (s) {
      return !!(s.discovered && s.discovered.yellow_dill);
    } },
    { id: "yellow_dill_walker", name: "黄花莳萝径旅人", desc: "走过黄花莳萝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yellow_dill_path);
    } },
    { id: "yellow_fennel_sill", name: "黄花茴香窗台", desc: "发现黄花茴香", check: function (s) {
      return !!(s.discovered && s.discovered.yellow_fennel);
    } },
    { id: "yellow_fennel_walker", name: "黄花茴香径旅人", desc: "走过黄花茴香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yellow_fennel_path);
    } },
    { id: "yellow_lovage_sill", name: "黄花独活窗台", desc: "发现黄花独活", check: function (s) {
      return !!(s.discovered && s.discovered.yellow_lovage);
    } },
    { id: "yellow_lovage_walker", name: "黄花独活径旅人", desc: "走过黄花独活短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yellow_lovage_path);
    } },
    { id: "yellow_sorrel_sill", name: "黄花酸模窗台", desc: "发现黄花酸模", check: function (s) {
      return !!(s.discovered && s.discovered.yellow_sorrel);
    } },
    { id: "yellow_sorrel_walker", name: "黄花酸模径旅人", desc: "走过黄花酸模短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.yellow_sorrel_path);
    } },
    { id: "orange_thyme_sill", name: "橙花百里香窗台", desc: "发现橙花百里香", check: function (s) {
      return !!(s.discovered && s.discovered.orange_thyme);
    } },
    { id: "orange_thyme_walker", name: "橙花百里香径旅人", desc: "走过橙花百里香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.orange_thyme_path);
    } },
    { id: "orange_sage_sill", name: "橙花鼠尾草窗台", desc: "发现橙花鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.orange_sage);
    } },
    { id: "orange_sage_walker", name: "橙花鼠尾草径旅人", desc: "走过橙花鼠尾草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.orange_sage_path);
    } },
    { id: "orange_oregano_sill", name: "橙花牛至窗台", desc: "发现橙花牛至", check: function (s) {
      return !!(s.discovered && s.discovered.orange_oregano);
    } },
    { id: "orange_oregano_walker", name: "橙花牛至径旅人", desc: "走过橙花牛至短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.orange_oregano_path);
    } },
    { id: "orange_basil_sill", name: "橙花罗勒窗台", desc: "发现橙花罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.orange_basil);
    } },
    { id: "orange_basil_walker", name: "橙花罗勒径旅人", desc: "走过橙花罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.orange_basil_path);
    } },
    { id: "orange_mint_sill", name: "橙花薄荷窗台", desc: "发现橙花薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.orange_mint);
    } },
    { id: "orange_mint_walker", name: "橙花薄荷径旅人", desc: "走过橙花薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.orange_mint_path);
    } },
    { id: "orange_lavender_sill", name: "橙花薰衣草窗台", desc: "发现橙花薰衣草", check: function (s) {
      return !!(s.discovered && s.discovered.orange_lavender);
    } },
    { id: "orange_lavender_walker", name: "橙花薰衣草径旅人", desc: "走过橙花薰衣草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.orange_lavender_path);
    } },
    { id: "orange_rosemary_sill", name: "橙花迷迭香窗台", desc: "发现橙花迷迭香", check: function (s) {
      return !!(s.discovered && s.discovered.orange_rosemary);
    } },
    { id: "orange_rosemary_walker", name: "橙花迷迭香径旅人", desc: "走过橙花迷迭香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.orange_rosemary_path);
    } },
    { id: "orange_marjoram_sill", name: "橙花马郁兰窗台", desc: "发现橙花马郁兰", check: function (s) {
      return !!(s.discovered && s.discovered.orange_marjoram);
    } },
    { id: "orange_marjoram_walker", name: "橙花马郁兰径旅人", desc: "走过橙花马郁兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.orange_marjoram_path);
    } },
    { id: "orange_tarragon_sill", name: "橙花龙蒿窗台", desc: "发现橙花龙蒿", check: function (s) {
      return !!(s.discovered && s.discovered.orange_tarragon);
    } },
    { id: "orange_tarragon_walker", name: "橙花龙蒿径旅人", desc: "走过橙花龙蒿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.orange_tarragon_path);
    } },
    { id: "orange_chive_sill", name: "橙花香葱窗台", desc: "发现橙花香葱", check: function (s) {
      return !!(s.discovered && s.discovered.orange_chive);
    } },
    { id: "orange_chive_walker", name: "橙花香葱径旅人", desc: "走过橙花香葱短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.orange_chive_path);
    } },
    { id: "orange_parsley_sill", name: "橙花欧芹窗台", desc: "发现橙花欧芹", check: function (s) {
      return !!(s.discovered && s.discovered.orange_parsley);
    } },
    { id: "orange_parsley_walker", name: "橙花欧芹径旅人", desc: "走过橙花欧芹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.orange_parsley_path);
    } },
    { id: "orange_cilantro_sill", name: "橙花香菜窗台", desc: "发现橙花香菜", check: function (s) {
      return !!(s.discovered && s.discovered.orange_cilantro);
    } },
    { id: "orange_cilantro_walker", name: "橙花香菜径旅人", desc: "走过橙花香菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.orange_cilantro_path);
    } },
    { id: "orange_dill_sill", name: "橙花莳萝窗台", desc: "发现橙花莳萝", check: function (s) {
      return !!(s.discovered && s.discovered.orange_dill);
    } },
    { id: "orange_dill_walker", name: "橙花莳萝径旅人", desc: "走过橙花莳萝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.orange_dill_path);
    } },
    { id: "orange_fennel_sill", name: "橙花茴香窗台", desc: "发现橙花茴香", check: function (s) {
      return !!(s.discovered && s.discovered.orange_fennel);
    } },
    { id: "orange_fennel_walker", name: "橙花茴香径旅人", desc: "走过橙花茴香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.orange_fennel_path);
    } },
    { id: "orange_lovage_sill", name: "橙花独活窗台", desc: "发现橙花独活", check: function (s) {
      return !!(s.discovered && s.discovered.orange_lovage);
    } },
    { id: "orange_lovage_walker", name: "橙花独活径旅人", desc: "走过橙花独活短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.orange_lovage_path);
    } },
    { id: "orange_sorrel_sill", name: "橙花酸模窗台", desc: "发现橙花酸模", check: function (s) {
      return !!(s.discovered && s.discovered.orange_sorrel);
    } },
    { id: "orange_sorrel_walker", name: "橙花酸模径旅人", desc: "走过橙花酸模短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.orange_sorrel_path);
    } },
    { id: "fragrant_thyme_sill", name: "香型百里香窗台", desc: "发现香型百里香", check: function (s) {
      return !!(s.discovered && s.discovered.fragrant_thyme);
    } },
    { id: "fragrant_thyme_walker", name: "香型百里香径旅人", desc: "走过香型百里香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fragrant_thyme_path);
    } },
    { id: "fragrant_sage_sill", name: "香型鼠尾草窗台", desc: "发现香型鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.fragrant_sage);
    } },
    { id: "fragrant_sage_walker", name: "香型鼠尾草径旅人", desc: "走过香型鼠尾草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fragrant_sage_path);
    } },
    { id: "fragrant_oregano_sill", name: "香型牛至窗台", desc: "发现香型牛至", check: function (s) {
      return !!(s.discovered && s.discovered.fragrant_oregano);
    } },
    { id: "fragrant_oregano_walker", name: "香型牛至径旅人", desc: "走过香型牛至短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fragrant_oregano_path);
    } },
    { id: "fragrant_basil_sill", name: "香型罗勒窗台", desc: "发现香型罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.fragrant_basil);
    } },
    { id: "fragrant_basil_walker", name: "香型罗勒径旅人", desc: "走过香型罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fragrant_basil_path);
    } },
    { id: "fragrant_mint_sill", name: "香型薄荷窗台", desc: "发现香型薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.fragrant_mint);
    } },
    { id: "fragrant_mint_walker", name: "香型薄荷径旅人", desc: "走过香型薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fragrant_mint_path);
    } },
    { id: "fragrant_lavender_sill", name: "香型薰衣草窗台", desc: "发现香型薰衣草", check: function (s) {
      return !!(s.discovered && s.discovered.fragrant_lavender);
    } },
    { id: "fragrant_lavender_walker", name: "香型薰衣草径旅人", desc: "走过香型薰衣草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fragrant_lavender_path);
    } },
    { id: "fragrant_rosemary_sill", name: "香型迷迭香窗台", desc: "发现香型迷迭香", check: function (s) {
      return !!(s.discovered && s.discovered.fragrant_rosemary);
    } },
    { id: "fragrant_rosemary_walker", name: "香型迷迭香径旅人", desc: "走过香型迷迭香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fragrant_rosemary_path);
    } },
    { id: "fragrant_marjoram_sill", name: "香型马郁兰窗台", desc: "发现香型马郁兰", check: function (s) {
      return !!(s.discovered && s.discovered.fragrant_marjoram);
    } },
    { id: "fragrant_marjoram_walker", name: "香型马郁兰径旅人", desc: "走过香型马郁兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fragrant_marjoram_path);
    } },
    { id: "fragrant_tarragon_sill", name: "香型龙蒿窗台", desc: "发现香型龙蒿", check: function (s) {
      return !!(s.discovered && s.discovered.fragrant_tarragon);
    } },
    { id: "fragrant_tarragon_walker", name: "香型龙蒿径旅人", desc: "走过香型龙蒿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fragrant_tarragon_path);
    } },
    { id: "fragrant_chive_sill", name: "香型香葱窗台", desc: "发现香型香葱", check: function (s) {
      return !!(s.discovered && s.discovered.fragrant_chive);
    } },
    { id: "fragrant_chive_walker", name: "香型香葱径旅人", desc: "走过香型香葱短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fragrant_chive_path);
    } },
    { id: "fragrant_parsley_sill", name: "香型欧芹窗台", desc: "发现香型欧芹", check: function (s) {
      return !!(s.discovered && s.discovered.fragrant_parsley);
    } },
    { id: "fragrant_parsley_walker", name: "香型欧芹径旅人", desc: "走过香型欧芹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fragrant_parsley_path);
    } },
    { id: "fragrant_cilantro_sill", name: "香型香菜窗台", desc: "发现香型香菜", check: function (s) {
      return !!(s.discovered && s.discovered.fragrant_cilantro);
    } },
    { id: "fragrant_cilantro_walker", name: "香型香菜径旅人", desc: "走过香型香菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fragrant_cilantro_path);
    } },
    { id: "fragrant_dill_sill", name: "香型莳萝窗台", desc: "发现香型莳萝", check: function (s) {
      return !!(s.discovered && s.discovered.fragrant_dill);
    } },
    { id: "fragrant_dill_walker", name: "香型莳萝径旅人", desc: "走过香型莳萝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fragrant_dill_path);
    } },
    { id: "fragrant_fennel_sill", name: "香型茴香窗台", desc: "发现香型茴香", check: function (s) {
      return !!(s.discovered && s.discovered.fragrant_fennel);
    } },
    { id: "fragrant_fennel_walker", name: "香型茴香径旅人", desc: "走过香型茴香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fragrant_fennel_path);
    } },
    { id: "fragrant_lovage_sill", name: "香型独活窗台", desc: "发现香型独活", check: function (s) {
      return !!(s.discovered && s.discovered.fragrant_lovage);
    } },
    { id: "fragrant_lovage_walker", name: "香型独活径旅人", desc: "走过香型独活短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fragrant_lovage_path);
    } },
    { id: "fragrant_sorrel_sill", name: "香型酸模窗台", desc: "发现香型酸模", check: function (s) {
      return !!(s.discovered && s.discovered.fragrant_sorrel);
    } },
    { id: "fragrant_sorrel_walker", name: "香型酸模径旅人", desc: "走过香型酸模短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fragrant_sorrel_path);
    } },
    { id: "edible_thyme_sill", name: "可食百里香窗台", desc: "发现可食百里香", check: function (s) {
      return !!(s.discovered && s.discovered.edible_thyme);
    } },
    { id: "edible_thyme_walker", name: "可食百里香径旅人", desc: "走过可食百里香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.edible_thyme_path);
    } },
    { id: "edible_sage_sill", name: "可食鼠尾草窗台", desc: "发现可食鼠尾草", check: function (s) {
      return !!(s.discovered && s.discovered.edible_sage);
    } },
    { id: "edible_sage_walker", name: "可食鼠尾草径旅人", desc: "走过可食鼠尾草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.edible_sage_path);
    } },
    { id: "edible_oregano_sill", name: "可食牛至窗台", desc: "发现可食牛至", check: function (s) {
      return !!(s.discovered && s.discovered.edible_oregano);
    } },
    { id: "edible_oregano_walker", name: "可食牛至径旅人", desc: "走过可食牛至短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.edible_oregano_path);
    } },
    { id: "edible_basil_sill", name: "可食罗勒窗台", desc: "发现可食罗勒", check: function (s) {
      return !!(s.discovered && s.discovered.edible_basil);
    } },
    { id: "edible_basil_walker", name: "可食罗勒径旅人", desc: "走过可食罗勒短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.edible_basil_path);
    } },
    { id: "edible_mint_sill", name: "可食薄荷窗台", desc: "发现可食薄荷", check: function (s) {
      return !!(s.discovered && s.discovered.edible_mint);
    } },
    { id: "edible_mint_walker", name: "可食薄荷径旅人", desc: "走过可食薄荷短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.edible_mint_path);
    } },
    { id: "edible_lavender_sill", name: "可食薰衣草窗台", desc: "发现可食薰衣草", check: function (s) {
      return !!(s.discovered && s.discovered.edible_lavender);
    } },
    { id: "edible_lavender_walker", name: "可食薰衣草径旅人", desc: "走过可食薰衣草短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.edible_lavender_path);
    } },
    { id: "edible_rosemary_sill", name: "可食迷迭香窗台", desc: "发现可食迷迭香", check: function (s) {
      return !!(s.discovered && s.discovered.edible_rosemary);
    } },
    { id: "edible_rosemary_walker", name: "可食迷迭香径旅人", desc: "走过可食迷迭香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.edible_rosemary_path);
    } },
    { id: "edible_marjoram_sill", name: "可食马郁兰窗台", desc: "发现可食马郁兰", check: function (s) {
      return !!(s.discovered && s.discovered.edible_marjoram);
    } },
    { id: "edible_marjoram_walker", name: "可食马郁兰径旅人", desc: "走过可食马郁兰短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.edible_marjoram_path);
    } },
    { id: "edible_tarragon_sill", name: "可食龙蒿窗台", desc: "发现可食龙蒿", check: function (s) {
      return !!(s.discovered && s.discovered.edible_tarragon);
    } },
    { id: "edible_tarragon_walker", name: "可食龙蒿径旅人", desc: "走过可食龙蒿短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.edible_tarragon_path);
    } },
    { id: "edible_chive_sill", name: "可食香葱窗台", desc: "发现可食香葱", check: function (s) {
      return !!(s.discovered && s.discovered.edible_chive);
    } },
    { id: "edible_chive_walker", name: "可食香葱径旅人", desc: "走过可食香葱短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.edible_chive_path);
    } },
    { id: "edible_parsley_sill", name: "可食欧芹窗台", desc: "发现可食欧芹", check: function (s) {
      return !!(s.discovered && s.discovered.edible_parsley);
    } },
    { id: "edible_parsley_walker", name: "可食欧芹径旅人", desc: "走过可食欧芹短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.edible_parsley_path);
    } },
    { id: "edible_cilantro_sill", name: "可食香菜窗台", desc: "发现可食香菜", check: function (s) {
      return !!(s.discovered && s.discovered.edible_cilantro);
    } },
    { id: "edible_cilantro_walker", name: "可食香菜径旅人", desc: "走过可食香菜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.edible_cilantro_path);
    } },
    { id: "edible_dill_sill", name: "可食莳萝窗台", desc: "发现可食莳萝", check: function (s) {
      return !!(s.discovered && s.discovered.edible_dill);
    } },
    { id: "edible_dill_walker", name: "可食莳萝径旅人", desc: "走过可食莳萝短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.edible_dill_path);
    } },
    { id: "edible_fennel_sill", name: "可食茴香窗台", desc: "发现可食茴香", check: function (s) {
      return !!(s.discovered && s.discovered.edible_fennel);
    } },
    { id: "edible_fennel_walker", name: "可食茴香径旅人", desc: "走过可食茴香短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.edible_fennel_path);
    } },
    { id: "edible_lovage_sill", name: "可食独活窗台", desc: "发现可食独活", check: function (s) {
      return !!(s.discovered && s.discovered.edible_lovage);
    } },
    { id: "edible_lovage_walker", name: "可食独活径旅人", desc: "走过可食独活短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.edible_lovage_path);
    } },
    { id: "edible_sorrel_sill", name: "可食酸模窗台", desc: "发现可食酸模", check: function (s) {
      return !!(s.discovered && s.discovered.edible_sorrel);
    } },
    { id: "edible_sorrel_walker", name: "可食酸模径旅人", desc: "走过可食酸模短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.edible_sorrel_path);
    } },
    { id: "apple_blossom_sill", name: "苹果花窗台", desc: "发现苹果花", check: function (s) {
      return !!(s.discovered && s.discovered.apple_blossom);
    } },
    { id: "apple_blossom_walker", name: "苹果花径旅人", desc: "走过苹果花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.apple_blossom_path);
    } },
    { id: "pear_blossom_sill", name: "梨花窗台", desc: "发现梨花", check: function (s) {
      return !!(s.discovered && s.discovered.pear_blossom);
    } },
    { id: "pear_blossom_walker", name: "梨花径旅人", desc: "走过梨花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pear_blossom_path);
    } },
    { id: "peach_blossom_sill", name: "桃花窗台", desc: "发现桃花", check: function (s) {
      return !!(s.discovered && s.discovered.peach_blossom);
    } },
    { id: "peach_blossom_walker", name: "桃花径旅人", desc: "走过桃花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.peach_blossom_path);
    } },
    { id: "plum_blossom_fresh_sill", name: "鲜梅花窗台", desc: "发现鲜梅花", check: function (s) {
      return !!(s.discovered && s.discovered.plum_blossom_fresh);
    } },
    { id: "plum_blossom_fresh_walker", name: "鲜梅花径旅人", desc: "走过鲜梅花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.plum_blossom_fresh_path);
    } },
    { id: "cherry_blossom_sill", name: "樱花窗台", desc: "发现樱花", check: function (s) {
      return !!(s.discovered && s.discovered.cherry_blossom);
    } },
    { id: "cherry_blossom_walker", name: "樱花径旅人", desc: "走过樱花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cherry_blossom_path);
    } },
    { id: "apricot_blossom_sill", name: "杏花鲜窗台", desc: "发现杏花鲜", check: function (s) {
      return !!(s.discovered && s.discovered.apricot_blossom);
    } },
    { id: "apricot_blossom_walker", name: "杏花鲜径旅人", desc: "走过杏花鲜短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.apricot_blossom_path);
    } },
    { id: "quince_blossom_sill", name: "榅桲花窗台", desc: "发现榅桲花", check: function (s) {
      return !!(s.discovered && s.discovered.quince_blossom);
    } },
    { id: "quince_blossom_walker", name: "榅桲花径旅人", desc: "走过榅桲花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.quince_blossom_path);
    } },
    { id: "medlar_blossom_sill", name: "欧楂花窗台", desc: "发现欧楂花", check: function (s) {
      return !!(s.discovered && s.discovered.medlar_blossom);
    } },
    { id: "medlar_blossom_walker", name: "欧楂花径旅人", desc: "走过欧楂花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.medlar_blossom_path);
    } },
    { id: "mulberry_flower_sill", name: "桑花窗台", desc: "发现桑花", check: function (s) {
      return !!(s.discovered && s.discovered.mulberry_flower);
    } },
    { id: "mulberry_flower_walker", name: "桑花径旅人", desc: "走过桑花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mulberry_flower_path);
    } },
    { id: "fig_leaf_sill", name: "无花果叶窗台", desc: "发现无花果叶", check: function (s) {
      return !!(s.discovered && s.discovered.fig_leaf);
    } },
    { id: "fig_leaf_walker", name: "无花果叶径旅人", desc: "走过无花果叶短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.fig_leaf_path);
    } },
    { id: "pomegranate_flower_sill", name: "石榴花窗台", desc: "发现石榴花", check: function (s) {
      return !!(s.discovered && s.discovered.pomegranate_flower);
    } },
    { id: "pomegranate_flower_walker", name: "石榴花径旅人", desc: "走过石榴花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pomegranate_flower_path);
    } },
    { id: "persimmon_flower_sill", name: "柿花窗台", desc: "发现柿花", check: function (s) {
      return !!(s.discovered && s.discovered.persimmon_flower);
    } },
    { id: "persimmon_flower_walker", name: "柿花径旅人", desc: "走过柿花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.persimmon_flower_path);
    } },
    { id: "walnut_flower_sill", name: "核桃花窗台", desc: "发现核桃花", check: function (s) {
      return !!(s.discovered && s.discovered.walnut_flower);
    } },
    { id: "walnut_flower_walker", name: "核桃花径旅人", desc: "走过核桃花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.walnut_flower_path);
    } },
    { id: "hazel_catkin_sill", name: "榛花序窗台", desc: "发现榛花序", check: function (s) {
      return !!(s.discovered && s.discovered.hazel_catkin);
    } },
    { id: "hazel_catkin_walker", name: "榛花序径旅人", desc: "走过榛花序短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.hazel_catkin_path);
    } },
    { id: "chestnut_catkin_sill", name: "板栗花序窗台", desc: "发现板栗花序", check: function (s) {
      return !!(s.discovered && s.discovered.chestnut_catkin);
    } },
    { id: "chestnut_catkin_walker", name: "板栗花序径旅人", desc: "走过板栗花序短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.chestnut_catkin_path);
    } },
    { id: "almond_fresh_bl_sill", name: "鲜杏花窗台", desc: "发现鲜杏花", check: function (s) {
      return !!(s.discovered && s.discovered.almond_fresh_bl);
    } },
    { id: "almond_fresh_bl_walker", name: "鲜杏花径旅人", desc: "走过鲜杏花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.almond_fresh_bl_path);
    } },
    { id: "pistachio_flower_sill", name: "开心果花窗台", desc: "发现开心果花", check: function (s) {
      return !!(s.discovered && s.discovered.pistachio_flower);
    } },
    { id: "pistachio_flower_walker", name: "开心果花径旅人", desc: "走过开心果花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pistachio_flower_path);
    } },
    { id: "pecan_flower_sill", name: "山核桃花窗台", desc: "发现山核桃花", check: function (s) {
      return !!(s.discovered && s.discovered.pecan_flower);
    } },
    { id: "pecan_flower_walker", name: "山核桃花径旅人", desc: "走过山核桃花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pecan_flower_path);
    } },
    { id: "macadamia_flower_sill", name: "夏威夷果花窗台", desc: "发现夏威夷果花", check: function (s) {
      return !!(s.discovered && s.discovered.macadamia_flower);
    } },
    { id: "macadamia_flower_walker", name: "夏威夷果花径旅人", desc: "走过夏威夷果花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.macadamia_flower_path);
    } },
    { id: "cashew_flower_sill", name: "腰果花窗台", desc: "发现腰果花", check: function (s) {
      return !!(s.discovered && s.discovered.cashew_flower);
    } },
    { id: "cashew_flower_walker", name: "腰果花径旅人", desc: "走过腰果花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cashew_flower_path);
    } },
    { id: "brazil_nut_fl_sill", name: "巴西坚果花窗台", desc: "发现巴西坚果花", check: function (s) {
      return !!(s.discovered && s.discovered.brazil_nut_fl);
    } },
    { id: "brazil_nut_fl_walker", name: "巴西坚果花径旅人", desc: "走过巴西坚果花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.brazil_nut_fl_path);
    } },
    { id: "coconut_inflo_sill", name: "椰子花序窗台", desc: "发现椰子花序", check: function (s) {
      return !!(s.discovered && s.discovered.coconut_inflo);
    } },
    { id: "coconut_inflo_walker", name: "椰子花序径旅人", desc: "走过椰子花序短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.coconut_inflo_path);
    } },
    { id: "date_flower_sill", name: "椰枣花窗台", desc: "发现椰枣花", check: function (s) {
      return !!(s.discovered && s.discovered.date_flower);
    } },
    { id: "date_flower_walker", name: "椰枣花径旅人", desc: "走过椰枣花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.date_flower_path);
    } },
    { id: "olive_flower_sill", name: "橄榄花窗台", desc: "发现橄榄花", check: function (s) {
      return !!(s.discovered && s.discovered.olive_flower);
    } },
    { id: "olive_flower_walker", name: "橄榄花径旅人", desc: "走过橄榄花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.olive_flower_path);
    } },
    { id: "avocado_flower_sill", name: "牛油果花窗台", desc: "发现牛油果花", check: function (s) {
      return !!(s.discovered && s.discovered.avocado_flower);
    } },
    { id: "avocado_flower_walker", name: "牛油果花径旅人", desc: "走过牛油果花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.avocado_flower_path);
    } },
    { id: "mango_flower_sill", name: "芒果花窗台", desc: "发现芒果花", check: function (s) {
      return !!(s.discovered && s.discovered.mango_flower);
    } },
    { id: "mango_flower_walker", name: "芒果花径旅人", desc: "走过芒果花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mango_flower_path);
    } },
    { id: "lychee_flower_sill", name: "荔枝花窗台", desc: "发现荔枝花", check: function (s) {
      return !!(s.discovered && s.discovered.lychee_flower);
    } },
    { id: "lychee_flower_walker", name: "荔枝花径旅人", desc: "走过荔枝花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.lychee_flower_path);
    } },
    { id: "longan_flower_sill", name: "龙眼花窗台", desc: "发现龙眼花", check: function (s) {
      return !!(s.discovered && s.discovered.longan_flower);
    } },
    { id: "longan_flower_walker", name: "龙眼花径旅人", desc: "走过龙眼花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.longan_flower_path);
    } },
    { id: "rambutan_flower_sill", name: "红毛丹花窗台", desc: "发现红毛丹花", check: function (s) {
      return !!(s.discovered && s.discovered.rambutan_flower);
    } },
    { id: "rambutan_flower_walker", name: "红毛丹花径旅人", desc: "走过红毛丹花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.rambutan_flower_path);
    } },
    { id: "mangosteen_flower_sill", name: "山竹花窗台", desc: "发现山竹花", check: function (s) {
      return !!(s.discovered && s.discovered.mangosteen_flower);
    } },
    { id: "mangosteen_flower_walker", name: "山竹花径旅人", desc: "走过山竹花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.mangosteen_flower_path);
    } },
    { id: "guava_flower_sill", name: "番石榴花窗台", desc: "发现番石榴花", check: function (s) {
      return !!(s.discovered && s.discovered.guava_flower);
    } },
    { id: "guava_flower_walker", name: "番石榴花径旅人", desc: "走过番石榴花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.guava_flower_path);
    } },
    { id: "papaya_flower_sill", name: "木瓜花窗台", desc: "发现木瓜花", check: function (s) {
      return !!(s.discovered && s.discovered.papaya_flower);
    } },
    { id: "papaya_flower_walker", name: "木瓜花径旅人", desc: "走过木瓜花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.papaya_flower_path);
    } },
    { id: "pineapple_flower_sill", name: "菠萝花窗台", desc: "发现菠萝花", check: function (s) {
      return !!(s.discovered && s.discovered.pineapple_flower);
    } },
    { id: "pineapple_flower_walker", name: "菠萝花径旅人", desc: "走过菠萝花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.pineapple_flower_path);
    } },
    { id: "banana_flower_sill", name: "香蕉花窗台", desc: "发现香蕉花", check: function (s) {
      return !!(s.discovered && s.discovered.banana_flower);
    } },
    { id: "banana_flower_walker", name: "香蕉花径旅人", desc: "走过香蕉花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.banana_flower_path);
    } },
    { id: "plantain_flower_sill", name: "大蕉花窗台", desc: "发现大蕉花", check: function (s) {
      return !!(s.discovered && s.discovered.plantain_flower);
    } },
    { id: "plantain_flower_walker", name: "大蕉花径旅人", desc: "走过大蕉花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.plantain_flower_path);
    } },
    { id: "breadfruit_fl_sill", name: "面包果花窗台", desc: "发现面包果花", check: function (s) {
      return !!(s.discovered && s.discovered.breadfruit_fl);
    } },
    { id: "breadfruit_fl_walker", name: "面包果花径旅人", desc: "走过面包果花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.breadfruit_fl_path);
    } },
    { id: "jackfruit_fl_sill", name: "波罗蜜花窗台", desc: "发现波罗蜜花", check: function (s) {
      return !!(s.discovered && s.discovered.jackfruit_fl);
    } },
    { id: "jackfruit_fl_walker", name: "波罗蜜花径旅人", desc: "走过波罗蜜花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.jackfruit_fl_path);
    } },
    { id: "durian_fresh_fl_sill", name: "鲜榴莲花窗台", desc: "发现鲜榴莲花", check: function (s) {
      return !!(s.discovered && s.discovered.durian_fresh_fl);
    } },
    { id: "durian_fresh_fl_walker", name: "鲜榴莲花径旅人", desc: "走过鲜榴莲花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.durian_fresh_fl_path);
    } },
    { id: "soursop_fl_sill", name: "刺番荔枝花窗台", desc: "发现刺番荔枝花", check: function (s) {
      return !!(s.discovered && s.discovered.soursop_fl);
    } },
    { id: "soursop_fl_walker", name: "刺番荔枝花径旅人", desc: "走过刺番荔枝花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.soursop_fl_path);
    } },
    { id: "cherimoya_fl_sill", name: "毛番荔枝花窗台", desc: "发现毛番荔枝花", check: function (s) {
      return !!(s.discovered && s.discovered.cherimoya_fl);
    } },
    { id: "cherimoya_fl_walker", name: "毛番荔枝花径旅人", desc: "走过毛番荔枝花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.cherimoya_fl_path);
    } },
    { id: "custard_apple_fl_sill", name: "番荔枝花窗台", desc: "发现番荔枝花", check: function (s) {
      return !!(s.discovered && s.discovered.custard_apple_fl);
    } },
    { id: "custard_apple_fl_walker", name: "番荔枝花径旅人", desc: "走过番荔枝花短径", check: function (s) {
      return !!(s._themesTouched && s._themesTouched.custard_apple_fl_path);
    } },
    { id: "path_catalog", name: "十路图鉴", desc: "切换过 10 种小路主题", check: function (s) { return Object.keys(s._themesTouched || {}).length >= 10; } },
    { id: "path_ninety", name: "九十路图鉴", desc: "切换过 90 种小路主题", check: function (s) { return Object.keys(s._themesTouched || {}).length >= 90; } },
    { id: "flavor_pin", name: "调味架钉子", desc: "钉过 1 次风味", check: function (s) { return (s.stats && s.stats.flavorPins || 0) >= 1; } },
    { id: "path_hundred", name: "百路图鉴", desc: "切换过 100 种小路主题", check: function (s) { return Object.keys(s._themesTouched || {}).length >= 100; } },
    { id: "path_eighty", name: "八十路图鉴", desc: "切换过 80 种小路主题", check: function (s) { return Object.keys(s._themesTouched || {}).length >= 80; } },
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
    if (season === "spring" && (flavorDef.id === "jasmine" || flavorDef.id === "lavender_bud" || flavorDef.id === "lilac" || flavorDef.id === "chamomile" || flavorDef.id === "honeysuckle" || flavorDef.id === "bergamot" || flavorDef.id === "violet" || flavorDef.id === "calendula" || flavorDef.id === "rose_petal" || flavorDef.id === "elderflower" || flavorDef.id === "loquat" || flavorDef.id === "vanilla" || flavorDef.id === "saffron" || flavorDef.id === "hyssop" || baseDef.id === "floral_tea")) {
      score += 0.5;
      notes.push("春日花香");
    }
    if (season === "summer" && (flavorDef.id === "mint" || flavorDef.id === "rosemary" || flavorDef.id === "bluebell" || flavorDef.id === "matcha" || flavorDef.id === "perilla" || flavorDef.id === "thyme" || flavorDef.id === "dill" || flavorDef.id === "basil" || flavorDef.id === "lemongrass" || flavorDef.id === "coriander" || flavorDef.id === "lemon_balm" || flavorDef.id === "marjoram" || flavorDef.id === "hibiscus" || flavorDef.id === "elderflower" || flavorDef.id === "sea_lavender" || flavorDef.id === "mulberry" || flavorDef.id === "strawberry" || flavorDef.id === "blueberry" || flavorDef.id === "pomegranate" || flavorDef.id === "yangmei" || flavorDef.id === "litchi" || flavorDef.id === "olive" || flavorDef.id === "mango" || flavorDef.id === "pineapple" || flavorDef.id === "coconut" || flavorDef.id === "starfruit" || flavorDef.id === "passion_fruit" || flavorDef.id === "kiwi" || flavorDef.id === "dragonfruit" || flavorDef.id === "guava" || flavorDef.id === "cherry" || flavorDef.id === "apricot" || flavorDef.id === "grapefruit" || flavorDef.id === "tangerine" || flavorDef.id === "wax_apple" || flavorDef.id === "sugarcane" || flavorDef.id === "lemon" || flavorDef.id === "lime" || flavorDef.id === "cranberry" || flavorDef.id === "elderberry" || flavorDef.id === "honeydew" || flavorDef.id === "watermelon" || flavorDef.id === "cantaloupe" || flavorDef.id === "papaya" || flavorDef.id === "rambutan" || flavorDef.id === "jackfruit" || flavorDef.id === "oregano" || flavorDef.id === "chive" || flavorDef.id === "parsley" || flavorDef.id === "avocado" || flavorDef.id === "chervil" || flavorDef.id === "sorrel" || flavorDef.id === "verbena" || flavorDef.id === "savory" || flavorDef.id === "celery_seed" || flavorDef.id === "galangal" || flavorDef.id === "kaffir_lime" || flavorDef.id === "pandan" || flavorDef.id === "juniper" || flavorDef.id === "sumac" || flavorDef.id === "nigella" || flavorDef.id === "mustard_seed" || flavorDef.id === "wasabi" || flavorDef.id === "dandelion" || flavorDef.id === "nettle" || flavorDef.id === "borage" || flavorDef.id === "hops" || flavorDef.id === "heather" || flavorDef.id === "arnica" || flavorDef.id === "echinacea" || flavorDef.id === "feverfew" || flavorDef.id === "lemon_verbena" || flavorDef.id === "mullein" || flavorDef.id === "plantain_leaf" || flavorDef.id === "bee_balm" || flavorDef.id === "marshmallow" || flavorDef.id === "goldenrod" || flavorDef.id === "red_clover" || flavorDef.id === "white_clover" || flavorDef.id === "catnip" || flavorDef.id === "tansy" || flavorDef.id === "agrimony" || flavorDef.id === "rue" || flavorDef.id === "costmary" || flavorDef.id === "elecampane" || flavorDef.id === "meadow_clary" || flavorDef.id === "soapwort" || flavorDef.id === "milfoil" || flavorDef.id === "lady_mantle" || flavorDef.id === "speedwell" || flavorDef.id === "stitchwort" || flavorDef.id === "campion" || flavorDef.id === "silverweed" || flavorDef.id === "loosestrife" || flavorDef.id === "willowherb" || flavorDef.id === "bedstraw" || flavorDef.id === "cleavers" || flavorDef.id === "bugle" || flavorDef.id === "primrose" || flavorDef.id === "cowslip" || flavorDef.id === "oxeye" || flavorDef.id === "knapweed" || flavorDef.id === "scabious" || flavorDef.id === "nettle_seed" || flavorDef.id === "rowan" || flavorDef.id === "crabapple" || flavorDef.id === "serviceberry" || flavorDef.id === "elderflower_fresh" || flavorDef.id === "meadowsweet_fresh" || flavorDef.id === "wood_sorrel" || flavorDef.id === "wild_garlic" || flavorDef.id === "ramsons" || flavorDef.id === "jack_by_hedge" || flavorDef.id === "hedge_mustard" || flavorDef.id === "watercress" || flavorDef.id === "brooklime" || flavorDef.id === "cloudberry" || flavorDef.id === "lingonberry" || flavorDef.id === "bilberry" || flavorDef.id === "gooseberry" || flavorDef.id === "currant_red" || flavorDef.id === "currant_black" || flavorDef.id === "whitecurrant" || flavorDef.id === "sea_buckthorn" || flavorDef.id === "damson" || flavorDef.id === "greengage" || flavorDef.id === "mirabelle" || flavorDef.id === "saskatoon" || flavorDef.id === "chokeberry" || flavorDef.id === "yarrow_white" || flavorDef.id === "achillea_pink" || flavorDef.id === "cornflower" || flavorDef.id === "poppy_seed" || flavorDef.id === "flax_flower" || flavorDef.id === "chia_seed" || flavorDef.id === "sunflower_seed" || flavorDef.id === "fennel_pollen" || flavorDef.id === "fennel_frond" || flavorDef.id === "dill_pollen" || flavorDef.id === "celery_leaf" || flavorDef.id === "rooibos" || flavorDef.id === "honeybush" || flavorDef.id === "yerba_mate" || flavorDef.id === "guayusa" || flavorDef.id === "gardenia" || flavorDef.id === "magnolia" || flavorDef.id === "frangipani" || flavorDef.id === "plumeria" || flavorDef.id === "stephanotis" || flavorDef.id === "garden_phlox" || flavorDef.id === "osmanthus_fresh" || flavorDef.id === "galangal_fresh" || flavorDef.id === "ginger_flower" || flavorDef.id === "turmeric_fresh" || flavorDef.id === "cubeb" || flavorDef.id === "makrut_leaf" || flavorDef.id === "curry_leaf" || flavorDef.id === "holy_basil" || flavorDef.id === "thai_basil" || flavorDef.id === "lemon_basil" || flavorDef.id === "rambutan_fresh" || flavorDef.id === "lychee_fresh" || flavorDef.id === "mangosteen" || flavorDef.id === "durian_flower" || flavorDef.id === "tamarind" || flavorDef.id === "calamansi" || flavorDef.id === "fig_fresh" || flavorDef.id === "pomegranate_seed" || flavorDef.id === "cactus_pear" || flavorDef.id === "prickly_pear" || flavorDef.id === "sapodilla" || flavorDef.id === "soursop" || flavorDef.id === "cherimoya" || flavorDef.id === "feijoa" || flavorDef.id === "loquat_fresh" || flavorDef.id === "jujube_fresh" || flavorDef.id === "mulberry_white" || flavorDef.id === "mulberry_black" || flavorDef.id === "elderberry_fresh" || flavorDef.id === "bergamot_fresh" || flavorDef.id === "sudachi" || flavorDef.id === "kabosu" || flavorDef.id === "amanatsu" || flavorDef.id === "shiso_green" || flavorDef.id === "shiso_red" || flavorDef.id === "mitsuba" || flavorDef.id === "myoga" || flavorDef.id === "wasabi_leaf" || flavorDef.id === "sansho" || flavorDef.id === "kinome" || flavorDef.id === "gentian" || flavorDef.id === "arnica_montana" || flavorDef.id === "alpine_strawberry" || flavorDef.id === "bilberry_leaf" || flavorDef.id === "spruce_tip" || flavorDef.id === "olive_leaf" || flavorDef.id === "caper" || flavorDef.id === "zaatar" || flavorDef.id === "sumac_berry" || flavorDef.id === "orange_blossom" || flavorDef.id === "lavender_honey" || flavorDef.id === "thyme_honey" || flavorDef.id === "acacia_honey" || flavorDef.id === "manuka" || flavorDef.id === "bee_pollen" || flavorDef.id === "comb_honey" || flavorDef.id === "linden_honey" || flavorDef.id === "heather_honey_wild" || flavorDef.id === "wildflower_honey" || flavorDef.id === "clover_honey" || flavorDef.id === "eucalyptus_honey" || flavorDef.id === "mesquite" || flavorDef.id === "lucuma" || flavorDef.id === "camu_camu" || flavorDef.id === "acai" || flavorDef.id === "maqui" || flavorDef.id === "goji_fresh" || flavorDef.id === "amla" || flavorDef.id === "baobab" || flavorDef.id === "morinda" || flavorDef.id === "noni" || flavorDef.id === "cupuacu" || flavorDef.id === "matcha_ceremonial" || flavorDef.id === "sencha" || flavorDef.id === "gyokuro" || flavorDef.id === "bancha" || flavorDef.id === "kukicha" || flavorDef.id === "mugicha" || flavorDef.id === "barley_grass" || flavorDef.id === "wheatgrass" || flavorDef.id === "spirulina" || flavorDef.id === "chlorella" || flavorDef.id === "kelp" || flavorDef.id === "nori" || flavorDef.id === "hibiscus_fresh" || flavorDef.id === "chrysanthemum_fresh" || flavorDef.id === "peony" || flavorDef.id === "lotus_leaf_fresh" || flavorDef.id === "osmanthus_sugar" || flavorDef.id === "orchid_petal" || flavorDef.id === "bamboo_leaf_fresh" || flavorDef.id === "bamboo_shoot_fresh" || flavorDef.id === "safflower" || flavorDef.id === "calendula_fresh" || flavorDef.id === "pot_marigold" || flavorDef.id === "coreopsis" || flavorDef.id === "cosmos" || flavorDef.id === "zinnia" || flavorDef.id === "dahlia" || flavorDef.id === "gladiolus" || flavorDef.id === "iris" || flavorDef.id === "tulip" || flavorDef.id === "ranunculus" || flavorDef.id === "sweet_pea" || flavorDef.id === "nasturtium" || flavorDef.id === "morning_glory" || flavorDef.id === "clematis" || flavorDef.id === "wisteria_fresh" || flavorDef.id === "jasmine_sambac" || flavorDef.id === "gardenia_tea" || flavorDef.id === "boysenberry" || flavorDef.id === "loganberry" || flavorDef.id === "tayberry" || flavorDef.id === "marionberry" || flavorDef.id === "wineberry" || flavorDef.id === "salmonberry" || flavorDef.id === "thimbleberry" || flavorDef.id === "cloudberry_leaf" || flavorDef.id === "lovage_fresh" || flavorDef.id === "sweet_cicely" || flavorDef.id === "ramsons_flower" || flavorDef.id === "sea_kale" || flavorDef.id === "scurvygrass" || flavorDef.id === "marsh_samphire" || flavorDef.id === "agave_nectar" || flavorDef.id === "prickly_pear_pad" || flavorDef.id === "jojoba" || flavorDef.id === "mesquite_pod" || flavorDef.id === "creosote" || flavorDef.id === "desert_sage" || flavorDef.id === "yucca_flower" || flavorDef.id === "yerba_santa" || flavorDef.id === "cedron" || flavorDef.id === "muña" || flavorDef.id === "coca_leaf_tea" || flavorDef.id === "guarana" || flavorDef.id === "stevia_leaf" || flavorDef.id === "rooibos_green" || flavorDef.id === "honeybush_fresh" || flavorDef.id === "buchu" || flavorDef.id === "baobab_leaf" || flavorDef.id === "marula" || flavorDef.id === "kinkeliba" || flavorDef.id === "hibiscus_sab" || flavorDef.id === "pandan_fresh" || flavorDef.id === "lemongrass_fresh" || flavorDef.id === "galangal_leaf" || flavorDef.id === "torch_ginger" || flavorDef.id === "butterfly_pea" || flavorDef.id === "chrysanthemum_ind" || flavorDef.id === "tamarind_leaf" || flavorDef.id === "coconut_flower" || flavorDef.id === "bergamot_leaf" || flavorDef.id === "neroli" || flavorDef.id === "petitgrain" || flavorDef.id === "immortelle" || flavorDef.id === "helichrysum" || flavorDef.id === "cistus" || flavorDef.id === "spruce_beer" || flavorDef.id === "fireweed" || flavorDef.id === "fireweed_honey" || flavorDef.id === "crowberry" || flavorDef.id === "bearberry" || flavorDef.id === "labrador_violet" || flavorDef.id === "matcha_salt" || flavorDef.id === "sansho_leaf" || flavorDef.id === "shiso_flower" || flavorDef.id === "sakura_leaf" || flavorDef.id === "lavender_sugar" || flavorDef.id === "rose_water" || flavorDef.id === "orange_flower_water" || flavorDef.id === "almond_blossom" || flavorDef.id === "chestnut_flower" || flavorDef.id === "maesil" || flavorDef.id === "persimmon_leaf" || flavorDef.id === "pine_flower" || flavorDef.id === "tulsi" || flavorDef.id === "neem_flower" || flavorDef.id === "curry_blossom" || flavorDef.id === "ajwain_leaf" || flavorDef.id === "fenugreek_leaf" || flavorDef.id === "moringa" || flavorDef.id === "gotu_kola" || flavorDef.id === "brahmi" || flavorDef.id === "hibiscus_rosa" || flavorDef.id === "allspice_berry" || flavorDef.id === "annatto" || flavorDef.id === "epazote" || flavorDef.id === "papalo" || flavorDef.id === "hoja_santa" || flavorDef.id === "mexican_oregano" || flavorDef.id === "chile_flower" || flavorDef.id === "noni_leaf" || flavorDef.id === "ti_leaf" || flavorDef.id === "frangipani_tea" || flavorDef.id === "soursop_leaf" || flavorDef.id === "guava_leaf" || flavorDef.id === "passion_leaf" || flavorDef.id === "vanilla_orchid" || flavorDef.id === "longjing" || flavorDef.id === "biluochun" || flavorDef.id === "puer_raw" || flavorDef.id === "white_peony_tea" || flavorDef.id === "valerian_flower" || flavorDef.id === "hops_flower" || flavorDef.id === "meadowsweet_flower" || flavorDef.id === "yarrow_flower" || flavorDef.id === "nettle_seed_tea" || flavorDef.id === "silver_birch" || flavorDef.id === "copper_beech" || flavorDef.id === "hornbeam" || flavorDef.id === "field_maple" || flavorDef.id === "wild_service" || flavorDef.id === "guelder_rose" || flavorDef.id === "wayfaring" || flavorDef.id === "dogwood" || flavorDef.id === "spindle" || flavorDef.id === "buckthorn" || flavorDef.id === "privet" || flavorDef.id === "boxwood" || flavorDef.id === "bluebell_fresh" || flavorDef.id === "primula_veris" || flavorDef.id === "oxlip" || flavorDef.id === "cowslip_fresh" || flavorDef.id === "wood_anemone" || flavorDef.id === "wood_sorrel_pink" || flavorDef.id === "greater_stitchwort" || flavorDef.id === "red_campion" || flavorDef.id === "white_campion" || flavorDef.id === "ragged_robin" || flavorDef.id === "cuckooflower" || flavorDef.id === "lady_smock" || flavorDef.id === "garlic_mustard_fl" || flavorDef.id === "hedge_garlic_seed" || flavorDef.id === "jack_hedge_leaf" || flavorDef.id === "wild_mustard" || flavorDef.id === "meadow_buttercup" || flavorDef.id === "creeping_buttercup" || flavorDef.id === "lesser_celandine" || flavorDef.id === "marsh_marigold" || flavorDef.id === "globe_flower" || flavorDef.id === "columbine" || flavorDef.id === "monkshood" || flavorDef.id === "larkspur" || flavorDef.id === "delphinium" || flavorDef.id === "pasque_flower" || flavorDef.id === "anemone_coronaria" || flavorDef.id === "hepatic" || flavorDef.id === "clematis_vitalba" || flavorDef.id === "speedwell_germander" || flavorDef.id === "germander" || flavorDef.id === "betony_fresh" || flavorDef.id === "selfheal_fresh" || flavorDef.id === "woundwort" || flavorDef.id === "hedge_woundwort" || flavorDef.id === "marsh_woundwort" || flavorDef.id === "motherwort_fresh" || flavorDef.id === "scutellaria" || flavorDef.id === "bugle_fresh" || flavorDef.id === "alehoof" || flavorDef.id === "clary_sage" || flavorDef.id === "pineapple_sage" || flavorDef.id === "fruit_sage" || flavorDef.id === "white_sage" || flavorDef.id === "russian_sage" || flavorDef.id === "meadow_clary_fresh" || flavorDef.id === "wood_sage" || flavorDef.id === "jerusalem_sage" || flavorDef.id === "catmint" || flavorDef.id === "catnip_fresh" || flavorDef.id === "hyssop_fresh" || flavorDef.id === "anise_hyssop" || flavorDef.id === "korean_mint" || flavorDef.id === "agastache" || flavorDef.id === "lavender_spike" || flavorDef.id === "lavender_sto" || flavorDef.id === "thyme_lemon" || flavorDef.id === "thyme_orange" || flavorDef.id === "thyme_caraway" || flavorDef.id === "thyme_woolly" || flavorDef.id === "creeping_thyme" || flavorDef.id === "oregano_greek" || flavorDef.id === "oregano_italian" || flavorDef.id === "marjoram_sweet" || flavorDef.id === "savory_summer" || flavorDef.id === "basil_genovese" || flavorDef.id === "basil_cinnamon" || flavorDef.id === "basil_purple" || flavorDef.id === "basil_lettuce" || flavorDef.id === "mint_peppermint" || flavorDef.id === "mint_spearmint" || flavorDef.id === "mint_chocolate" || flavorDef.id === "mint_apple" || flavorDef.id === "mint_ginger" || flavorDef.id === "mint_orange" || flavorDef.id === "mint_lavender" || flavorDef.id === "mint_bergamot" || flavorDef.id === "mint_corsican" || flavorDef.id === "mint_water" || flavorDef.id === "melissa_fresh" || flavorDef.id === "lemon_balm_var" || flavorDef.id === "bee_balm_pink" || flavorDef.id === "bee_balm_purple" || flavorDef.id === "oregano_hop" || flavorDef.id === "dittany" || flavorDef.id === "dictamnus" || flavorDef.id === "burning_bush" || flavorDef.id === "chamomile_roman" || flavorDef.id === "chamomile_german" || flavorDef.id === "feverfew_fresh" || flavorDef.id === "tansy_fresh" || flavorDef.id === "yarrow_pink" || flavorDef.id === "yarrow_gold" || flavorDef.id === "arnica_fresh" || flavorDef.id === "calendula_offic" || flavorDef.id === "pot_marigold_dbl" || flavorDef.id === "tagetes" || flavorDef.id === "marigold_french" || flavorDef.id === "signet_marigold" || flavorDef.id === "costmary_fresh" || flavorDef.id === "elecampane_fresh" || flavorDef.id === "inula" || flavorDef.id === "eupatorium" || flavorDef.id === "echinacea_purp" || flavorDef.id === "echinacea_ang" || flavorDef.id === "echinacea_pall" || flavorDef.id === "rudbeckia" || flavorDef.id === "black_eyed_susan" || flavorDef.id === "coneflower_yellow" || flavorDef.id === "helenium" || flavorDef.id === "helenium_autumn" || flavorDef.id === "coreopsis_lance" || flavorDef.id === "coreopsis_tick" || flavorDef.id === "gaillardia" || flavorDef.id === "gaillardia_fan" || flavorDef.id === "ratibida" || flavorDef.id === "silphium" || flavorDef.id === "cup_plant" || flavorDef.id === "compass_plant" || flavorDef.id === "aster_novae" || flavorDef.id === "aster_novi" || flavorDef.id === "michaelmas" || flavorDef.id === "goldenrod_fresh" || flavorDef.id === "solidago" || flavorDef.id === "boltonia" || flavorDef.id === "erigeron" || flavorDef.id === "fleabane" || flavorDef.id === "daisy_oxeye" || flavorDef.id === "daisy_english" || flavorDef.id === "daisy_shasta" || flavorDef.id === "chrysanthemum_ind_fresh" || flavorDef.id === "chrysanthemum_mor" || flavorDef.id === "chrysanthemum_yej" || flavorDef.id === "tanacetum" || flavorDef.id === "pyrethrum" || flavorDef.id === "sunflower_dwarf" || flavorDef.id === "sunflower_multi" || flavorDef.id === "sunflower_red" || flavorDef.id === "sunchoke_flower" || flavorDef.id === "dahlia_cactus" || flavorDef.id === "dahlia_pompom" || flavorDef.id === "zinnia_dwarf" || flavorDef.id === "zinnia_cactus" || flavorDef.id === "cosmos_sulph" || flavorDef.id === "cosmos_choco" || flavorDef.id === "tithonia" || flavorDef.id === "mexican_sunflower" || flavorDef.id === "heliopsis" || flavorDef.id === "inula_helenium" || flavorDef.id === "verbena_bon" || flavorDef.id === "verbena_rig" || flavorDef.id === "lantana" || flavorDef.id === "lantana_white" || flavorDef.id === "phlox_pan" || flavorDef.id === "phlox_sub" || flavorDef.id === "phlox_drum" || flavorDef.id === "dianthus_chin" || flavorDef.id === "dianthus_barb" || flavorDef.id === "sweet_william" || flavorDef.id === "carnation" || flavorDef.id === "pinks" || flavorDef.id === "gypsophila" || flavorDef.id === "baby_breath" || flavorDef.id === "saponaria" || flavorDef.id === "soapwort_fresh" || flavorDef.id === "campanula" || flavorDef.id === "campanula_med" || flavorDef.id === "lobelia" || flavorDef.id === "lobelia_card" || flavorDef.id === "penstemon" || flavorDef.id === "penstemon_fox" || flavorDef.id === "digitalis" || flavorDef.id === "digitalis_lutea" || flavorDef.id === "snapdragon" || flavorDef.id === "snapdragon_dwarf" || flavorDef.id === "antirrhinum" || flavorDef.id === "linaria" || flavorDef.id === "toadflax" || flavorDef.id === "verbascum_chaix" || flavorDef.id === "mullein_white" || flavorDef.id === "mimulus" || flavorDef.id === "monkeyflower" || flavorDef.id === "collinsia" || flavorDef.id === "castilleja" || flavorDef.id === "paintbrush" || flavorDef.id === "orthocarpus" || flavorDef.id === "pedicularis" || flavorDef.id === "lousewort" || flavorDef.id === "euphrasia" || flavorDef.id === "eyebright" || flavorDef.id === "rhinanthus" || flavorDef.id === "yellow_rattle" || flavorDef.id === "melampyrum" || flavorDef.id === "cow_wheat" || flavorDef.id === "bartisia" || flavorDef.id === "cattleya" || flavorDef.id === "dendrobium" || flavorDef.id === "phalaenopsis" || flavorDef.id === "oncidium" || flavorDef.id === "vanda" || flavorDef.id === "paphiopedilum" || flavorDef.id === "miltonia" || flavorDef.id === "odontoglossum" || flavorDef.id === "brassia" || flavorDef.id === "epidendrum" || flavorDef.id === "ludisia" || flavorDef.id === "anoectochilus" || flavorDef.id === "gastrodia" || flavorDef.id === "bletilla" || flavorDef.id === "calanthe" || flavorDef.id === "boston_fern" || flavorDef.id === "bird_nest_fern" || flavorDef.id === "staghorn" || flavorDef.id === "holly_fern" || flavorDef.id === "autumn_fern" || flavorDef.id === "ostrich_fern" || flavorDef.id === "cinnamon_fern" || flavorDef.id === "bracken_tip" || flavorDef.id === "adder_tongue" || flavorDef.id === "miscanthus" || flavorDef.id === "pampas" || flavorDef.id === "fountain_grass" || flavorDef.id === "japanese_forest" || flavorDef.id === "carex_morrow" || flavorDef.id === "scirpus" || flavorDef.id === "typha_pollen" || flavorDef.id === "phragmites" || flavorDef.id === "bamboo_black" || flavorDef.id === "bamboo_golden" || flavorDef.id === "echeveria" || flavorDef.id === "sedum_morgan" || flavorDef.id === "sedum_spect" || flavorDef.id === "sempervivum" || flavorDef.id === "aeonium" || flavorDef.id === "crassula" || flavorDef.id === "kalanchoe" || flavorDef.id === "haworthia" || flavorDef.id === "agave_flower" || flavorDef.id === "yucca_filament" || flavorDef.id === "sansevieria" || flavorDef.id === "jade_plant" || flavorDef.id === "panda_plant" || flavorDef.id === "boysen_leaf" || flavorDef.id === "logan_leaf" || flavorDef.id === "tay_leaf" || flavorDef.id === "marion_leaf" || flavorDef.id === "wine_leaf" || flavorDef.id === "salmon_leaf" || flavorDef.id === "thimble_leaf" || flavorDef.id === "cloud_flower" || flavorDef.id === "huckleberry" || flavorDef.id === "huckle_leaf" || flavorDef.id === "salal" || flavorDef.id === "salal_leaf" || flavorDef.id === "oregon_grape" || flavorDef.id === "mahonia" || flavorDef.id === "barberry_red" || flavorDef.id === "barberry_leaf" || flavorDef.id === "currant_flower" || flavorDef.id === "goose_flower" || flavorDef.id === "josta" || flavorDef.id === "worcesterberry" || flavorDef.id === "juneberry" || flavorDef.id === "shadbush" || flavorDef.id === "chokecherry" || flavorDef.id === "bird_cherry" || flavorDef.id === "pin_cherry" || flavorDef.id === "sand_cherry" || flavorDef.id === "nanking_cherry" || flavorDef.id === "cornelian" || flavorDef.id === "honeyberry" || flavorDef.id === "hascap" || flavorDef.id === "clematis_arm" || flavorDef.id === "clematis_mon" || flavorDef.id === "clematis_tang" || flavorDef.id === "clematis_ori" || flavorDef.id === "akibia" || flavorDef.id === "akebia_flower" || flavorDef.id === "kiwi_hardy" || flavorDef.id === "kiwi_flower" || flavorDef.id === "actinidia" || flavorDef.id === "silver_vine" || flavorDef.id === "hop_fresh" || flavorDef.id === "hop_leaf" || flavorDef.id === "humulus" || flavorDef.id === "japanese_hop" || flavorDef.id === "grape_leaf_fresh" || flavorDef.id === "vine_tendril" || flavorDef.id === "muscadine" || flavorDef.id === "scuppernong" || flavorDef.id === "passiflora_inc" || flavorDef.id === "passiflora_cae" || flavorDef.id === "passiflora_ed" || flavorDef.id === "maypop" || flavorDef.id === "morning_glory_red" || flavorDef.id === "morning_glory_blue" || flavorDef.id === "ipomoea_bat" || flavorDef.id === "moonvine" || flavorDef.id === "cypress_vine" || flavorDef.id === "cardinal_climber" || flavorDef.id === "black_eyed_susan_vine" || flavorDef.id === "thunbergia" || flavorDef.id === "sweet_potato_leaf" || flavorDef.id === "dioscorea" || flavorDef.id === "luffa_flower" || flavorDef.id === "luffa_leaf" || flavorDef.id === "bitter_melon_fl" || flavorDef.id === "bitter_melon_leaf" || flavorDef.id === "squash_blossom" || flavorDef.id === "zucchini_flower" || flavorDef.id === "cucumber_flower" || flavorDef.id === "melon_flower" || flavorDef.id === "okra_flower" || flavorDef.id === "okra_leaf" || flavorDef.id === "hibiscus_escul" || flavorDef.id === "roselle_fresh" || flavorDef.id === "cotton_flower" || flavorDef.id === "cotton_leaf" || flavorDef.id === "kenaf" || flavorDef.id === "jute_leaf" || flavorDef.id === "flax_blue" || flavorDef.id === "flax_red" || flavorDef.id === "hemp_flower" || flavorDef.id === "nettle_fresh" || flavorDef.id === "dead_nettle" || flavorDef.id === "purple_dead_nettle" || flavorDef.id === "henbit" || flavorDef.id === "lamium" || flavorDef.id === "galeopsis" || flavorDef.id === "stachys_byz" || flavorDef.id === "alpine_rosemary" || flavorDef.id === "alpine_marjoram" || flavorDef.id === "alpine_chive" || flavorDef.id === "alpine_cilantro" || flavorDef.id === "alpine_dill" || flavorDef.id === "alpine_lovage" || flavorDef.id === "alpine_sorrel" || flavorDef.id === "coastal_thyme" || flavorDef.id === "coastal_sage" || flavorDef.id === "coastal_oregano" || flavorDef.id === "coastal_basil" || flavorDef.id === "coastal_mint" || flavorDef.id === "coastal_lavender" || flavorDef.id === "coastal_marjoram" || flavorDef.id === "coastal_tarragon" || flavorDef.id === "coastal_chive" || flavorDef.id === "coastal_parsley" || flavorDef.id === "coastal_cilantro" || flavorDef.id === "coastal_dill" || flavorDef.id === "coastal_sorrel" || flavorDef.id === "meadow_thyme" || flavorDef.id === "meadow_sage" || flavorDef.id === "meadow_oregano" || flavorDef.id === "meadow_basil" || flavorDef.id === "meadow_mint" || flavorDef.id === "meadow_lavender" || flavorDef.id === "meadow_marjoram" || flavorDef.id === "meadow_tarragon" || flavorDef.id === "meadow_chive" || flavorDef.id === "meadow_parsley" || flavorDef.id === "meadow_cilantro" || flavorDef.id === "meadow_dill" || flavorDef.id === "meadow_sorrel" || flavorDef.id === "woodland_thyme" || flavorDef.id === "woodland_sage" || flavorDef.id === "woodland_oregano" || flavorDef.id === "woodland_basil" || flavorDef.id === "woodland_mint" || flavorDef.id === "woodland_lavender" || flavorDef.id === "woodland_marjoram" || flavorDef.id === "woodland_tarragon" || flavorDef.id === "woodland_chive" || flavorDef.id === "woodland_parsley" || flavorDef.id === "woodland_cilantro" || flavorDef.id === "woodland_dill" || flavorDef.id === "woodland_fennel" || flavorDef.id === "woodland_lovage" || flavorDef.id === "woodland_sorrel" || flavorDef.id === "garden_thyme" || flavorDef.id === "garden_sage" || flavorDef.id === "garden_oregano" || flavorDef.id === "garden_basil" || flavorDef.id === "garden_mint" || flavorDef.id === "garden_lavender" || flavorDef.id === "garden_marjoram" || flavorDef.id === "garden_tarragon" || flavorDef.id === "garden_chive" || flavorDef.id === "garden_parsley" || flavorDef.id === "garden_cilantro" || flavorDef.id === "garden_dill" || flavorDef.id === "garden_fennel" || flavorDef.id === "garden_lovage" || flavorDef.id === "garden_sorrel" || flavorDef.id === "wild_thyme" || flavorDef.id === "wild_sage" || flavorDef.id === "wild_oregano" || flavorDef.id === "wild_basil" || flavorDef.id === "wild_mint" || flavorDef.id === "wild_lavender" || flavorDef.id === "wild_rosemary" || flavorDef.id === "wild_marjoram" || flavorDef.id === "wild_tarragon" || flavorDef.id === "wild_chive" || flavorDef.id === "wild_parsley" || flavorDef.id === "wild_cilantro" || flavorDef.id === "wild_dill" || flavorDef.id === "wild_fennel" || flavorDef.id === "wild_lovage" || flavorDef.id === "wild_sorrel" || flavorDef.id === "dwarf_thyme" || flavorDef.id === "dwarf_sage" || flavorDef.id === "dwarf_oregano" || flavorDef.id === "dwarf_basil" || flavorDef.id === "dwarf_mint" || flavorDef.id === "dwarf_lavender" || flavorDef.id === "dwarf_marjoram" || flavorDef.id === "dwarf_chive" || flavorDef.id === "dwarf_parsley" || flavorDef.id === "dwarf_cilantro" || flavorDef.id === "dwarf_dill" || flavorDef.id === "dwarf_fennel" || flavorDef.id === "dwarf_lovage" || flavorDef.id === "dwarf_sorrel" || flavorDef.id === "giant_oregano" || flavorDef.id === "giant_basil" || flavorDef.id === "giant_marjoram" || flavorDef.id === "giant_tarragon" || flavorDef.id === "giant_chive" || flavorDef.id === "giant_parsley" || flavorDef.id === "giant_cilantro" || flavorDef.id === "giant_dill" || flavorDef.id === "giant_lovage" || flavorDef.id === "giant_sorrel" || flavorDef.id === "variegated_thyme" || flavorDef.id === "variegated_oregano" || flavorDef.id === "variegated_basil" || flavorDef.id === "variegated_mint" || flavorDef.id === "variegated_lavender" || flavorDef.id === "variegated_marjoram" || flavorDef.id === "variegated_chive" || flavorDef.id === "variegated_parsley" || flavorDef.id === "variegated_cilantro" || flavorDef.id === "variegated_dill" || flavorDef.id === "variegated_sorrel" || flavorDef.id === "golden_thyme" || flavorDef.id === "golden_oregano" || flavorDef.id === "golden_basil" || flavorDef.id === "golden_mint" || flavorDef.id === "golden_lavender" || flavorDef.id === "golden_marjoram" || flavorDef.id === "golden_chive" || flavorDef.id === "golden_parsley" || flavorDef.id === "golden_cilantro" || flavorDef.id === "golden_dill" || flavorDef.id === "golden_sorrel" || flavorDef.id === "silver_thyme" || flavorDef.id === "silver_oregano" || flavorDef.id === "silver_basil" || flavorDef.id === "silver_mint" || flavorDef.id === "silver_lavender" || flavorDef.id === "silver_marjoram" || flavorDef.id === "silver_chive" || flavorDef.id === "silver_parsley" || flavorDef.id === "silver_cilantro" || flavorDef.id === "silver_dill" || flavorDef.id === "silver_sorrel" || flavorDef.id === "purple_thyme" || flavorDef.id === "purple_oregano" || flavorDef.id === "purple_basil" || flavorDef.id === "purple_mint" || flavorDef.id === "purple_lavender" || flavorDef.id === "purple_marjoram" || flavorDef.id === "purple_chive" || flavorDef.id === "purple_parsley" || flavorDef.id === "purple_cilantro" || flavorDef.id === "purple_dill" || flavorDef.id === "purple_sorrel" || flavorDef.id === "red_thyme" || flavorDef.id === "red_oregano" || flavorDef.id === "red_basil" || flavorDef.id === "red_mint" || flavorDef.id === "red_lavender" || flavorDef.id === "red_marjoram" || flavorDef.id === "red_chive" || flavorDef.id === "red_parsley" || flavorDef.id === "red_cilantro" || flavorDef.id === "red_dill" || flavorDef.id === "red_sorrel" || flavorDef.id === "white_thyme" || flavorDef.id === "white_oregano" || flavorDef.id === "white_basil" || flavorDef.id === "white_mint" || flavorDef.id === "white_lavender" || flavorDef.id === "white_marjoram" || flavorDef.id === "white_chive" || flavorDef.id === "white_parsley" || flavorDef.id === "white_cilantro" || flavorDef.id === "white_dill" || flavorDef.id === "white_sorrel" || flavorDef.id === "pink_thyme" || flavorDef.id === "pink_oregano" || flavorDef.id === "pink_basil" || flavorDef.id === "pink_mint" || flavorDef.id === "pink_lavender" || flavorDef.id === "pink_marjoram" || flavorDef.id === "pink_chive" || flavorDef.id === "pink_parsley" || flavorDef.id === "pink_cilantro" || flavorDef.id === "pink_dill" || flavorDef.id === "pink_sorrel" || flavorDef.id === "blue_thyme" || flavorDef.id === "blue_oregano" || flavorDef.id === "blue_basil" || flavorDef.id === "blue_mint" || flavorDef.id === "blue_lavender" || flavorDef.id === "blue_marjoram" || flavorDef.id === "blue_chive" || flavorDef.id === "blue_parsley" || flavorDef.id === "blue_cilantro" || flavorDef.id === "blue_dill" || flavorDef.id === "blue_sorrel" || flavorDef.id === "yellow_thyme" || flavorDef.id === "yellow_oregano" || flavorDef.id === "yellow_basil" || flavorDef.id === "yellow_mint" || flavorDef.id === "yellow_lavender" || flavorDef.id === "yellow_marjoram" || flavorDef.id === "yellow_chive" || flavorDef.id === "yellow_parsley" || flavorDef.id === "yellow_cilantro" || flavorDef.id === "yellow_dill" || flavorDef.id === "yellow_sorrel" || flavorDef.id === "orange_thyme" || flavorDef.id === "orange_oregano" || flavorDef.id === "orange_basil" || flavorDef.id === "orange_mint" || flavorDef.id === "orange_lavender" || flavorDef.id === "orange_marjoram" || flavorDef.id === "orange_chive" || flavorDef.id === "orange_parsley" || flavorDef.id === "orange_cilantro" || flavorDef.id === "orange_dill" || flavorDef.id === "orange_sorrel" || flavorDef.id === "fragrant_thyme" || flavorDef.id === "fragrant_sage" || flavorDef.id === "fragrant_oregano" || flavorDef.id === "fragrant_basil" || flavorDef.id === "fragrant_mint" || flavorDef.id === "fragrant_lavender" || flavorDef.id === "fragrant_rosemary" || flavorDef.id === "fragrant_marjoram" || flavorDef.id === "fragrant_tarragon" || flavorDef.id === "fragrant_chive" || flavorDef.id === "fragrant_parsley" || flavorDef.id === "fragrant_cilantro" || flavorDef.id === "fragrant_dill" || flavorDef.id === "fragrant_fennel" || flavorDef.id === "fragrant_lovage" || flavorDef.id === "fragrant_sorrel" || flavorDef.id === "edible_thyme" || flavorDef.id === "edible_sage" || flavorDef.id === "edible_oregano" || flavorDef.id === "edible_basil" || flavorDef.id === "edible_mint" || flavorDef.id === "edible_lavender" || flavorDef.id === "edible_rosemary" || flavorDef.id === "edible_marjoram" || flavorDef.id === "edible_tarragon" || flavorDef.id === "edible_chive" || flavorDef.id === "edible_parsley" || flavorDef.id === "edible_cilantro" || flavorDef.id === "edible_dill" || flavorDef.id === "edible_fennel" || flavorDef.id === "edible_lovage" || flavorDef.id === "edible_sorrel" || flavorDef.id === "apple_blossom" || flavorDef.id === "pear_blossom" || flavorDef.id === "peach_blossom" || flavorDef.id === "plum_blossom_fresh" || flavorDef.id === "cherry_blossom" || flavorDef.id === "apricot_blossom" || flavorDef.id === "quince_blossom" || flavorDef.id === "medlar_blossom" || flavorDef.id === "mulberry_flower" || flavorDef.id === "fig_leaf" || flavorDef.id === "pomegranate_flower" || flavorDef.id === "persimmon_flower" || flavorDef.id === "walnut_flower" || flavorDef.id === "hazel_catkin" || flavorDef.id === "chestnut_catkin" || flavorDef.id === "almond_fresh_bl" || flavorDef.id === "pistachio_flower" || flavorDef.id === "pecan_flower" || flavorDef.id === "macadamia_flower" || flavorDef.id === "cashew_flower" || flavorDef.id === "brazil_nut_fl" || flavorDef.id === "coconut_inflo" || flavorDef.id === "date_flower" || flavorDef.id === "olive_flower" || flavorDef.id === "avocado_flower" || flavorDef.id === "mango_flower" || flavorDef.id === "lychee_flower" || flavorDef.id === "longan_flower" || flavorDef.id === "rambutan_flower" || flavorDef.id === "mangosteen_flower" || flavorDef.id === "guava_flower" || flavorDef.id === "papaya_flower" || flavorDef.id === "pineapple_flower" || flavorDef.id === "banana_flower" || flavorDef.id === "plantain_flower" || flavorDef.id === "breadfruit_fl" || flavorDef.id === "jackfruit_fl" || flavorDef.id === "durian_fresh_fl" || flavorDef.id === "soursop_fl" || flavorDef.id === "cherimoya_fl" || flavorDef.id === "custard_apple_fl" || baseDef.id === "soda" || baseDef.id === "berry_soda")) {
      score += 0.5;
      notes.push("夏日清爽");
    }
    if (season === "autumn" && (flavorDef.id === "honey" || flavorDef.id === "peach" || flavorDef.id === "tea_leaf" || flavorDef.id === "fennel" || flavorDef.id === "cardamom" || flavorDef.id === "ginger" || flavorDef.id === "calendula" || flavorDef.id === "chrysanthemum" || flavorDef.id === "hibiscus" || flavorDef.id === "plum" || flavorDef.id === "grape" || flavorDef.id === "mulberry" || flavorDef.id === "persimmon" || flavorDef.id === "fig" || flavorDef.id === "longan" || flavorDef.id === "hawthorn" || flavorDef.id === "pear" || flavorDef.id === "apricot" || flavorDef.id === "maple_syrup" || flavorDef.id === "sesame" || flavorDef.id === "chestnut" || flavorDef.id === "cinnamon" || flavorDef.id === "clove" || flavorDef.id === "pistachio")) {
      score += 0.5;
      notes.push("秋日温甜");
    }
    if (season === "winter" && (baseDef.id === "tea" || baseDef.id === "honey_water" || flavorDef.id === "tea_leaf" || flavorDef.id === "yuzu" || flavorDef.id === "ginger" || flavorDef.id === "honey" || flavorDef.id === "pine_needle" || flavorDef.id === "chrysanthemum" || flavorDef.id === "kumquat" || flavorDef.id === "jujube" || flavorDef.id === "cocoa" || flavorDef.id === "vanilla" || flavorDef.id === "almond" || flavorDef.id === "hazelnut" || flavorDef.id === "maple_syrup" || flavorDef.id === "sesame" || flavorDef.id === "walnut" || flavorDef.id === "saffron" || flavorDef.id === "pistachio" || flavorDef.id === "chestnut" || flavorDef.id === "cinnamon" || flavorDef.id === "clove" || flavorDef.id === "star_anise" || flavorDef.id === "nutmeg" || flavorDef.id === "goji" || flavorDef.id === "bay_leaf" || flavorDef.id === "tarragon" || flavorDef.id === "date_fruit" || flavorDef.id === "hyssop" || flavorDef.id === "lovage" || flavorDef.id === "anise_seed" || flavorDef.id === "turmeric" || flavorDef.id === "allspice" || flavorDef.id === "mace" || flavorDef.id === "caraway" || flavorDef.id === "cumin" || flavorDef.id === "fenugreek" || flavorDef.id === "ajwain" || flavorDef.id === "myrtle" || flavorDef.id === "chicory" || flavorDef.id === "nettle" || flavorDef.id === "yarrow" || flavorDef.id === "woodruff" || flavorDef.id === "valerian" || flavorDef.id === "meadowsweet" || flavorDef.id === "angelica" || flavorDef.id === "comfrey" || flavorDef.id === "selfheal" || flavorDef.id === "skullcap" || flavorDef.id === "linden" || flavorDef.id === "horehound" || flavorDef.id === "motherwort" || flavorDef.id === "betony" || flavorDef.id === "solomon_seal" || flavorDef.id === "wormwood" || flavorDef.id === "valerian_root" || flavorDef.id === "avens" || flavorDef.id === "tormentil" || flavorDef.id === "figwort" || flavorDef.id === "ground_ivy" || flavorDef.id === "self_heal_spike" || flavorDef.id === "teasel" || flavorDef.id === "burdock" || flavorDef.id === "hawthorn_berry" || flavorDef.id === "rosehip" || flavorDef.id === "sloe" || flavorDef.id === "wintercress" || flavorDef.id === "medlar" || flavorDef.id === "quince" || flavorDef.id === "aronia" || flavorDef.id === "flax_seed" || flavorDef.id === "hemp_seed" || flavorDef.id === "pumpkin_seed" || flavorDef.id === "sesame_black" || flavorDef.id === "sesame_white" || flavorDef.id === "lapacho" || flavorDef.id === "sassafras" || flavorDef.id === "birch_bark" || flavorDef.id === "pine_resin" || flavorDef.id === "tuberose" || flavorDef.id === "cardamom_green" || flavorDef.id === "cardamom_black" || flavorDef.id === "long_pepper" || flavorDef.id === "grains_of_paradise" || flavorDef.id === "cinnamon_leaf" || flavorDef.id === "clove_bud" || flavorDef.id === "allspice_leaf" || flavorDef.id === "reindeer_moss" || flavorDef.id === "iceland_moss" || flavorDef.id === "oak_moss" || flavorDef.id === "usnea" || flavorDef.id === "chaga" || flavorDef.id === "reishi" || flavorDef.id === "lion_mane" || flavorDef.id === "maitake" || flavorDef.id === "jackfruit_seed" || flavorDef.id === "rowan_jelly" || flavorDef.id === "quince_paste" || flavorDef.id === "yuzu_fresh" || flavorDef.id === "ponkan" || flavorDef.id === "dekopon" || flavorDef.id === "hassaku" || flavorDef.id === "yuzu_kosho" || flavorDef.id === "edelweiss" || flavorDef.id === "juniper_berry" || flavorDef.id === "fir_needle" || flavorDef.id === "myrtle_berry" || flavorDef.id === "mastic" || flavorDef.id === "saffron_crocus" || flavorDef.id === "buckwheat_honey" || flavorDef.id === "chestnut_honey" || flavorDef.id === "propolis" || flavorDef.id === "royal_jelly" || flavorDef.id === "mead_herb" || flavorDef.id === "cacao_nibs" || flavorDef.id === "cacao_husk" || flavorDef.id === "carob" || flavorDef.id === "maca" || flavorDef.id === "schisandra" || flavorDef.id === "hojicha" || flavorDef.id === "genmaicha" || flavorDef.id === "sobacha" || flavorDef.id === "job_tears" || flavorDef.id === "rose_hip_tea" || flavorDef.id === "camellia_fresh" || flavorDef.id === "lotus_seed_fresh" || flavorDef.id === "plum_blossom" || flavorDef.id === "wintersweet" || flavorDef.id === "ginkgo_leaf_fresh" || flavorDef.id === "ginkgo_nut_fresh" || flavorDef.id === "osmanthus_wine" || flavorDef.id === "crocus" || flavorDef.id === "snowdrop" || flavorDef.id === "crocus_yellow" || flavorDef.id === "hyacinth" || flavorDef.id === "daffodil" || flavorDef.id === "moonflower" || flavorDef.id === "magnolia_bark" || flavorDef.id === "eucommia" || flavorDef.id === "astragalus" || flavorDef.id === "codonopsis" || flavorDef.id === "rehmannia" || flavorDef.id === "polygonatum" || flavorDef.id === "ophiopogon" || flavorDef.id === "angelica_arch" || flavorDef.id === "wood_avense" || flavorDef.id === "ephedra" || flavorDef.id === "boldo" || flavorDef.id === "cupuacu_butter" || flavorDef.id === "sutherlandia" || flavorDef.id === "citron" || flavorDef.id === "bergamot_peel" || flavorDef.id === "labrador_tea" || flavorDef.id === "arctic_willow" || flavorDef.id === "kinako" || flavorDef.id === "kuromitsu" || flavorDef.id === "yuzu_peel" || flavorDef.id === "ume_blossom" || flavorDef.id === "vanilla_bean" || flavorDef.id === "tonka_bean" || flavorDef.id === "hazelnut_flower" || flavorDef.id === "omija" || flavorDef.id === "yuja" || flavorDef.id === "ssanghwa" || flavorDef.id === "jujube_tea" || flavorDef.id === "ginger_tea_kr" || flavorDef.id === "kava" || flavorDef.id === "tieguanyin" || flavorDef.id === "dahongpao" || flavorDef.id === "puer_ripe" || flavorDef.id === "shoumei" || flavorDef.id === "burdock_root" || flavorDef.id === "dandelion_root" || flavorDef.id === "chicory_root" || flavorDef.id === "holly_leaf" || flavorDef.id === "ivy_berry" || flavorDef.id === "mistletoe" || flavorDef.id === "yew_berry" || flavorDef.id === "aconite" || flavorDef.id === "helleborus" || flavorDef.id === "christmas_rose" || flavorDef.id === "black_horehound" || flavorDef.id === "white_horehound" || flavorDef.id === "skullcap_fresh" || flavorDef.id === "baikal_skullcap" || flavorDef.id === "ground_ivy_fresh" || flavorDef.id === "savory_winter" || flavorDef.id === "jerusalem_artichoke" || flavorDef.id === "topinambur" || flavorDef.id === "figwort_fresh" || flavorDef.id === "scrophularia" || flavorDef.id === "cymbidium" || flavorDef.id === "maidenhair" || flavorDef.id === "sword_fern" || flavorDef.id === "japanese_painted" || flavorDef.id === "royal_fern" || flavorDef.id === "sensitive_fern" || flavorDef.id === "fiddlehead" || flavorDef.id === "moonwort" || flavorDef.id === "blue_fescue" || flavorDef.id === "hakonechloa" || flavorDef.id === "carex_buch" || flavorDef.id === "juncus" || flavorDef.id === "bamboo_moso" || flavorDef.id === "arrow_bamboo" || flavorDef.id === "aloe_vera_fl" || flavorDef.id === "string_pearls" || flavorDef.id === "burros_tail" || flavorDef.id === "honeysuckle_blue" || flavorDef.id === "arctic_berry" || flavorDef.id === "schisandra_chin" || flavorDef.id === "schisandra_leaf" || flavorDef.id === "yam_leaf" || flavorDef.id === "chinese_yam" || flavorDef.id === "linseed_oil" || flavorDef.id === "nettle_root" || flavorDef.id === "alpine_thyme" || flavorDef.id === "alpine_sage" || flavorDef.id === "alpine_oregano" || flavorDef.id === "alpine_basil" || flavorDef.id === "alpine_mint" || flavorDef.id === "alpine_lavender" || flavorDef.id === "alpine_tarragon" || flavorDef.id === "alpine_parsley" || flavorDef.id === "alpine_fennel" || flavorDef.id === "coastal_rosemary" || flavorDef.id === "coastal_fennel" || flavorDef.id === "coastal_lovage" || flavorDef.id === "meadow_rosemary" || flavorDef.id === "meadow_fennel" || flavorDef.id === "meadow_lovage" || flavorDef.id === "woodland_rosemary" || flavorDef.id === "garden_rosemary" || flavorDef.id === "dwarf_rosemary" || flavorDef.id === "dwarf_tarragon" || flavorDef.id === "giant_thyme" || flavorDef.id === "giant_sage" || flavorDef.id === "giant_mint" || flavorDef.id === "giant_lavender" || flavorDef.id === "giant_rosemary" || flavorDef.id === "giant_fennel" || flavorDef.id === "variegated_sage" || flavorDef.id === "variegated_rosemary" || flavorDef.id === "variegated_tarragon" || flavorDef.id === "variegated_fennel" || flavorDef.id === "variegated_lovage" || flavorDef.id === "golden_sage" || flavorDef.id === "golden_rosemary" || flavorDef.id === "golden_tarragon" || flavorDef.id === "golden_fennel" || flavorDef.id === "golden_lovage" || flavorDef.id === "silver_sage" || flavorDef.id === "silver_rosemary" || flavorDef.id === "silver_tarragon" || flavorDef.id === "silver_fennel" || flavorDef.id === "silver_lovage" || flavorDef.id === "purple_sage" || flavorDef.id === "purple_rosemary" || flavorDef.id === "purple_tarragon" || flavorDef.id === "purple_fennel" || flavorDef.id === "purple_lovage" || flavorDef.id === "red_sage" || flavorDef.id === "red_rosemary" || flavorDef.id === "red_tarragon" || flavorDef.id === "red_fennel" || flavorDef.id === "red_lovage" || flavorDef.id === "white_rosemary" || flavorDef.id === "white_tarragon" || flavorDef.id === "white_fennel" || flavorDef.id === "white_lovage" || flavorDef.id === "pink_sage" || flavorDef.id === "pink_rosemary" || flavorDef.id === "pink_tarragon" || flavorDef.id === "pink_fennel" || flavorDef.id === "pink_lovage" || flavorDef.id === "blue_sage" || flavorDef.id === "blue_rosemary" || flavorDef.id === "blue_tarragon" || flavorDef.id === "blue_fennel" || flavorDef.id === "blue_lovage" || flavorDef.id === "yellow_sage" || flavorDef.id === "yellow_rosemary" || flavorDef.id === "yellow_tarragon" || flavorDef.id === "yellow_fennel" || flavorDef.id === "yellow_lovage" || flavorDef.id === "orange_sage" || flavorDef.id === "orange_rosemary" || flavorDef.id === "orange_tarragon" || flavorDef.id === "orange_fennel" || flavorDef.id === "orange_lovage")) {
      score += 0.5;
      notes.push("冬日暖茶");
    }
    // soft dessert-corner: warm mug / honey base + nut/cocoa/vanilla
    if (
      (cupDef && (cupDef.id === "mug" || cupDef.id === "warm" || cupDef.vibe === "温柔" || cupDef.vibe === "温暖")) ||
      (baseDef && (baseDef.id === "honey_water" || baseDef.id === "tea"))
    ) {
      if (flavorDef.id === "cocoa" || flavorDef.id === "vanilla" || flavorDef.id === "almond" || flavorDef.id === "hazelnut" || flavorDef.id === "maple_syrup" || flavorDef.id === "sesame" || flavorDef.id === "walnut" || flavorDef.id === "saffron" || flavorDef.id === "pistachio" || flavorDef.id === "chestnut" || flavorDef.id === "cinnamon" || flavorDef.id === "clove" || flavorDef.id === "star_anise" || flavorDef.id === "nutmeg" || flavorDef.id === "date_fruit" || flavorDef.id === "goji" || flavorDef.id === "pandan" || flavorDef.id === "allspice" || flavorDef.id === "mace") {
        score += 0.25;
        notes.push("甜点一角");
      }
    }
    // soft forage brew: wild herb flavors feel field-fresh
    var FORAGE_FLAVORS = {
      chicory: true,
      dandelion: true,
      nettle: true,
      yarrow: true,
      sorrel: true,
      chervil: true,
      verbena: true,
      myrtle: true,
      meadowsweet: true,
      woodruff: true,
      borage: true,
      valerian: true,
      hops: true,
      heather: true,
      angelica: true,
      arnica: true,
      echinacea: true,
      comfrey: true,
      feverfew: true,
      lemon_verbena: true,
      mullein: true,
      plantain_leaf: true,
      selfheal: true,
      skullcap: true,
      bee_balm: true,
      marshmallow: true,
      linden: true,
      goldenrod: true,
      red_clover: true,
      white_clover: true,
      catnip: true,
      horehound: true,
      motherwort: true,
      tansy: true,
      agrimony: true,
      betony: true,
      solomon_seal: true,
      rue: true,
      wormwood: true,
      costmary: true,
      elecampane: true,
      valerian_root: true,
      meadow_clary: true,
      soapwort: true,
      milfoil: true,
      lady_mantle: true,
      speedwell: true,
      stitchwort: true,
      campion: true,
      avens: true,
      tormentil: true,
      silverweed: true,
      figwort: true,
      loosestrife: true,
      willowherb: true,
      bedstraw: true,
      cleavers: true,
      ground_ivy: true,
      self_heal_spike: true,
      bugle: true,
      primrose: true,
      cowslip: true,
      oxeye: true,
      knapweed: true,
      scabious: true,
      teasel: true,
      burdock: true,
      nettle_seed: true,
      hawthorn_berry: true,
      rosehip: true,
      sloe: true,
      rowan: true,
      crabapple: true,
      serviceberry: true,
      elderflower_fresh: true,
      meadowsweet_fresh: true,
      wood_sorrel: true,
      wild_garlic: true,
      ramsons: true,
      jack_by_hedge: true,
      hedge_mustard: true,
      wintercress: true,
      watercress: true,
      brooklime: true,
      cloudberry: true,
      lingonberry: true,
      bilberry: true,
      gooseberry: true,
      currant_red: true,
      currant_black: true,
      whitecurrant: true,
      sea_buckthorn: true,
      medlar: true,
      quince: true,
      damson: true,
      greengage: true,
      mirabelle: true,
      saskatoon: true,
      chokeberry: true,
      aronia: true,
      yarrow_white: true,
      achillea_pink: true,
      cornflower: true,
      poppy_seed: true,
      flax_flower: true,
      flax_seed: true,
      hemp_seed: true,
      chia_seed: true,
      pumpkin_seed: true,
      sunflower_seed: true,
      sesame_black: true,
      sesame_white: true,
      fennel_pollen: true,
      fennel_frond: true,
      dill_pollen: true,
      celery_leaf: true,
      rooibos: true,
      honeybush: true,
      yerba_mate: true,
      guayusa: true,
      lapacho: true,
      sassafras: true,
      birch_bark: true,
      pine_resin: true,
      gardenia: true,
      magnolia: true,
      frangipani: true,
      plumeria: true,
      tuberose: true,
      stephanotis: true,
      garden_phlox: true,
      osmanthus_fresh: true,
      galangal_fresh: true,
      ginger_flower: true,
      turmeric_fresh: true,
      cardamom_green: true,
      cardamom_black: true,
      long_pepper: true,
      grains_of_paradise: true,
      cubeb: true,
      makrut_leaf: true,
      curry_leaf: true,
      holy_basil: true,
      thai_basil: true,
      lemon_basil: true,
      cinnamon_leaf: true,
      clove_bud: true,
      allspice_leaf: true,
      reindeer_moss: true,
      iceland_moss: true,
      oak_moss: true,
      usnea: true,
      chaga: true,
      reishi: true,
      lion_mane: true,
      maitake: true,
      rambutan_fresh: true,
      lychee_fresh: true,
      mangosteen: true,
      durian_flower: true,
      jackfruit_seed: true,
      tamarind: true,
      calamansi: true,
      fig_fresh: true,
      pomegranate_seed: true,
      cactus_pear: true,
      prickly_pear: true,
      sapodilla: true,
      soursop: true,
      cherimoya: true,
      feijoa: true,
      loquat_fresh: true,
      jujube_fresh: true,
      mulberry_white: true,
      mulberry_black: true,
      elderberry_fresh: true,
      rowan_jelly: true,
      quince_paste: true,
      bergamot_fresh: true,
      yuzu_fresh: true,
      sudachi: true,
      kabosu: true,
      ponkan: true,
      dekopon: true,
      hassaku: true,
      amanatsu: true,
      shiso_green: true,
      shiso_red: true,
      mitsuba: true,
      myoga: true,
      wasabi_leaf: true,
      sansho: true,
      kinome: true,
      yuzu_kosho: true,
      edelweiss: true,
      gentian: true,
      arnica_montana: true,
      alpine_strawberry: true,
      bilberry_leaf: true,
      juniper_berry: true,
      fir_needle: true,
      spruce_tip: true,
      olive_leaf: true,
      myrtle_berry: true,
      mastic: true,
      caper: true,
      zaatar: true,
      sumac_berry: true,
      saffron_crocus: true,
      orange_blossom: true,
      lavender_honey: true,
      thyme_honey: true,
      acacia_honey: true,
      buckwheat_honey: true,
      chestnut_honey: true,
      manuka: true,
      propolis: true,
      bee_pollen: true,
      royal_jelly: true,
      comb_honey: true,
      mead_herb: true,
      linden_honey: true,
      heather_honey_wild: true,
      wildflower_honey: true,
      clover_honey: true,
      eucalyptus_honey: true,
      cacao_nibs: true,
      cacao_husk: true,
      carob: true,
      mesquite: true,
      lucuma: true,
      maca: true,
      camu_camu: true,
      acai: true,
      maqui: true,
      goji_fresh: true,
      schisandra: true,
      amla: true,
      baobab: true,
      morinda: true,
      noni: true,
      cupuacu: true,
      matcha_ceremonial: true,
      hojicha: true,
      genmaicha: true,
      sencha: true,
      gyokuro: true,
      bancha: true,
      kukicha: true,
      mugicha: true,
      sobacha: true,
      job_tears: true,
      barley_grass: true,
      wheatgrass: true,
      spirulina: true,
      chlorella: true,
      kelp: true,
      nori: true,
      rose_hip_tea: true,
      hibiscus_fresh: true,
      chrysanthemum_fresh: true,
      peony: true,
      camellia_fresh: true,
      lotus_seed_fresh: true,
      lotus_leaf_fresh: true,
      osmanthus_sugar: true,
      plum_blossom: true,
      wintersweet: true,
      orchid_petal: true,
      bamboo_leaf_fresh: true,
      bamboo_shoot_fresh: true,
      ginkgo_leaf_fresh: true,
      ginkgo_nut_fresh: true,
      osmanthus_wine: true,
      safflower: true,
      calendula_fresh: true,
      pot_marigold: true,
      coreopsis: true,
      cosmos: true,
      zinnia: true,
      dahlia: true,
      gladiolus: true,
      iris: true,
      crocus: true,
      snowdrop: true,
      crocus_yellow: true,
      hyacinth: true,
      daffodil: true,
      tulip: true,
      ranunculus: true,
      sweet_pea: true,
      nasturtium: true,
      morning_glory: true,
      moonflower: true,
      clematis: true,
      wisteria_fresh: true,
      jasmine_sambac: true,
      gardenia_tea: true,
      magnolia_bark: true,
      eucommia: true,
      astragalus: true,
      codonopsis: true,
      rehmannia: true,
      polygonatum: true,
      ophiopogon: true,
      boysenberry: true,
      loganberry: true,
      tayberry: true,
      marionberry: true,
      wineberry: true,
      salmonberry: true,
      thimbleberry: true,
      cloudberry_leaf: true,
      angelica_arch: true,
      lovage_fresh: true,
      sweet_cicely: true,
      wood_avense: true,
      ramsons_flower: true,
      sea_kale: true,
      scurvygrass: true,
      marsh_samphire: true,
      agave_nectar: true,
      prickly_pear_pad: true,
      jojoba: true,
      mesquite_pod: true,
      creosote: true,
      desert_sage: true,
      ephedra: true,
      yucca_flower: true,
      yerba_santa: true,
      boldo: true,
      cedron: true,
      muña: true,
      coca_leaf_tea: true,
      guarana: true,
      cupuacu_butter: true,
      stevia_leaf: true,
      rooibos_green: true,
      honeybush_fresh: true,
      buchu: true,
      sutherlandia: true,
      baobab_leaf: true,
      marula: true,
      kinkeliba: true,
      hibiscus_sab: true,
      pandan_fresh: true,
      lemongrass_fresh: true,
      galangal_leaf: true,
      torch_ginger: true,
      butterfly_pea: true,
      chrysanthemum_ind: true,
      tamarind_leaf: true,
      coconut_flower: true,
      bergamot_leaf: true,
      citron: true,
      bergamot_peel: true,
      neroli: true,
      petitgrain: true,
      immortelle: true,
      helichrysum: true,
      cistus: true,
      spruce_beer: true,
      labrador_tea: true,
      fireweed: true,
      fireweed_honey: true,
      arctic_willow: true,
      crowberry: true,
      bearberry: true,
      labrador_violet: true,
      kinako: true,
      kuromitsu: true,
      matcha_salt: true,
      yuzu_peel: true,
      sansho_leaf: true,
      shiso_flower: true,
      ume_blossom: true,
      sakura_leaf: true,
      vanilla_bean: true,
      tonka_bean: true,
      lavender_sugar: true,
      rose_water: true,
      orange_flower_water: true,
      almond_blossom: true,
      hazelnut_flower: true,
      chestnut_flower: true,
      omija: true,
      yuja: true,
      ssanghwa: true,
      maesil: true,
      jujube_tea: true,
      ginger_tea_kr: true,
      persimmon_leaf: true,
      pine_flower: true,
      tulsi: true,
      neem_flower: true,
      curry_blossom: true,
      ajwain_leaf: true,
      fenugreek_leaf: true,
      moringa: true,
      gotu_kola: true,
      brahmi: true,
      hibiscus_rosa: true,
      allspice_berry: true,
      annatto: true,
      epazote: true,
      papalo: true,
      hoja_santa: true,
      mexican_oregano: true,
      chile_flower: true,
      noni_leaf: true,
      kava: true,
      ti_leaf: true,
      frangipani_tea: true,
      soursop_leaf: true,
      guava_leaf: true,
      passion_leaf: true,
      vanilla_orchid: true,
      longjing: true,
      biluochun: true,
      tieguanyin: true,
      dahongpao: true,
      puer_raw: true,
      puer_ripe: true,
      white_peony_tea: true,
      shoumei: true,
      burdock_root: true,
      dandelion_root: true,
      chicory_root: true,
      valerian_flower: true,
      hops_flower: true,
      meadowsweet_flower: true,
      yarrow_flower: true,
      nettle_seed_tea: true,
      silver_birch: true,
      copper_beech: true,
      hornbeam: true,
      field_maple: true,
      wild_service: true,
      guelder_rose: true,
      wayfaring: true,
      dogwood: true,
      spindle: true,
      buckthorn: true,
      privet: true,
      boxwood: true,
      holly_leaf: true,
      ivy_berry: true,
      mistletoe: true,
      yew_berry: true,
      bluebell_fresh: true,
      primula_veris: true,
      oxlip: true,
      cowslip_fresh: true,
      wood_anemone: true,
      wood_sorrel_pink: true,
      greater_stitchwort: true,
      red_campion: true,
      white_campion: true,
      ragged_robin: true,
      cuckooflower: true,
      lady_smock: true,
      garlic_mustard_fl: true,
      hedge_garlic_seed: true,
      jack_hedge_leaf: true,
      wild_mustard: true,
      meadow_buttercup: true,
      creeping_buttercup: true,
      lesser_celandine: true,
      marsh_marigold: true,
      globe_flower: true,
      columbine: true,
      monkshood: true,
      larkspur: true,
      delphinium: true,
      aconite: true,
      helleborus: true,
      christmas_rose: true,
      pasque_flower: true,
      anemone_coronaria: true,
      hepatic: true,
      clematis_vitalba: true,
      speedwell_germander: true,
      germander: true,
      betony_fresh: true,
      selfheal_fresh: true,
      woundwort: true,
      hedge_woundwort: true,
      marsh_woundwort: true,
      black_horehound: true,
      white_horehound: true,
      motherwort_fresh: true,
      skullcap_fresh: true,
      baikal_skullcap: true,
      scutellaria: true,
      bugle_fresh: true,
      ground_ivy_fresh: true,
      alehoof: true,
      clary_sage: true,
      pineapple_sage: true,
      fruit_sage: true,
      white_sage: true,
      russian_sage: true,
      meadow_clary_fresh: true,
      wood_sage: true,
      jerusalem_sage: true,
      catmint: true,
      catnip_fresh: true,
      hyssop_fresh: true,
      anise_hyssop: true,
      korean_mint: true,
      agastache: true,
      lavender_spike: true,
      lavender_sto: true,
      thyme_lemon: true,
      thyme_orange: true,
      thyme_caraway: true,
      thyme_woolly: true,
      creeping_thyme: true,
      oregano_greek: true,
      oregano_italian: true,
      marjoram_sweet: true,
      savory_summer: true,
      savory_winter: true,
      basil_genovese: true,
      basil_cinnamon: true,
      basil_purple: true,
      basil_lettuce: true,
      mint_peppermint: true,
      mint_spearmint: true,
      mint_chocolate: true,
      mint_apple: true,
      mint_ginger: true,
      mint_orange: true,
      mint_lavender: true,
      mint_bergamot: true,
      mint_corsican: true,
      mint_water: true,
      melissa_fresh: true,
      lemon_balm_var: true,
      bee_balm_pink: true,
      bee_balm_purple: true,
      oregano_hop: true,
      dittany: true,
      dictamnus: true,
      burning_bush: true,
      chamomile_roman: true,
      chamomile_german: true,
      feverfew_fresh: true,
      tansy_fresh: true,
      yarrow_pink: true,
      yarrow_gold: true,
      arnica_fresh: true,
      calendula_offic: true,
      pot_marigold_dbl: true,
      tagetes: true,
      marigold_french: true,
      signet_marigold: true,
      costmary_fresh: true,
      elecampane_fresh: true,
      inula: true,
      eupatorium: true,
      echinacea_purp: true,
      echinacea_ang: true,
      echinacea_pall: true,
      rudbeckia: true,
      black_eyed_susan: true,
      coneflower_yellow: true,
      helenium: true,
      helenium_autumn: true,
      coreopsis_lance: true,
      coreopsis_tick: true,
      gaillardia: true,
      gaillardia_fan: true,
      ratibida: true,
      silphium: true,
      cup_plant: true,
      compass_plant: true,
      aster_novae: true,
      aster_novi: true,
      michaelmas: true,
      goldenrod_fresh: true,
      solidago: true,
      boltonia: true,
      erigeron: true,
      fleabane: true,
      daisy_oxeye: true,
      daisy_english: true,
      daisy_shasta: true,
      chrysanthemum_ind_fresh: true,
      chrysanthemum_mor: true,
      chrysanthemum_yej: true,
      tanacetum: true,
      pyrethrum: true,
      sunflower_dwarf: true,
      sunflower_multi: true,
      sunflower_red: true,
      jerusalem_artichoke: true,
      sunchoke_flower: true,
      topinambur: true,
      dahlia_cactus: true,
      dahlia_pompom: true,
      zinnia_dwarf: true,
      zinnia_cactus: true,
      cosmos_sulph: true,
      cosmos_choco: true,
      tithonia: true,
      mexican_sunflower: true,
      heliopsis: true,
      inula_helenium: true,
      verbena_bon: true,
      verbena_rig: true,
      lantana: true,
      lantana_white: true,
      phlox_pan: true,
      phlox_sub: true,
      phlox_drum: true,
      dianthus_chin: true,
      dianthus_barb: true,
      sweet_william: true,
      carnation: true,
      pinks: true,
      gypsophila: true,
      baby_breath: true,
      saponaria: true,
      soapwort_fresh: true,
      campanula: true,
      campanula_med: true,
      lobelia: true,
      lobelia_card: true,
      penstemon: true,
      penstemon_fox: true,
      digitalis: true,
      digitalis_lutea: true,
      snapdragon: true,
      snapdragon_dwarf: true,
      antirrhinum: true,
      linaria: true,
      toadflax: true,
      verbascum_chaix: true,
      mullein_white: true,
      figwort_fresh: true,
      scrophularia: true,
      mimulus: true,
      monkeyflower: true,
      collinsia: true,
      castilleja: true,
      paintbrush: true,
      orthocarpus: true,
      pedicularis: true,
      lousewort: true,
      euphrasia: true,
      eyebright: true,
      rhinanthus: true,
      yellow_rattle: true,
      melampyrum: true,
      cow_wheat: true,
      bartisia: true,
      cattleya: true,
      dendrobium: true,
      phalaenopsis: true,
      cymbidium: true,
      oncidium: true,
      vanda: true,
      paphiopedilum: true,
      miltonia: true,
      odontoglossum: true,
      brassia: true,
      epidendrum: true,
      ludisia: true,
      anoectochilus: true,
      gastrodia: true,
      bletilla: true,
      calanthe: true,
      maidenhair: true,
      boston_fern: true,
      bird_nest_fern: true,
      staghorn: true,
      sword_fern: true,
      holly_fern: true,
      autumn_fern: true,
      japanese_painted: true,
      ostrich_fern: true,
      cinnamon_fern: true,
      royal_fern: true,
      sensitive_fern: true,
      bracken_tip: true,
      fiddlehead: true,
      adder_tongue: true,
      moonwort: true,
      miscanthus: true,
      pampas: true,
      fountain_grass: true,
      blue_fescue: true,
      japanese_forest: true,
      hakonechloa: true,
      carex_morrow: true,
      carex_buch: true,
      juncus: true,
      scirpus: true,
      typha_pollen: true,
      phragmites: true,
      bamboo_moso: true,
      bamboo_black: true,
      bamboo_golden: true,
      arrow_bamboo: true,
      echeveria: true,
      sedum_morgan: true,
      sedum_spect: true,
      sempervivum: true,
      aeonium: true,
      crassula: true,
      kalanchoe: true,
      haworthia: true,
      aloe_vera_fl: true,
      agave_flower: true,
      yucca_filament: true,
      sansevieria: true,
      jade_plant: true,
      string_pearls: true,
      burros_tail: true,
      panda_plant: true,
      boysen_leaf: true,
      logan_leaf: true,
      tay_leaf: true,
      marion_leaf: true,
      wine_leaf: true,
      salmon_leaf: true,
      thimble_leaf: true,
      cloud_flower: true,
      huckleberry: true,
      huckle_leaf: true,
      salal: true,
      salal_leaf: true,
      oregon_grape: true,
      mahonia: true,
      barberry_red: true,
      barberry_leaf: true,
      currant_flower: true,
      goose_flower: true,
      josta: true,
      worcesterberry: true,
      juneberry: true,
      shadbush: true,
      chokecherry: true,
      bird_cherry: true,
      pin_cherry: true,
      sand_cherry: true,
      nanking_cherry: true,
      cornelian: true,
      honeysuckle_blue: true,
      honeyberry: true,
      hascap: true,
      arctic_berry: true,
      clematis_arm: true,
      clematis_mon: true,
      clematis_tang: true,
      clematis_ori: true,
      akibia: true,
      akebia_flower: true,
      schisandra_chin: true,
      schisandra_leaf: true,
      kiwi_hardy: true,
      kiwi_flower: true,
      actinidia: true,
      silver_vine: true,
      hop_fresh: true,
      hop_leaf: true,
      humulus: true,
      japanese_hop: true,
      grape_leaf_fresh: true,
      vine_tendril: true,
      muscadine: true,
      scuppernong: true,
      passiflora_inc: true,
      passiflora_cae: true,
      passiflora_ed: true,
      maypop: true,
      morning_glory_red: true,
      morning_glory_blue: true,
      ipomoea_bat: true,
      moonvine: true,
      cypress_vine: true,
      cardinal_climber: true,
      black_eyed_susan_vine: true,
      thunbergia: true,
      sweet_potato_leaf: true,
      yam_leaf: true,
      dioscorea: true,
      chinese_yam: true,
      luffa_flower: true,
      luffa_leaf: true,
      bitter_melon_fl: true,
      bitter_melon_leaf: true,
      squash_blossom: true,
      zucchini_flower: true,
      cucumber_flower: true,
      melon_flower: true,
      okra_flower: true,
      okra_leaf: true,
      hibiscus_escul: true,
      roselle_fresh: true,
      cotton_flower: true,
      cotton_leaf: true,
      kenaf: true,
      jute_leaf: true,
      flax_blue: true,
      flax_red: true,
      linseed_oil: true,
      hemp_flower: true,
      nettle_fresh: true,
      nettle_root: true,
      dead_nettle: true,
      purple_dead_nettle: true,
      henbit: true,
      lamium: true,
      galeopsis: true,
      stachys_byz: true,
      alpine_thyme: true,
      alpine_sage: true,
      alpine_oregano: true,
      alpine_basil: true,
      alpine_mint: true,
      alpine_lavender: true,
      alpine_rosemary: true,
      alpine_marjoram: true,
      alpine_tarragon: true,
      alpine_chive: true,
      alpine_parsley: true,
      alpine_cilantro: true,
      alpine_dill: true,
      alpine_fennel: true,
      alpine_lovage: true,
      alpine_sorrel: true,
      coastal_thyme: true,
      coastal_sage: true,
      coastal_oregano: true,
      coastal_basil: true,
      coastal_mint: true,
      coastal_lavender: true,
      coastal_rosemary: true,
      coastal_marjoram: true,
      coastal_tarragon: true,
      coastal_chive: true,
      coastal_parsley: true,
      coastal_cilantro: true,
      coastal_dill: true,
      coastal_fennel: true,
      coastal_lovage: true,
      coastal_sorrel: true,
      meadow_thyme: true,
      meadow_sage: true,
      meadow_oregano: true,
      meadow_basil: true,
      meadow_mint: true,
      meadow_lavender: true,
      meadow_rosemary: true,
      meadow_marjoram: true,
      meadow_tarragon: true,
      meadow_chive: true,
      meadow_parsley: true,
      meadow_cilantro: true,
      meadow_dill: true,
      meadow_fennel: true,
      meadow_lovage: true,
      meadow_sorrel: true,
      woodland_thyme: true,
      woodland_sage: true,
      woodland_oregano: true,
      woodland_basil: true,
      woodland_mint: true,
      woodland_lavender: true,
      woodland_rosemary: true,
      woodland_marjoram: true,
      woodland_tarragon: true,
      woodland_chive: true,
      woodland_parsley: true,
      woodland_cilantro: true,
      woodland_dill: true,
      woodland_fennel: true,
      woodland_lovage: true,
      woodland_sorrel: true,
      garden_thyme: true,
      garden_sage: true,
      garden_oregano: true,
      garden_basil: true,
      garden_mint: true,
      garden_lavender: true,
      garden_rosemary: true,
      garden_marjoram: true,
      garden_tarragon: true,
      garden_chive: true,
      garden_parsley: true,
      garden_cilantro: true,
      garden_dill: true,
      garden_fennel: true,
      garden_lovage: true,
      garden_sorrel: true,
      wild_thyme: true,
      wild_sage: true,
      wild_oregano: true,
      wild_basil: true,
      wild_mint: true,
      wild_lavender: true,
      wild_rosemary: true,
      wild_marjoram: true,
      wild_tarragon: true,
      wild_chive: true,
      wild_parsley: true,
      wild_cilantro: true,
      wild_dill: true,
      wild_fennel: true,
      wild_lovage: true,
      wild_sorrel: true,
      dwarf_thyme: true,
      dwarf_sage: true,
      dwarf_oregano: true,
      dwarf_basil: true,
      dwarf_mint: true,
      dwarf_lavender: true,
      dwarf_rosemary: true,
      dwarf_marjoram: true,
      dwarf_tarragon: true,
      dwarf_chive: true,
      dwarf_parsley: true,
      dwarf_cilantro: true,
      dwarf_dill: true,
      dwarf_fennel: true,
      dwarf_lovage: true,
      dwarf_sorrel: true,
      giant_thyme: true,
      giant_sage: true,
      giant_oregano: true,
      giant_basil: true,
      giant_mint: true,
      giant_lavender: true,
      giant_rosemary: true,
      giant_marjoram: true,
      giant_tarragon: true,
      giant_chive: true,
      giant_parsley: true,
      giant_cilantro: true,
      giant_dill: true,
      giant_fennel: true,
      giant_lovage: true,
      giant_sorrel: true,
      variegated_thyme: true,
      variegated_sage: true,
      variegated_oregano: true,
      variegated_basil: true,
      variegated_mint: true,
      variegated_lavender: true,
      variegated_rosemary: true,
      variegated_marjoram: true,
      variegated_tarragon: true,
      variegated_chive: true,
      variegated_parsley: true,
      variegated_cilantro: true,
      variegated_dill: true,
      variegated_fennel: true,
      variegated_lovage: true,
      variegated_sorrel: true,
      golden_thyme: true,
      golden_sage: true,
      golden_oregano: true,
      golden_basil: true,
      golden_mint: true,
      golden_lavender: true,
      golden_rosemary: true,
      golden_marjoram: true,
      golden_tarragon: true,
      golden_chive: true,
      golden_parsley: true,
      golden_cilantro: true,
      golden_dill: true,
      golden_fennel: true,
      golden_lovage: true,
      golden_sorrel: true,
      silver_thyme: true,
      silver_sage: true,
      silver_oregano: true,
      silver_basil: true,
      silver_mint: true,
      silver_lavender: true,
      silver_rosemary: true,
      silver_marjoram: true,
      silver_tarragon: true,
      silver_chive: true,
      silver_parsley: true,
      silver_cilantro: true,
      silver_dill: true,
      silver_fennel: true,
      silver_lovage: true,
      silver_sorrel: true,
      purple_thyme: true,
      purple_sage: true,
      purple_oregano: true,
      purple_basil: true,
      purple_mint: true,
      purple_lavender: true,
      purple_rosemary: true,
      purple_marjoram: true,
      purple_tarragon: true,
      purple_chive: true,
      purple_parsley: true,
      purple_cilantro: true,
      purple_dill: true,
      purple_fennel: true,
      purple_lovage: true,
      purple_sorrel: true,
      red_thyme: true,
      red_sage: true,
      red_oregano: true,
      red_basil: true,
      red_mint: true,
      red_lavender: true,
      red_rosemary: true,
      red_marjoram: true,
      red_tarragon: true,
      red_chive: true,
      red_parsley: true,
      red_cilantro: true,
      red_dill: true,
      red_fennel: true,
      red_lovage: true,
      red_sorrel: true,
      white_thyme: true,
      white_oregano: true,
      white_basil: true,
      white_mint: true,
      white_lavender: true,
      white_rosemary: true,
      white_marjoram: true,
      white_tarragon: true,
      white_chive: true,
      white_parsley: true,
      white_cilantro: true,
      white_dill: true,
      white_fennel: true,
      white_lovage: true,
      white_sorrel: true,
      pink_thyme: true,
      pink_sage: true,
      pink_oregano: true,
      pink_basil: true,
      pink_mint: true,
      pink_lavender: true,
      pink_rosemary: true,
      pink_marjoram: true,
      pink_tarragon: true,
      pink_chive: true,
      pink_parsley: true,
      pink_cilantro: true,
      pink_dill: true,
      pink_fennel: true,
      pink_lovage: true,
      pink_sorrel: true,
      blue_thyme: true,
      blue_sage: true,
      blue_oregano: true,
      blue_basil: true,
      blue_mint: true,
      blue_lavender: true,
      blue_rosemary: true,
      blue_marjoram: true,
      blue_tarragon: true,
      blue_chive: true,
      blue_parsley: true,
      blue_cilantro: true,
      blue_dill: true,
      blue_fennel: true,
      blue_lovage: true,
      blue_sorrel: true,
      yellow_thyme: true,
      yellow_sage: true,
      yellow_oregano: true,
      yellow_basil: true,
      yellow_mint: true,
      yellow_lavender: true,
      yellow_rosemary: true,
      yellow_marjoram: true,
      yellow_tarragon: true,
      yellow_chive: true,
      yellow_parsley: true,
      yellow_cilantro: true,
      yellow_dill: true,
      yellow_fennel: true,
      yellow_lovage: true,
      yellow_sorrel: true,
      orange_thyme: true,
      orange_sage: true,
      orange_oregano: true,
      orange_basil: true,
      orange_mint: true,
      orange_lavender: true,
      orange_rosemary: true,
      orange_marjoram: true,
      orange_tarragon: true,
      orange_chive: true,
      orange_parsley: true,
      orange_cilantro: true,
      orange_dill: true,
      orange_fennel: true,
      orange_lovage: true,
      orange_sorrel: true,
      fragrant_thyme: true,
      fragrant_sage: true,
      fragrant_oregano: true,
      fragrant_basil: true,
      fragrant_mint: true,
      fragrant_lavender: true,
      fragrant_rosemary: true,
      fragrant_marjoram: true,
      fragrant_tarragon: true,
      fragrant_chive: true,
      fragrant_parsley: true,
      fragrant_cilantro: true,
      fragrant_dill: true,
      fragrant_fennel: true,
      fragrant_lovage: true,
      fragrant_sorrel: true,
      edible_thyme: true,
      edible_sage: true,
      edible_oregano: true,
      edible_basil: true,
      edible_mint: true,
      edible_lavender: true,
      edible_rosemary: true,
      edible_marjoram: true,
      edible_tarragon: true,
      edible_chive: true,
      edible_parsley: true,
      edible_cilantro: true,
      edible_dill: true,
      edible_fennel: true,
      edible_lovage: true,
      edible_sorrel: true,
      apple_blossom: true,
      pear_blossom: true,
      peach_blossom: true,
      plum_blossom_fresh: true,
      cherry_blossom: true,
      apricot_blossom: true,
      quince_blossom: true,
      medlar_blossom: true,
      mulberry_flower: true,
      fig_leaf: true,
      pomegranate_flower: true,
      persimmon_flower: true,
      walnut_flower: true,
      hazel_catkin: true,
      chestnut_catkin: true,
      almond_fresh_bl: true,
      pistachio_flower: true,
      pecan_flower: true,
      macadamia_flower: true,
      cashew_flower: true,
      brazil_nut_fl: true,
      coconut_inflo: true,
      date_flower: true,
      olive_flower: true,
      avocado_flower: true,
      mango_flower: true,
      lychee_flower: true,
      longan_flower: true,
      rambutan_flower: true,
      mangosteen_flower: true,
      guava_flower: true,
      papaya_flower: true,
      pineapple_flower: true,
      banana_flower: true,
      plantain_flower: true,
      breadfruit_fl: true,
      jackfruit_fl: true,
      durian_fresh_fl: true,
      soursop_fl: true,
      cherimoya_fl: true,
      custard_apple_fl: true
    };
    if (FORAGE_FLAVORS[flavorDef.id] && (baseDef.id === "tea" || baseDef.id === "honey_water" || baseDef.id === "soda" || baseDef.id === "floral_tea")) {
      score += 0.3;
      notes.push("野草特调");
    }
    // soft pin-shelf: using pinned flavor feels familiar
    if (catalogs.pinnedFlavorId && flavorDef.id === catalogs.pinnedFlavorId) {
      score += 0.35;
      notes.push("调味架熟手");
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
    if (catalogs.pinnedFlavorId == null && state.pinnedFlavorId) catalogs.pinnedFlavorId = state.pinnedFlavorId;
    var result = scoreDrink(customer, craft, catalogs);
    if (result.notes && result.notes.indexOf("野草特调") >= 0) {
      if (!state.stats) state.stats = {};
      state.stats.forageBrews = (state.stats.forageBrews || 0) + 1;
    }
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

  
  /** Soft pin a flavor id for shop craft recall (no combat) */
  function pinFlavor(state, flavorId) {
    flavorId = String(flavorId || "").trim();
    if (!flavorId) return { ok: false, reason: "empty" };
    state.pinnedFlavorId = flavorId;
    if (!state.stats) state.stats = {};
    state.stats.flavorPins = (state.stats.flavorPins || 0) + 1;
    appendJournal(state, "把「" + flavorId + "」钉在小店调味架上。");
    return { ok: true, flavorId: flavorId };
  }

  function getPinnedFlavor(state) {
    return state.pinnedFlavorId || null;
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
    pinFlavor: pinFlavor,
    getPinnedFlavor: getPinnedFlavor,
    setGuestNote: setGuestNote,
    claimFirstWalkBonus: claimFirstWalkBonus,
    upgradeWateringCan: upgradeWateringCan,
    checkPathMilestones: checkPathMilestones,
    PATH_MILESTONES: PATH_MILESTONES,
  };
});
