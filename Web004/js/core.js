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
    if (season === "summer" && (flavorDef.id === "mint" || flavorDef.id === "rosemary" || flavorDef.id === "bluebell" || flavorDef.id === "matcha" || flavorDef.id === "perilla" || flavorDef.id === "thyme" || flavorDef.id === "dill" || flavorDef.id === "basil" || flavorDef.id === "lemongrass" || flavorDef.id === "coriander" || flavorDef.id === "lemon_balm" || flavorDef.id === "marjoram" || flavorDef.id === "hibiscus" || flavorDef.id === "elderflower" || flavorDef.id === "sea_lavender" || flavorDef.id === "mulberry" || flavorDef.id === "strawberry" || flavorDef.id === "blueberry" || flavorDef.id === "pomegranate" || flavorDef.id === "yangmei" || flavorDef.id === "litchi" || flavorDef.id === "olive" || flavorDef.id === "mango" || flavorDef.id === "pineapple" || flavorDef.id === "coconut" || flavorDef.id === "starfruit" || flavorDef.id === "passion_fruit" || flavorDef.id === "kiwi" || flavorDef.id === "dragonfruit" || flavorDef.id === "guava" || flavorDef.id === "cherry" || flavorDef.id === "apricot" || flavorDef.id === "grapefruit" || flavorDef.id === "tangerine" || flavorDef.id === "wax_apple" || flavorDef.id === "sugarcane" || flavorDef.id === "lemon" || flavorDef.id === "lime" || flavorDef.id === "cranberry" || flavorDef.id === "elderberry" || flavorDef.id === "honeydew" || flavorDef.id === "watermelon" || flavorDef.id === "cantaloupe" || flavorDef.id === "papaya" || flavorDef.id === "rambutan" || flavorDef.id === "jackfruit" || flavorDef.id === "oregano" || flavorDef.id === "chive" || flavorDef.id === "parsley" || flavorDef.id === "avocado" || flavorDef.id === "chervil" || flavorDef.id === "sorrel" || flavorDef.id === "verbena" || flavorDef.id === "savory" || flavorDef.id === "celery_seed" || flavorDef.id === "galangal" || flavorDef.id === "kaffir_lime" || flavorDef.id === "pandan" || flavorDef.id === "juniper" || flavorDef.id === "sumac" || flavorDef.id === "nigella" || flavorDef.id === "mustard_seed" || flavorDef.id === "wasabi" || flavorDef.id === "dandelion" || flavorDef.id === "nettle" || flavorDef.id === "borage" || flavorDef.id === "hops" || flavorDef.id === "heather" || flavorDef.id === "arnica" || flavorDef.id === "echinacea" || flavorDef.id === "feverfew" || flavorDef.id === "lemon_verbena" || flavorDef.id === "mullein" || flavorDef.id === "plantain_leaf" || flavorDef.id === "bee_balm" || flavorDef.id === "marshmallow" || flavorDef.id === "goldenrod" || flavorDef.id === "red_clover" || flavorDef.id === "white_clover" || flavorDef.id === "catnip" || flavorDef.id === "tansy" || flavorDef.id === "agrimony" || flavorDef.id === "rue" || flavorDef.id === "costmary" || flavorDef.id === "elecampane" || flavorDef.id === "meadow_clary" || flavorDef.id === "soapwort" || flavorDef.id === "milfoil" || flavorDef.id === "lady_mantle" || flavorDef.id === "speedwell" || flavorDef.id === "stitchwort" || flavorDef.id === "campion" || flavorDef.id === "silverweed" || flavorDef.id === "loosestrife" || flavorDef.id === "willowherb" || flavorDef.id === "bedstraw" || flavorDef.id === "cleavers" || flavorDef.id === "bugle" || flavorDef.id === "primrose" || flavorDef.id === "cowslip" || flavorDef.id === "oxeye" || flavorDef.id === "knapweed" || flavorDef.id === "scabious" || flavorDef.id === "nettle_seed" || flavorDef.id === "rowan" || flavorDef.id === "crabapple" || flavorDef.id === "serviceberry" || flavorDef.id === "elderflower_fresh" || flavorDef.id === "meadowsweet_fresh" || flavorDef.id === "wood_sorrel" || flavorDef.id === "wild_garlic" || flavorDef.id === "ramsons" || flavorDef.id === "jack_by_hedge" || flavorDef.id === "hedge_mustard" || flavorDef.id === "watercress" || flavorDef.id === "brooklime" || flavorDef.id === "cloudberry" || flavorDef.id === "lingonberry" || flavorDef.id === "bilberry" || flavorDef.id === "gooseberry" || flavorDef.id === "currant_red" || flavorDef.id === "currant_black" || flavorDef.id === "whitecurrant" || flavorDef.id === "sea_buckthorn" || flavorDef.id === "damson" || flavorDef.id === "greengage" || flavorDef.id === "mirabelle" || flavorDef.id === "saskatoon" || flavorDef.id === "chokeberry" || flavorDef.id === "yarrow_white" || flavorDef.id === "achillea_pink" || flavorDef.id === "cornflower" || flavorDef.id === "poppy_seed" || flavorDef.id === "flax_flower" || flavorDef.id === "chia_seed" || flavorDef.id === "sunflower_seed" || flavorDef.id === "fennel_pollen" || flavorDef.id === "fennel_frond" || flavorDef.id === "dill_pollen" || flavorDef.id === "celery_leaf" || flavorDef.id === "rooibos" || flavorDef.id === "honeybush" || flavorDef.id === "yerba_mate" || flavorDef.id === "guayusa" || flavorDef.id === "gardenia" || flavorDef.id === "magnolia" || flavorDef.id === "frangipani" || flavorDef.id === "plumeria" || flavorDef.id === "stephanotis" || flavorDef.id === "garden_phlox" || flavorDef.id === "osmanthus_fresh" || flavorDef.id === "galangal_fresh" || flavorDef.id === "ginger_flower" || flavorDef.id === "turmeric_fresh" || flavorDef.id === "cubeb" || flavorDef.id === "makrut_leaf" || flavorDef.id === "curry_leaf" || flavorDef.id === "holy_basil" || flavorDef.id === "thai_basil" || flavorDef.id === "lemon_basil" || flavorDef.id === "rambutan_fresh" || flavorDef.id === "lychee_fresh" || flavorDef.id === "mangosteen" || flavorDef.id === "durian_flower" || flavorDef.id === "tamarind" || flavorDef.id === "calamansi" || flavorDef.id === "fig_fresh" || flavorDef.id === "pomegranate_seed" || flavorDef.id === "cactus_pear" || flavorDef.id === "prickly_pear" || flavorDef.id === "sapodilla" || flavorDef.id === "soursop" || flavorDef.id === "cherimoya" || flavorDef.id === "feijoa" || flavorDef.id === "loquat_fresh" || flavorDef.id === "jujube_fresh" || flavorDef.id === "mulberry_white" || flavorDef.id === "mulberry_black" || flavorDef.id === "elderberry_fresh" || flavorDef.id === "bergamot_fresh" || flavorDef.id === "sudachi" || flavorDef.id === "kabosu" || flavorDef.id === "amanatsu" || flavorDef.id === "shiso_green" || flavorDef.id === "shiso_red" || flavorDef.id === "mitsuba" || flavorDef.id === "myoga" || flavorDef.id === "wasabi_leaf" || flavorDef.id === "sansho" || flavorDef.id === "kinome" || flavorDef.id === "gentian" || flavorDef.id === "arnica_montana" || flavorDef.id === "alpine_strawberry" || flavorDef.id === "bilberry_leaf" || flavorDef.id === "spruce_tip" || flavorDef.id === "olive_leaf" || flavorDef.id === "caper" || flavorDef.id === "zaatar" || flavorDef.id === "sumac_berry" || flavorDef.id === "orange_blossom" || flavorDef.id === "lavender_honey" || flavorDef.id === "thyme_honey" || flavorDef.id === "acacia_honey" || flavorDef.id === "manuka" || flavorDef.id === "bee_pollen" || flavorDef.id === "comb_honey" || flavorDef.id === "linden_honey" || flavorDef.id === "heather_honey_wild" || flavorDef.id === "wildflower_honey" || flavorDef.id === "clover_honey" || flavorDef.id === "eucalyptus_honey" || flavorDef.id === "mesquite" || flavorDef.id === "lucuma" || flavorDef.id === "camu_camu" || flavorDef.id === "acai" || flavorDef.id === "maqui" || flavorDef.id === "goji_fresh" || flavorDef.id === "amla" || flavorDef.id === "baobab" || flavorDef.id === "morinda" || flavorDef.id === "noni" || flavorDef.id === "cupuacu" || flavorDef.id === "matcha_ceremonial" || flavorDef.id === "sencha" || flavorDef.id === "gyokuro" || flavorDef.id === "bancha" || flavorDef.id === "kukicha" || flavorDef.id === "mugicha" || flavorDef.id === "barley_grass" || flavorDef.id === "wheatgrass" || flavorDef.id === "spirulina" || flavorDef.id === "chlorella" || flavorDef.id === "kelp" || flavorDef.id === "nori" || flavorDef.id === "hibiscus_fresh" || flavorDef.id === "chrysanthemum_fresh" || flavorDef.id === "peony" || flavorDef.id === "lotus_leaf_fresh" || flavorDef.id === "osmanthus_sugar" || flavorDef.id === "orchid_petal" || flavorDef.id === "bamboo_leaf_fresh" || flavorDef.id === "bamboo_shoot_fresh" || flavorDef.id === "safflower" || flavorDef.id === "calendula_fresh" || flavorDef.id === "pot_marigold" || flavorDef.id === "coreopsis" || flavorDef.id === "cosmos" || flavorDef.id === "zinnia" || flavorDef.id === "dahlia" || flavorDef.id === "gladiolus" || flavorDef.id === "iris" || flavorDef.id === "tulip" || flavorDef.id === "ranunculus" || flavorDef.id === "sweet_pea" || flavorDef.id === "nasturtium" || flavorDef.id === "morning_glory" || flavorDef.id === "clematis" || flavorDef.id === "wisteria_fresh" || flavorDef.id === "jasmine_sambac" || flavorDef.id === "gardenia_tea" || flavorDef.id === "boysenberry" || flavorDef.id === "loganberry" || flavorDef.id === "tayberry" || flavorDef.id === "marionberry" || flavorDef.id === "wineberry" || flavorDef.id === "salmonberry" || flavorDef.id === "thimbleberry" || flavorDef.id === "cloudberry_leaf" || flavorDef.id === "lovage_fresh" || flavorDef.id === "sweet_cicely" || flavorDef.id === "ramsons_flower" || flavorDef.id === "sea_kale" || flavorDef.id === "scurvygrass" || flavorDef.id === "marsh_samphire" || flavorDef.id === "agave_nectar" || flavorDef.id === "prickly_pear_pad" || flavorDef.id === "jojoba" || flavorDef.id === "mesquite_pod" || flavorDef.id === "creosote" || flavorDef.id === "desert_sage" || flavorDef.id === "yucca_flower" || flavorDef.id === "yerba_santa" || flavorDef.id === "cedron" || flavorDef.id === "muña" || flavorDef.id === "coca_leaf_tea" || flavorDef.id === "guarana" || flavorDef.id === "stevia_leaf" || flavorDef.id === "rooibos_green" || flavorDef.id === "honeybush_fresh" || flavorDef.id === "buchu" || flavorDef.id === "baobab_leaf" || flavorDef.id === "marula" || flavorDef.id === "kinkeliba" || flavorDef.id === "hibiscus_sab" || flavorDef.id === "pandan_fresh" || flavorDef.id === "lemongrass_fresh" || flavorDef.id === "galangal_leaf" || flavorDef.id === "torch_ginger" || flavorDef.id === "butterfly_pea" || flavorDef.id === "chrysanthemum_ind" || flavorDef.id === "tamarind_leaf" || flavorDef.id === "coconut_flower" || flavorDef.id === "bergamot_leaf" || flavorDef.id === "neroli" || flavorDef.id === "petitgrain" || flavorDef.id === "immortelle" || flavorDef.id === "helichrysum" || flavorDef.id === "cistus" || flavorDef.id === "spruce_beer" || flavorDef.id === "fireweed" || flavorDef.id === "fireweed_honey" || flavorDef.id === "crowberry" || flavorDef.id === "bearberry" || flavorDef.id === "labrador_violet" || flavorDef.id === "matcha_salt" || flavorDef.id === "sansho_leaf" || flavorDef.id === "shiso_flower" || flavorDef.id === "sakura_leaf" || flavorDef.id === "lavender_sugar" || flavorDef.id === "rose_water" || flavorDef.id === "orange_flower_water" || flavorDef.id === "almond_blossom" || flavorDef.id === "chestnut_flower" || flavorDef.id === "maesil" || flavorDef.id === "persimmon_leaf" || flavorDef.id === "pine_flower" || flavorDef.id === "tulsi" || flavorDef.id === "neem_flower" || flavorDef.id === "curry_blossom" || flavorDef.id === "ajwain_leaf" || flavorDef.id === "fenugreek_leaf" || flavorDef.id === "moringa" || flavorDef.id === "gotu_kola" || flavorDef.id === "brahmi" || flavorDef.id === "hibiscus_rosa" || flavorDef.id === "allspice_berry" || flavorDef.id === "annatto" || flavorDef.id === "epazote" || flavorDef.id === "papalo" || flavorDef.id === "hoja_santa" || flavorDef.id === "mexican_oregano" || flavorDef.id === "chile_flower" || flavorDef.id === "noni_leaf" || flavorDef.id === "ti_leaf" || flavorDef.id === "frangipani_tea" || flavorDef.id === "soursop_leaf" || flavorDef.id === "guava_leaf" || flavorDef.id === "passion_leaf" || flavorDef.id === "vanilla_orchid" || flavorDef.id === "longjing" || flavorDef.id === "biluochun" || flavorDef.id === "puer_raw" || flavorDef.id === "white_peony_tea" || flavorDef.id === "valerian_flower" || flavorDef.id === "hops_flower" || flavorDef.id === "meadowsweet_flower" || flavorDef.id === "yarrow_flower" || flavorDef.id === "nettle_seed_tea" || flavorDef.id === "silver_birch" || flavorDef.id === "copper_beech" || flavorDef.id === "hornbeam" || flavorDef.id === "field_maple" || flavorDef.id === "wild_service" || flavorDef.id === "guelder_rose" || flavorDef.id === "wayfaring" || flavorDef.id === "dogwood" || flavorDef.id === "spindle" || flavorDef.id === "buckthorn" || flavorDef.id === "privet" || flavorDef.id === "boxwood" || flavorDef.id === "bluebell_fresh" || flavorDef.id === "primula_veris" || flavorDef.id === "oxlip" || flavorDef.id === "cowslip_fresh" || flavorDef.id === "wood_anemone" || flavorDef.id === "wood_sorrel_pink" || flavorDef.id === "greater_stitchwort" || flavorDef.id === "red_campion" || flavorDef.id === "white_campion" || flavorDef.id === "ragged_robin" || flavorDef.id === "cuckooflower" || flavorDef.id === "lady_smock" || flavorDef.id === "garlic_mustard_fl" || flavorDef.id === "hedge_garlic_seed" || flavorDef.id === "jack_hedge_leaf" || flavorDef.id === "wild_mustard" || flavorDef.id === "meadow_buttercup" || flavorDef.id === "creeping_buttercup" || flavorDef.id === "lesser_celandine" || flavorDef.id === "marsh_marigold" || flavorDef.id === "globe_flower" || flavorDef.id === "columbine" || flavorDef.id === "monkshood" || flavorDef.id === "larkspur" || flavorDef.id === "delphinium" || flavorDef.id === "pasque_flower" || flavorDef.id === "anemone_coronaria" || flavorDef.id === "hepatic" || flavorDef.id === "clematis_vitalba" || flavorDef.id === "speedwell_germander" || flavorDef.id === "germander" || flavorDef.id === "betony_fresh" || flavorDef.id === "selfheal_fresh" || flavorDef.id === "woundwort" || flavorDef.id === "hedge_woundwort" || flavorDef.id === "marsh_woundwort" || flavorDef.id === "motherwort_fresh" || flavorDef.id === "scutellaria" || flavorDef.id === "bugle_fresh" || flavorDef.id === "alehoof" || flavorDef.id === "clary_sage" || flavorDef.id === "pineapple_sage" || flavorDef.id === "fruit_sage" || flavorDef.id === "white_sage" || flavorDef.id === "russian_sage" || flavorDef.id === "meadow_clary_fresh" || flavorDef.id === "wood_sage" || flavorDef.id === "jerusalem_sage" || flavorDef.id === "catmint" || flavorDef.id === "catnip_fresh" || flavorDef.id === "hyssop_fresh" || flavorDef.id === "anise_hyssop" || flavorDef.id === "korean_mint" || flavorDef.id === "agastache" || flavorDef.id === "lavender_spike" || flavorDef.id === "lavender_sto" || flavorDef.id === "thyme_lemon" || flavorDef.id === "thyme_orange" || flavorDef.id === "thyme_caraway" || flavorDef.id === "thyme_woolly" || flavorDef.id === "creeping_thyme" || flavorDef.id === "oregano_greek" || flavorDef.id === "oregano_italian" || flavorDef.id === "marjoram_sweet" || flavorDef.id === "savory_summer" || flavorDef.id === "basil_genovese" || flavorDef.id === "basil_cinnamon" || flavorDef.id === "basil_purple" || flavorDef.id === "basil_lettuce" || flavorDef.id === "mint_peppermint" || flavorDef.id === "mint_spearmint" || flavorDef.id === "mint_chocolate" || flavorDef.id === "mint_apple" || flavorDef.id === "mint_ginger" || flavorDef.id === "mint_orange" || flavorDef.id === "mint_lavender" || flavorDef.id === "mint_bergamot" || flavorDef.id === "mint_corsican" || flavorDef.id === "mint_water" || flavorDef.id === "melissa_fresh" || flavorDef.id === "lemon_balm_var" || flavorDef.id === "bee_balm_pink" || flavorDef.id === "bee_balm_purple" || flavorDef.id === "oregano_hop" || flavorDef.id === "dittany" || flavorDef.id === "dictamnus" || flavorDef.id === "burning_bush" || flavorDef.id === "chamomile_roman" || flavorDef.id === "chamomile_german" || flavorDef.id === "feverfew_fresh" || flavorDef.id === "tansy_fresh" || flavorDef.id === "yarrow_pink" || flavorDef.id === "yarrow_gold" || flavorDef.id === "arnica_fresh" || flavorDef.id === "calendula_offic" || flavorDef.id === "pot_marigold_dbl" || flavorDef.id === "tagetes" || flavorDef.id === "marigold_french" || flavorDef.id === "signet_marigold" || flavorDef.id === "costmary_fresh" || flavorDef.id === "elecampane_fresh" || flavorDef.id === "inula" || flavorDef.id === "eupatorium" || flavorDef.id === "echinacea_purp" || flavorDef.id === "echinacea_ang" || flavorDef.id === "echinacea_pall" || flavorDef.id === "rudbeckia" || flavorDef.id === "black_eyed_susan" || flavorDef.id === "coneflower_yellow" || flavorDef.id === "helenium" || flavorDef.id === "helenium_autumn" || flavorDef.id === "coreopsis_lance" || flavorDef.id === "coreopsis_tick" || flavorDef.id === "gaillardia" || flavorDef.id === "gaillardia_fan" || flavorDef.id === "ratibida" || flavorDef.id === "silphium" || flavorDef.id === "cup_plant" || flavorDef.id === "compass_plant" || flavorDef.id === "aster_novae" || flavorDef.id === "aster_novi" || flavorDef.id === "michaelmas" || flavorDef.id === "goldenrod_fresh" || flavorDef.id === "solidago" || flavorDef.id === "boltonia" || flavorDef.id === "erigeron" || flavorDef.id === "fleabane" || flavorDef.id === "daisy_oxeye" || flavorDef.id === "daisy_english" || flavorDef.id === "daisy_shasta" || flavorDef.id === "chrysanthemum_ind_fresh" || flavorDef.id === "chrysanthemum_mor" || flavorDef.id === "chrysanthemum_yej" || flavorDef.id === "tanacetum" || flavorDef.id === "pyrethrum" || baseDef.id === "soda" || baseDef.id === "berry_soda")) {
      score += 0.5;
      notes.push("夏日清爽");
    }
    if (season === "autumn" && (flavorDef.id === "honey" || flavorDef.id === "peach" || flavorDef.id === "tea_leaf" || flavorDef.id === "fennel" || flavorDef.id === "cardamom" || flavorDef.id === "ginger" || flavorDef.id === "calendula" || flavorDef.id === "chrysanthemum" || flavorDef.id === "hibiscus" || flavorDef.id === "plum" || flavorDef.id === "grape" || flavorDef.id === "mulberry" || flavorDef.id === "persimmon" || flavorDef.id === "fig" || flavorDef.id === "longan" || flavorDef.id === "hawthorn" || flavorDef.id === "pear" || flavorDef.id === "apricot" || flavorDef.id === "maple_syrup" || flavorDef.id === "sesame" || flavorDef.id === "chestnut" || flavorDef.id === "cinnamon" || flavorDef.id === "clove" || flavorDef.id === "pistachio")) {
      score += 0.5;
      notes.push("秋日温甜");
    }
    if (season === "winter" && (baseDef.id === "tea" || baseDef.id === "honey_water" || flavorDef.id === "tea_leaf" || flavorDef.id === "yuzu" || flavorDef.id === "ginger" || flavorDef.id === "honey" || flavorDef.id === "pine_needle" || flavorDef.id === "chrysanthemum" || flavorDef.id === "kumquat" || flavorDef.id === "jujube" || flavorDef.id === "cocoa" || flavorDef.id === "vanilla" || flavorDef.id === "almond" || flavorDef.id === "hazelnut" || flavorDef.id === "maple_syrup" || flavorDef.id === "sesame" || flavorDef.id === "walnut" || flavorDef.id === "saffron" || flavorDef.id === "pistachio" || flavorDef.id === "chestnut" || flavorDef.id === "cinnamon" || flavorDef.id === "clove" || flavorDef.id === "star_anise" || flavorDef.id === "nutmeg" || flavorDef.id === "goji" || flavorDef.id === "bay_leaf" || flavorDef.id === "tarragon" || flavorDef.id === "date_fruit" || flavorDef.id === "hyssop" || flavorDef.id === "lovage" || flavorDef.id === "anise_seed" || flavorDef.id === "turmeric" || flavorDef.id === "allspice" || flavorDef.id === "mace" || flavorDef.id === "caraway" || flavorDef.id === "cumin" || flavorDef.id === "fenugreek" || flavorDef.id === "ajwain" || flavorDef.id === "myrtle" || flavorDef.id === "chicory" || flavorDef.id === "nettle" || flavorDef.id === "yarrow" || flavorDef.id === "woodruff" || flavorDef.id === "valerian" || flavorDef.id === "meadowsweet" || flavorDef.id === "angelica" || flavorDef.id === "comfrey" || flavorDef.id === "selfheal" || flavorDef.id === "skullcap" || flavorDef.id === "linden" || flavorDef.id === "horehound" || flavorDef.id === "motherwort" || flavorDef.id === "betony" || flavorDef.id === "solomon_seal" || flavorDef.id === "wormwood" || flavorDef.id === "valerian_root" || flavorDef.id === "avens" || flavorDef.id === "tormentil" || flavorDef.id === "figwort" || flavorDef.id === "ground_ivy" || flavorDef.id === "self_heal_spike" || flavorDef.id === "teasel" || flavorDef.id === "burdock" || flavorDef.id === "hawthorn_berry" || flavorDef.id === "rosehip" || flavorDef.id === "sloe" || flavorDef.id === "wintercress" || flavorDef.id === "medlar" || flavorDef.id === "quince" || flavorDef.id === "aronia" || flavorDef.id === "flax_seed" || flavorDef.id === "hemp_seed" || flavorDef.id === "pumpkin_seed" || flavorDef.id === "sesame_black" || flavorDef.id === "sesame_white" || flavorDef.id === "lapacho" || flavorDef.id === "sassafras" || flavorDef.id === "birch_bark" || flavorDef.id === "pine_resin" || flavorDef.id === "tuberose" || flavorDef.id === "cardamom_green" || flavorDef.id === "cardamom_black" || flavorDef.id === "long_pepper" || flavorDef.id === "grains_of_paradise" || flavorDef.id === "cinnamon_leaf" || flavorDef.id === "clove_bud" || flavorDef.id === "allspice_leaf" || flavorDef.id === "reindeer_moss" || flavorDef.id === "iceland_moss" || flavorDef.id === "oak_moss" || flavorDef.id === "usnea" || flavorDef.id === "chaga" || flavorDef.id === "reishi" || flavorDef.id === "lion_mane" || flavorDef.id === "maitake" || flavorDef.id === "jackfruit_seed" || flavorDef.id === "rowan_jelly" || flavorDef.id === "quince_paste" || flavorDef.id === "yuzu_fresh" || flavorDef.id === "ponkan" || flavorDef.id === "dekopon" || flavorDef.id === "hassaku" || flavorDef.id === "yuzu_kosho" || flavorDef.id === "edelweiss" || flavorDef.id === "juniper_berry" || flavorDef.id === "fir_needle" || flavorDef.id === "myrtle_berry" || flavorDef.id === "mastic" || flavorDef.id === "saffron_crocus" || flavorDef.id === "buckwheat_honey" || flavorDef.id === "chestnut_honey" || flavorDef.id === "propolis" || flavorDef.id === "royal_jelly" || flavorDef.id === "mead_herb" || flavorDef.id === "cacao_nibs" || flavorDef.id === "cacao_husk" || flavorDef.id === "carob" || flavorDef.id === "maca" || flavorDef.id === "schisandra" || flavorDef.id === "hojicha" || flavorDef.id === "genmaicha" || flavorDef.id === "sobacha" || flavorDef.id === "job_tears" || flavorDef.id === "rose_hip_tea" || flavorDef.id === "camellia_fresh" || flavorDef.id === "lotus_seed_fresh" || flavorDef.id === "plum_blossom" || flavorDef.id === "wintersweet" || flavorDef.id === "ginkgo_leaf_fresh" || flavorDef.id === "ginkgo_nut_fresh" || flavorDef.id === "osmanthus_wine" || flavorDef.id === "crocus" || flavorDef.id === "snowdrop" || flavorDef.id === "crocus_yellow" || flavorDef.id === "hyacinth" || flavorDef.id === "daffodil" || flavorDef.id === "moonflower" || flavorDef.id === "magnolia_bark" || flavorDef.id === "eucommia" || flavorDef.id === "astragalus" || flavorDef.id === "codonopsis" || flavorDef.id === "rehmannia" || flavorDef.id === "polygonatum" || flavorDef.id === "ophiopogon" || flavorDef.id === "angelica_arch" || flavorDef.id === "wood_avense" || flavorDef.id === "ephedra" || flavorDef.id === "boldo" || flavorDef.id === "cupuacu_butter" || flavorDef.id === "sutherlandia" || flavorDef.id === "citron" || flavorDef.id === "bergamot_peel" || flavorDef.id === "labrador_tea" || flavorDef.id === "arctic_willow" || flavorDef.id === "kinako" || flavorDef.id === "kuromitsu" || flavorDef.id === "yuzu_peel" || flavorDef.id === "ume_blossom" || flavorDef.id === "vanilla_bean" || flavorDef.id === "tonka_bean" || flavorDef.id === "hazelnut_flower" || flavorDef.id === "omija" || flavorDef.id === "yuja" || flavorDef.id === "ssanghwa" || flavorDef.id === "jujube_tea" || flavorDef.id === "ginger_tea_kr" || flavorDef.id === "kava" || flavorDef.id === "tieguanyin" || flavorDef.id === "dahongpao" || flavorDef.id === "puer_ripe" || flavorDef.id === "shoumei" || flavorDef.id === "burdock_root" || flavorDef.id === "dandelion_root" || flavorDef.id === "chicory_root" || flavorDef.id === "holly_leaf" || flavorDef.id === "ivy_berry" || flavorDef.id === "mistletoe" || flavorDef.id === "yew_berry" || flavorDef.id === "aconite" || flavorDef.id === "helleborus" || flavorDef.id === "christmas_rose" || flavorDef.id === "black_horehound" || flavorDef.id === "white_horehound" || flavorDef.id === "skullcap_fresh" || flavorDef.id === "baikal_skullcap" || flavorDef.id === "ground_ivy_fresh" || flavorDef.id === "savory_winter")) {
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
      pyrethrum: true
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
